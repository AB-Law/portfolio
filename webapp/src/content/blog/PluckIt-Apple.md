---
title: "How I Split Local AI Across iPhone, Mac, and Cloud in PluckIt"
date: 2026-03-15
description: "A practical architecture for shipping local AI where it helps: iOS preprocessing, macOS local try-on, and a shared backend fallback path."
tags:
  - swift
  - ios
  - macos
  - model-deployment
  - machine-learning
  - architecture
  - azure
readTime: 16m read
image: /images/VTON-Example.png
---

![Local VTON sample output](/images/VTON-Example.png)

---

## 1) What PluckIt was actually trying to solve

I created Pluck-It as a clothing wardrobe application with a little AI stylist. I always had a bunch of clothes, but I never could sort them out and I wanted to build an app that would help me with this. Most of the apps that I had tried had some arbitary restriction which ended up annoying me. I wanted to create something which would solve those roadblocks I faced and thus began my work on PluckIt.
Some of the main problems I was trying to solve was:
1. users upload messy clothing photos,
2. users want clean wardrobe items with usable metadata,
3. users want try-on to feel interactive, not like submitting a batch job and waiting.
4. style guides which took a look at both your taste, and what you had in your wardrobe.

Those problems are related, but they're not the same workload. I made the mistake early on of treating "AI in PluckIt" as one big inference problem to solve and only later did I realise that the framing was wrong. 

### The product constraints

A few hard constraints shaped the architecture:

- wardrobe capture should feel private and low-friction,
- segmentation quality has to hold up for downstream metadata and UX,
- upload behavior has to degrade gracefully when a local model fails,
- and the same backend needs to serve web, and later iOS, and macOS without growing into separate APIs.

That last point sounds boring, but it was the one that actually constrained everything else. The moment you have multiple clients, "just add a special endpoint for this platform" becomes a thing which starts to haunt you. So the real requirement became: **one shared upload contract, with different execution paths behind it depending on what the platform can actually do.**

---

## 2) The three PluckIt execution surfaces

PluckIt ended up with three real AI surfaces, each doing a different job.

### Web / backend: quality-first remote baseline

The web path is intentionally simple. The client uploads to `/api/wardrobe/upload`, the backend stores metadata and enqueues an `ImageProcessingMessage`, a queue worker decides whether segmentation is needed, and if it is, the Python processor calls a container hosted on Modal with BiRefNet through `_segment_with_modal`.

No on-device models to ship. No model distribution headache. The backend runs stronger remote segmentation for whatever comes in. The client stays thin.

### iOS: local segmentation before upload

The most valuable thing I could put on iPhone wasn't full try-on. It was better uploads. Everyone uses their phones for taking pictures. A web interface was nice, but a native app where you could add the photos of your clothes instantly? Killer feature (or at least that's what I think).

I had shown an earlier version of the app to a friend, and she suggested adding a way to segment clothes off a user + a virtual try-on.

The funny thing is, this was actually what my final year project was. And to be honest, back then it was horribly implemented. I really wanted to take this on right now with the new knowledge and tools that I had with me.

`ClothingSegmentationService`, `HumanParsingSegmenter`, and Vision requests like `VNDetectHumanRectanglesRequest` work together to break a photo into cleaner clothing items before anything hits the backend. The phone isn't trying to be a workstation. It's acting as an intelligent capture device doing the cleanup work at the point where it's cheapest and most performant. Also saves me from having to use credits on Modal.com, and since I think phones are going to be the #1 used client, it was very important for me to get it up and running. 

### macOS: local try-on plus local segmentation

On Mac I could justify a heavier local stack. `MacTryOnSidecar` manages the Python environment and server lifecycle. `server.py` hosts local inference. `MacTryOnService` posts person and garment images to a localhost Flask endpoint. `MacClothingSegmentationService` handles local foreground masking for upload prep.

This is where CatVTON lives. The Mac is the only PluckIt surface where full on-device VTON made sense (and the only device where I could implement it)

---

## 2.5) What iOS and macOS actually share

The thing that I loved while working on the Apple Native software was that the two separate products sit on the same backend contract. One shared API layer, one upload contract, one draft/review model but with different local preprocessing and local inference capability depending on the device.

As the native work expanded, having one backend truth stopped the architecture from fragmenting. The clients get smarter; the server stays the same.

---

## 3) Web vs iOS vs macOS: the real differences

The table below captures the strategy at a glance:

| Surface | Main job | Local segmentation | Local try-on | Upload contract | Runtime posture |
| --- | --- | --- | --- | --- | --- |
| Web / Angular | lightweight client, centralized quality path | no | no | standard `/api/wardrobe/upload` | cloud-first |
| iOS | capture, clean up, split items, then upload | yes  `ClothingSegmentationService` + `HumanParsingSegmenter` | no | same upload API, often with `skip_segmentation=true` | local-first preprocessing |
| macOS | desktop wardrobe flow plus full try-on | yes  `MacClothingSegmentationService` | yes  `MacTryOnSidecar` + local Flask server | same upload API, plus localhost try-on API | hybrid local-heavy |

The implementation differences behind that table are more interesting than the summary.

### 3.1 Web / Angular is contract-driven and backend-dependent

The Angular app (`PluckIt.Client`) keeps the client deliberately minimal. `WardrobeService.uploadForDraft(file)` posts `FormData` with just the `image` field to `/api/wardrobe/upload` and returns a `202 Accepted` draft. `uploadForDraftWishlisted(file)` adds `is_wishlisted=true` but no `skip_segmentation` flag  it relies on remote segmentation by default.

The upload UI handles drag-and-drop and multi-file selection, enqueues items locally, resizes them with `resizeImageFile`, and runs up to 4 concurrent in-flight uploads. Queue states move through `queued` → `uploading` → `processing` → `ready`/`failed`. The component polls `/api/wardrobe/drafts` every 5 seconds while anything is still processing and reconciles the result. When offline, `OfflineQueueService` stores uploads in IndexedDB/localStorage and replays them when connectivity returns.

The pattern is: raw upload first, trust the backend to produce quality.

### 3.2 iOS is an opinionated capture client

iOS doesn't just upload what the user picked. It tries to improve the asset first.

Both `WardrobeUploadView` and `WishlistView` follow the same pattern: collect images from `PhotosPicker`, run local segmentation before making the final upload decision, let the user choose among segmented results, then upload either the pre-segmented outputs or a raw fallback. The client is part of the ML pipeline  not just a form that posts files.

### 3.3 macOS is closer to a workstation than a thin client

The Mac app has two distinct local behaviors that don't exist anywhere else in the product.

`MacFeatureViews` pulls files from Finder or drag-and-drop, runs `MacClothingSegmentationService`, lets the user approve segmented items, and uploads them through the same `WardrobeService`. Separately, `MacTryOnView` runs a full desktop try-on flow: select a image of them from disk, pick a garment from the wardrobe, launch or attach to the local sidecar, send a multipart request to the localhost Flask service, receive a generated PNG back into the app.

Three very different runtime profiles:
- browser depends on backend compute,
- iOS improves inputs *before* backend compute,
- macOS can skip backend try-on compute entirely.

---

## 4) Why iOS got segmentation, but not full VTON

This was one of the calls I thought hardest about. The tempting move is: if local inference is good, put it everywhere.

That would have been wrong for PluckIt.

### 4.1 iPhone had the most leverage on preprocessing

Most of the pain in the mobile wardrobe flow was happening *before* try-on: cluttered input photos, bad cutouts, multiple clothing items jammed into one frame, unnecessary segmentation calls eating latency and GPU budget. Moving segmentation to iOS solved those directly.

`ClothingSegmentationService.segmentIntoItems(imageData:)` does three things in sequence: decodes and orients the image, uses `VNDetectHumanRectanglesRequest` as a fast gate, and if a person is detected, calls `HumanParsingSegmenter.segmentIntoItems(cgImage:)`. If parsing doesn't produce usable items, the pipeline falls back  iOS 17+ tries `VNGenerateForegroundInstanceMaskRequest`, and if that also fails, it just uploads the original. No user-blocking, no drama.

### 4.2 Full VTON is a fundamentally different workload

Human parsing is a bounded preprocessing task, fixed input size, a single semantic model, short execution, immediate product value even when the rest of the pipeline is still remote. CatVTON is not that. It brings large model footprints, diffusion scheduling cost, heavy attention memory pressure, much longer runtimes, and thermal/battery implications that would actively hurt a mobile product.

On macOS I was willing to pay those costs because the desktop flow could absorb them. On iPhone, this was fundamentally impossible to do. (However, I am looking into seeing if an AR version of an app with a image layered over a person is possible or not)

### 4.3 The user job on mobile is different

On iOS the job is: take or pick clothing photos, segment them cleanly, add them to wardrobe quickly, and don't wait on remote cleanup when local preprocessing already did it. On macOS the job can include interactive try-on experimentation, accepting a one-time environment setup, and sitting through heavier inference for a richer result. Those are genuinely different workflows.

**Segmentation made mobile better immediately. Full VTON would have made it heavier without enough payoff.**

---

## 5) The iOS pipeline in detail

### 5.1 Fast routing with Vision first

The first branch happens in `ClothingSegmentationService`. If `VNDetectHumanRectanglesRequest` finds a person with reasonable confidence, the image goes to `HumanParsingSegmenter`. If not, the app assumes it's a flat-lay or isolated item and tries foreground masking instead. This small gate avoids running a heavier model path on inputs it was never designed for.

### 5.2 `HumanParsingSegmenter` and the Core ML path

`HumanParsingSegmenter` loads `SegFormerClothes.mlmodelc` from the bundle and caches it. There's real preprocessing work happening here, not just a model call:

- renders the image into a fixed `512x512` input,
- normalizes pixel values using ImageNet-style mean/std,
- handles byte ordering for iOS image memory layout,
- runs Core ML with `.cpuAndGPU`,
- reads `label_map` output back into Swift.

From that semantic label map, PluckIt keeps only the clothing class indices:

```text
[4, 5, 6, 7, 8, 9, 10, 16, 17]
```

That's what turns a person photo into individual wardrobe regions instead of a generic foreground blob.

### 5.3 Turning semantic output into uploadable items

The most product-relevant part isn't the mask itself  it's the itemization. `HumanParsingSegmenter.segmentIntoItems(cgImage:)` scales the label map back to the original image size, groups pixels by clothing label, skips noisy regions under 500 pixels, computes bounding boxes, crops each region, composites it into a transparent image, and emits `SegmentedClothingItem`. One input photo can become multiple wardrobe-ready uploads.

This is also why local segmentation was worth building before any local VTON work existed on iPhone. It improved the shape of the data entering the whole product  better inputs, better everything downstream.

### 5.4 The fallback path is the feature, not a backup

Local ML is only production-worthy if failure is boring. In PluckIt, failure cases include no person detected, model missing or unavailable, empty or noisy label map, and unsupported OS paths for a Vision feature. None of those stop the upload, they just change the route:

- pre-segment if possible,
- foreground-mask if possible,
- otherwise upload raw.

---

## 6) The macOS path: why full local VTON belonged there

### 6.1 The sidecar pattern

The VTON ecosystem is still heavily Python-native. Rather than trying to force CatVTON into a pure Swift runtime  which would have been a painful port for unclear benefit  I kept a clean separation: Swift owns UI and app lifecycle, `MacTryOnSidecar` owns Python environment setup, a local Flask process hosts inference, and `MacTryOnService` talks to it over localhost.

That split kept the UI responsive while heavy setup and inference happened outside the app process. It also meant I could iterate on the inference stack (schedulers, model versions, preprocessing) without touching Swift code.

### 6.2 What first-run setup actually does

`MacTryOnSidecar` does real environment management on first launch:

- creates a virtualenv in Application Support,
- installs `torch`, `torchvision`, `diffusers`, `transformers`, `accelerate`, `flask`, `Pillow`, `numpy`, and OpenCV,
- clones the CatVTON repository,
- downloads CatVTON weights,
- downloads the Stable Diffusion inpainting base model,
- pre-warms the SegFormer clothes segmentation model cache.

In the UI this is a one-time ~10 GB download. On iPhone that would be a non-starter. On Mac it's a reasonable one-time cost for a genuinely local try-on feature.

### 6.3 Why Mac hardware changed the decision

Desktop made sense for CatVTON: more unified memory headroom, better sustained GPU utilization, fewer thermal constraints, a product context where longer waits are acceptable, and users who expect heavier local tooling to exist on a desktop app.

Even so, it wasn't smooth. The original CatVTON path hit attention memory blowups because the model concatenates person and garment regions before the UNet. At around `1024x768`, that creates an attention footprint that quickly becomes absurd on consumer hardware. The fix was chunked attention  processing smaller query slices rather than materializing the full attention matrix at once. That moved the Mac path from "crashes under realistic resolution" to "slow, but usable and predictable." Not a glamorous fix, but an important one.

### 6.4 The boring fixes that actually shipped it

A lot of the production work had nothing to do with the model paper:

- transparent PNG garments turned black if naively converted to RGB,
- forced resizing distorted both garments and bodies,
- default scheduler settings were too slow for real use.

The fixes: white-background compositing for transparent garment assets, fit-and-pad preprocessing to preserve aspect ratio, scheduler tuning from DDIM to `DPM++ 2M Karras`, and step reduction from `50` to `20`. That dropped try-on time from roughly 252s to roughly 98s on the measured machine. Still not instant but it crossed from "impossible to ship" to "acceptable for the local workflow."

---

## 7) Native upload UX vs web upload UX

### 7.1 Native clients expose an explicit local draft queue

Both iOS and macOS show visible client-side queue state  something a browser form typically doesn't bother with. On iOS, `WardrobeUploadView` stores a local `[UploadQueueItem]`, rows move through `queued` → `uploading` → `processing` → `ready`/`failed`, and once a server draft exists the app polls `fetchDrafts()` until the item is ready for review. `WishlistView` does the same for wishlisted items, with an extra distinction between `uploadForDraftWishlisted(...)` and `uploadForDraftWishlistedPresegmented(...)`. The native client does more orchestration than a browser form  because it's doing more work.

### 7.2 macOS changes the input style completely

The macOS upload path is desktop-native in ways the web app can't match: drag and drop from Finder, security-scoped file access, batch file ingestion from URLs, local segmentation before the upload panel. That's not just a UI difference  it changes the shape of the feature. Desktop can assume file-based workflows. Mobile assumes camera roll workflows. Web has to stay more generic.

### 7.3 Native keeps the backend draft/review model, not a parallel system

Even though the clients do more locally, they still defer to backend draft status for final review. The architecture doesn't create a separate native review pipeline  there's one product truth: upload to the same wardrobe API, receive a draft, review and accept through the same backend lifecycle. Native adds intelligence at the edge without forking the business workflow. Keeping that constraint actually made the native work easier, not harder.

---

## 8) macOS segmentation is local too, but simpler than iOS

Both Apple platforms run local segmentation, but they're not doing the same thing.

iOS ships a dedicated human parsing model  `SegFormerClothes`  because the goal was semantic clothing segmentation for better wardrobe capture. On macOS, `MacClothingSegmentationService` uses `VNGenerateForegroundInstanceMaskRequest` for local item extraction and falls back to the raw image if masking fails. However, this is soon to be changed, as I will start working on adding SegFormer to the Mac app to maintain parity with the iOS app.

The heavy model work on Mac lives in the Python sidecar, not in Swift. That kept the desktop native layer effective without overcomplicating it.

---

## 9) The backend trick that makes all of this manageable: `skip_segmentation`

The cleanest decision in this whole system is also the smallest one.

The entire local-vs-remote branching contract collapses to a single field: `skip_segmentation`.

### 9.1 What the client does

When a client has already produced a clean segmented image, it uses the same multipart upload endpoint and includes:

```text
skip_segmentation=true
```

The Angular path doesn't set this flag by default  it sends only the `image` field and lets remote segmentation run. Native clients that perform local preprocessing add this boolean and continue using the same `/api/wardrobe/upload` endpoint. No separate API, no platform-specific routing. One flag.

### 9.2 What the backend does

The backend reads the field, stores it on `ImageProcessingMessage.SkipSegmentation`, and the queue worker branches on it:

```csharp
if (skipSegmentation)
{
    // archive/store the upload blob as-is and skip remote BiRefNet
}
else
{
    // upload raw bytes to worker payload and call Python processor /api/process-image
}
```

The implementation details:

- `UploadItem` in `.NET Functions` parses the multipart fields and sets `SkipSegmentation` on the queue message.
- The upload is atomic from the API's perspective: raw bytes go to blob storage, draft doc is stored as `DraftStatus.Processing`, queue message is enqueued.
- The queue worker checks draft state first and skips duplicate messages if the draft is no longer `Processing`.
- For `skip_segmentation=true`, the worker uploads raw bytes directly to archive storage and moves straight to metadata extraction.
- Otherwise, it builds a multipart payload with `image` and `item_id` and calls Python `/api/process-image`.
- Draft terminal transitions are explicit (`Processing` → `Ready`/`Failed`); metadata extraction failures are non-fatal.
- `retryDraft` re-queues failed items with `SkipSegmentation` defaulting to `false`; `acceptDraft` promotes a ready draft into a final wardrobe item and cleans up the raw blob state.

### 9.3 What the Python processor guarantees

`/api/process-image` is idempotent by `item_id`  if an archive blob already exists for that ID, it returns the existing URL and skips segmentation. The segmentation path (`_segment_with_modal`) forwards normalized images to Modal BiRefNet, expects a transparent PNG response, and converts to WebP before uploading to archive.

`/api/extract-clothing-metadata` is then called by the .NET worker to enrich tags, brand, category, and colours. It supports both API-key and Azure AD auth modes and is intentionally fail-open from the .NET side: metadata errors don't block the draft transition to `Ready`.

One boolean, two meaningful runtimes from one API: remote-first for unknown or unprocessed uploads, local-first for clients that already did the work. The external contract stays stable while each platform specializes internally.

---

## 10) What this actually cost, and what it saved

The economic win in PluckIt was: **don't pay remote compute for work the client already completed well enough.**

The deployed segmentation path gives good quality, strong fallback behavior, simpler web clients, and no model distribution burden. However it also carries queue latency, network round trips, remote GPU spend, and occasional cold start behavior.

The local iOS and macOS paths change that profile: cleaner assets at capture time, remote segmentation skipped, upload UX that feels faster, less unnecessary backend cleanup work. The same wardrobe upload has very different cost envelopes depending on where it came from:

- **web upload, raw image**: backend queue + remote segmentation,
- **iOS pre-segmented upload**: backend storage path, no remote segmentation call,
- **macOS local try-on session**: local segmentation and local try-on, no per-run remote VTON.

That cost difference is what made the split architecture worth the complexity.

---

## 11) Why not just keep everything on web if web already worked?

Honestly, I really think that the mobile ecosystem for this app is going to be the #1 use case. While I'm sure the current somewhat PWA frontend is fine, I think on mobile ML models are a game changer in reducing the highest costs currently (GPU pricing).

---

## 12) What building this taught me

The long-term goal isn't to remove cloud inference  it's to use it where it improves reliability, and use device compute where it actually improves the product. Those are different questions, and answering them separately is what made the architecture coherent.
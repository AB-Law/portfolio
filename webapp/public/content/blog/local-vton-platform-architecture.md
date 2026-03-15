# How I Split Local AI Across iPhone, Mac, and Cloud in PluckIt

![Local VTON sample output](/images/VTON-Example.png)

When people talk about "running AI locally," the conversation usually gets simplified into one question:

"Can this model run on-device?"

That was not the real question in PluckIt.

The real question was:

**which parts of the pipeline should run on which device, under which conditions, so the product feels fast, private, and reliable without creating a maintenance mess?**

That led to a deliberately split architecture:

- **web and backend** keep a strong remote default,
- **iOS** performs local clothing segmentation before upload,
- **macOS** goes further and runs full local virtual try-on with CatVTON through a Python sidecar.

This article is the implementation story behind that split: what we were doing in PluckIt, why some models moved to iPhone, why heavier inference moved to Mac, why iPhone does **not** run full VTON, and how one backend contract keeps the whole thing coherent.

---

## 1) What PluckIt was actually trying to solve

PluckIt is not just a demo for one AI model. It is a wardrobe product with three different image problems:

1. users upload messy clothing photos,
2. users want clean wardrobe items and metadata,
3. users want try-on to feel interactive instead of like a batch job.

Those are related, but they are not the same workload.

That distinction mattered a lot.

If I had treated "AI in PluckIt" as one giant inference problem, the product would have ended up with one bad compromise:

- either everything remote,
- or everything local,
- and both would have been wrong for at least one platform.

Instead, I split the pipeline into two layers:

- **preprocessing and segmentation**
- **heavy generative try-on inference**

Then I moved each layer only where it made product sense.

### The product constraints

The architecture was driven by a few hard constraints:

- wardrobe capture should feel private and low-friction,
- segmentation quality has to be good enough for downstream metadata and UX,
- upload behavior needs to degrade gracefully when a local model fails,
- and the same backend must work for web, iOS, and macOS without multiplying APIs.

That last part matters more than it sounds. Once multiple clients exist, "just make a special endpoint" becomes technical debt very quickly.

So the real requirement became:

**one shared upload contract, but different execution paths behind it depending on platform capability and confidence.**

---

## 2) The three PluckIt execution surfaces

PluckIt ended up with three real AI surfaces, each doing a different job.

### Web / backend: quality-first remote baseline

This is the default path for unprocessed uploads.

- Client uploads to `/api/wardrobe/upload`
- backend stores metadata and enqueues an `ImageProcessingMessage`
- queue worker decides whether segmentation should happen
- if needed, Python processor calls Modal BiRefNet through `_segment_with_modal`

This path is useful because it centralizes quality. The web path does not need to ship on-device models, and the backend can use a stronger remote segmentation baseline for unknown inputs.

### iOS: local segmentation before upload

On iPhone, the most valuable local feature was **not** full try-on. It was **better uploads**.

The iOS app uses:

- `ClothingSegmentationService`
- `HumanParsingSegmenter`
- Vision requests like `VNDetectHumanRectanglesRequest`

to break an image into cleaner clothing items before those items ever hit the backend.

That means the phone is not trying to be a full VTON workstation. It is acting like an intelligent capture and preprocessing device.

### macOS: local try-on plus local segmentation

On Mac, I could justify a much heavier local stack:

- `MacTryOnSidecar` manages Python setup and server lifecycle
- `server.py` hosts local inference
- `MacTryOnService` posts person and garment images to `http://127.0.0.1:<port>/try-on`
- `MacClothingSegmentationService` handles local foreground masking for upload prep

This is where CatVTON lives.

The Mac is the only PluckIt surface that made sense for **full on-device VTON**.

---

## 2.5 What is actually shared between iOS and macOS

One thing the architecture is designed for is that iOS and macOS remain on one backend contract (rather than two different API sets).

This workspace does not include the native app source, so I cannot verify those internal service names here, but the practical result is clear from the shared backend contract:

It is:

- one shared API layer,
- one shared upload contract,
- one shared draft/review model,
- but different local preprocessing and local inference capability depending on the device.

That distinction matters because it kept the architecture from fragmenting as the native work expanded.

---

## 3) PluckIt web vs iOS vs macOS: the real differences

The easiest way to understand the architecture is to compare what each surface is responsible for.

| Surface | Main job | Local segmentation | Local try-on | Upload contract | Runtime posture |
| --- | --- | --- | --- | --- | --- |
| Web / Angular | lightweight client, centralized quality path | no local segmentation in this repo | no local VTON path in this repo | standard `/api/wardrobe/upload` | cloud-first |
| iOS | capture, clean up, split items, then upload | yes, `ClothingSegmentationService` + `HumanParsingSegmenter` | no | same upload API, often with `skip_segmentation=true` | local-first preprocessing |
| macOS | desktop wardrobe flow plus full try-on | yes, `MacClothingSegmentationService` | yes, via `MacTryOnSidecar` + local Flask server | same upload API, plus localhost try-on API | hybrid local-heavy |

That table is the whole strategy in compact form.

But the implementation differences are more interesting than the table.

### 3.1 Web / Angular is contract-driven and backend-dependent

In this workspace, the Angular app lives in `PluckIt.Client`, and its implementation makes that contract concrete:

- `WardrobeService.uploadForDraft(file)` posts `FormData` with only the `image` field to `/api/wardrobe/upload` and returns a `202 Accepted` draft.
- `uploadForDraftWishlisted(file)` adds `is_wishlisted=true` but still no `skip_segmentation` default flag.
- upload UI supports drag-and-drop and multi-file selection, then enqueues files as local queue items.
- each selected item is resized (`resizeImageFile`) and uploaded with bounded concurrency (up to 4 in-flight uploads).
- queue states are `queued` → `uploading` → `processing` → `ready`/`failed`, and ready/failed items surface quick actions (review/retry/dismiss).
- the component polls `/api/wardrobe/drafts` every 5 seconds while any item is still processing, then reconciles queue items with returned draft status.
- when offline, uploads are stored by `OfflineQueueService` in IndexedDB/localStorage and replayed automatically when connectivity returns.

So the web client is intentionally simple: raw upload first, then rely on backend quality and metadata.

### 3.2 iOS is an opinionated capture client

iOS is much more interventionist than web.

It does not just upload what the user picked.
It tries to improve the asset first.

`WardrobeUploadView` and `WishlistView` both show the same pattern:

- collect images from `PhotosPicker`
- run local segmentation before final upload decision
- let the user choose among segmented results
- upload either pre-segmented outputs or raw fallback uploads

That is a substantial product difference from a cloud-first browser flow.

On iOS, the client is not passive. It is part of the ML pipeline.

### 3.3 macOS is closer to a workstation than a thin client

The Mac app goes further than either web or iOS.

It has two distinct local behaviors:

- local wardrobe upload preparation
- local try-on generation

`MacFeatureViews` pulls files from Finder or drag-and-drop, runs `MacClothingSegmentationService`, lets the user approve segmented items, and then uploads them through the same `WardrobeService`.

Separately, `MacTryOnView` runs a true desktop try-on flow:

- select a person image from disk
- choose a garment from the existing wardrobe
- launch or attach to the local sidecar
- send a multipart request to a localhost Flask service
- receive a generated PNG result back into the app

That is a completely different runtime profile from iOS and web.

The browser depends on backend compute.
iOS improves inputs before backend compute.
macOS can bypass backend try-on compute entirely.

---

## 4) Why iOS got segmentation, but not full VTON

This was one of the most important product decisions in the system.

It is tempting to say: if local inference is good, put it everywhere.

That would have been the wrong engineering decision for PluckIt.

### 4.1 iPhone had the highest leverage on preprocessing

Most wardrobe flow pain on mobile was happening **before** try-on:

- cluttered input photos,
- bad cutouts,
- multiple clothing items in one frame,
- unnecessary remote segmentation calls.

Moving segmentation to iOS solved those directly.

`ClothingSegmentationService.segmentIntoItems(imageData:)` does three things in order:

1. decode and orient the image correctly,
2. use `VNDetectHumanRectanglesRequest` as a fast gate,
3. if a person is present, call `HumanParsingSegmenter.segmentIntoItems(cgImage:)`

If parsing does not produce usable items, the pipeline falls back:

- on iOS 17+, it tries `VNGenerateForegroundInstanceMaskRequest`
- if that still fails, it uploads the original image

That gave me a robust local-first path that improved daily wardrobe capture without blocking the user when ML confidence was low.

### 4.2 Full VTON is a very different workload from segmentation

Human parsing is a bounded preprocessing task:

- fixed input size,
- a single semantic model,
- relatively short execution,
- immediate product value even when the rest of the pipeline is still remote.

Full CatVTON is not like that.

It brings:

- large model footprints,
- diffusion scheduling cost,
- heavy memory pressure from attention,
- much longer end-to-end runtime,
- more thermal and battery pressure,
- and much more painful first-run bootstrapping.

On macOS I accepted those costs because the desktop flow could support them.
On iPhone, that would have hurt the actual product.

### 4.3 The user job was different on mobile

For iOS, the main user job was:

- take or select clothing photos,
- segment them cleanly,
- add them to wardrobe quickly,
- avoid waiting on remote cleanup if local preprocessing already did the work.

For macOS, the user job could include:

- interactive experimentation,
- local try-on sessions,
- accepting a one-time environment setup,
- and sitting through heavier inference for a richer local result.

That is the core reason iOS does not run VTON in PluckIt:

**segmentation made mobile better immediately; full VTON would have made mobile heavier without enough payoff.**

---

## 5) The iOS pipeline in implementation detail

The iOS segmentation stack is one of the most practical local AI pieces in the project because it changes both UX and backend cost.

### 5.1 Fast routing with Vision first

The first branch happens in `ClothingSegmentationService`.

If `VNDetectHumanRectanglesRequest` finds a person with reasonable confidence, the image is treated like a human-worn clothing photo and routed into `HumanParsingSegmenter`.

If not, the app assumes the image might be a flat-lay or isolated item and uses foreground masking where available.

This small gate matters because it avoids running a heavier segmentation path on obviously wrong inputs.

### 5.2 `HumanParsingSegmenter` and the Core ML path

`HumanParsingSegmenter` loads `SegFormerClothes.mlmodelc` from the bundle and keeps it cached.

The implementation does real preprocessing work, not just a model call:

- renders the image into a fixed `512x512` input
- normalizes pixel values using ImageNet-style mean/std
- handles byte ordering correctly for iOS image memory layout
- runs Core ML with `.cpuAndGPU`
- reads `label_map` output back into Swift

From that semantic label map, PluckIt keeps clothing classes only:

```text
[4, 5, 6, 7, 8, 9, 10, 16, 17]
```

That is what converts a person photo into usable wardrobe regions instead of a generic foreground blob.

### 5.3 Turning semantic output into uploadable items

The most product-important part is not the raw mask. It is the itemization.

`HumanParsingSegmenter.segmentIntoItems(cgImage:)`:

- scales the label map back to original image size,
- groups pixels by clothing label,
- skips tiny noisy regions under `500` pixels,
- computes bounding boxes,
- crops each region,
- composites it into a transparent image,
- emits `SegmentedClothingItem`

That is how a single input photo can become multiple wardrobe-ready uploads.

This is also why local segmentation helped even before any local VTON work existed on iPhone: it improved the shape of the data entering the whole product.

### 5.4 Why the fallback path is part of the feature, not a backup detail

The reliability story matters here.

Local ML features are only production-worthy if failure is boring.

In PluckIt, failure cases include:

- no person detected,
- model missing or unavailable,
- empty or noisy label map,
- unsupported OS path for a Vision feature

Those do **not** stop upload. They only change the route:

- pre-segment if possible,
- foreground-mask if possible,
- otherwise upload raw

That is the difference between an ML demo and a product feature.

---

## 6) The macOS path: why full local VTON belonged there

macOS is where I allowed PluckIt to get ambitious.

### 6.1 The sidecar pattern

The VTON ecosystem is still heavily Python-native, so I did not try to force CatVTON into a pure Swift runtime.

Instead:

- Swift owns UI and app lifecycle
- `MacTryOnSidecar` owns Python environment setup
- a local Flask process hosts inference
- `MacTryOnService` talks to it over localhost

That gave me a stable bridge between a native app and a Python-first model stack.

It also let the UI remain responsive while heavyweight setup and inference happened outside the app process.

### 6.2 What first-run setup actually does

`MacTryOnSidecar` does real environment management on first launch:

- creates a virtualenv in Application Support
- installs `torch`, `torchvision`, `diffusers`, `transformers`, `accelerate`, `flask`, `Pillow`, `numpy`, and OpenCV
- clones the CatVTON repository
- downloads CatVTON weights
- downloads the Stable Diffusion inpainting base model
- pre-warms the SegFormer clothes segmentation model cache

In the UI, this is exposed as a one-time download of roughly `~10 GB`.

That would have been a bad fit for iPhone.
On Mac, it is a reasonable trade for a serious local try-on feature.

### 6.3 Why the Mac hardware profile changed the decision

Desktop made sense for CatVTON because it offered:

- more unified memory headroom,
- better sustained GPU utilization,
- fewer thermal constraints,
- a product context where longer waits are more acceptable,
- and a user expectation that heavier local tooling may exist.

Even then, it was not trivial.

The original CatVTON path ran into attention memory blowups because the model concatenates person and garment regions before the UNet. At around `1024x768`, that creates an attention footprint that quickly becomes absurd for consumer hardware.

The practical fix was chunked attention: process smaller query slices rather than materializing the full attention matrix at once.

That changed the Mac path from "crashes under realistic resolution" to "slow, but usable and predictable."

### 6.4 Shipping local VTON required boring fixes too

A lot of production work had nothing to do with the model paper:

- transparent PNG garments turned black if naively converted to RGB
- forced resizing distorted garments and bodies
- default scheduler settings were too slow for actual use

So the macOS path also needed:

- white-background compositing for transparent garment assets,
- fit-and-pad preprocessing to preserve aspect ratio,
- scheduler tuning from DDIM to `DPM++ 2M Karras`,
- step reduction from `50` to `20`

That got try-on from roughly `252s` to roughly `98s` on the measured target machine.

It is still not "instant," but it crossed the line from impossible to product-usable.

---

## 7) Native upload UX vs web upload UX

Another major difference between web and native is not only where segmentation runs, but how the user experiences the upload.

### 7.1 Native clients expose an explicit local draft queue

Both iOS and macOS have visible client-side queue state.

On iOS:

- `WardrobeUploadView` stores a local `[UploadQueueItem]`
- rows move through `queued`, `uploading`, `processing`, `ready`, or `failed`
- once a server draft exists, the app polls `fetchDrafts()` until the item is ready for review

`WishlistView` repeats the same idea for wishlisted items, with an extra distinction between:

- `uploadForDraftWishlisted(...)`
- `uploadForDraftWishlistedPresegmented(...)`

That means native does more orchestration in the client than a typical browser upload form.

### 7.2 macOS changes the input style completely

The macOS upload path is desktop-native in a way the web app cannot be:

- drag and drop from Finder
- security-scoped file access
- batch file ingestion from URLs
- local segmentation before upload paneling

This is not just a UI difference. It changes the shape of the feature:

- desktop can assume file-based workflows
- mobile can assume camera roll workflows
- web usually has to stay more generic

### 7.3 Native keeps the backend draft/review model, not a parallel system

Even though the clients do more locally, they still defer to backend draft status for final review.

That is important.

The architecture does **not** create a separate native review pipeline.
It keeps one product truth:

- upload to the same wardrobe API
- receive a draft
- review and accept through the same backend lifecycle

So native adds intelligence at the edge without forking the business workflow.

---

## 8) macOS segmentation is local too, but simpler than iOS

One subtle detail in PluckIt is that local segmentation exists on both Apple platforms, but not in exactly the same form.

On iOS, the app ships a dedicated human parsing model.

On macOS, `MacClothingSegmentationService` currently uses `VNGenerateForegroundInstanceMaskRequest` for local item extraction and falls back to the raw image if masking fails.

Why the difference?

Because the goals are different:

- iOS needed semantic clothing parsing for better wardrobe capture
- macOS mainly needed practical local item extraction plus a bridge into local try-on

So the Mac path stayed simpler in Swift, while the truly heavy model work lived in the Python sidecar.

That kept the desktop implementation effective without overcomplicating the native layer.

---

## 9) The backend trick that makes all of this manageable: `skip_segmentation`

The cleanest architectural decision in this system is also the smallest.

I intentionally reduced the local-vs-remote branching contract to one field:

`skip_segmentation`

### 9.1 What the client does

When a client has already produced a clean segmented image, it uses the same multipart upload endpoint and includes:

```text
skip_segmentation=true
```

In this repository, the Angular upload path does not set this flag by default; it sends only the `image` field and relies on remote segmentation.

Native clients that perform local preprocessing can add this boolean and still keep using `/api/wardrobe/upload`.

### 9.2 What the backend does

The backend reads that field, stores it on `ImageProcessingMessage.SkipSegmentation`, and the queue worker branches on it.

Conceptually:

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

The implementation details are:

- `UploadItem` in `.NET Functions` parses multipart fields and sets `SkipSegmentation` on the queue message.
- upload is atomic from the API perspective: raw bytes are written to blob storage, draft doc is stored as `DraftStatus.Processing`, then the queue message is enqueued.
- queue worker checks draft state first and skips duplicate messages if the draft is no longer `Processing`.
- for `skip_segmentation=true`, worker uploads the raw bytes directly to archive storage and moves directly to metadata extraction.
- otherwise, worker creates multipart payload with `image` and `item_id` and calls Python `/api/process-image`.
- draft terminal transitions are explicit (`Processing` → `Ready`/`Failed`) and metadata extraction failures are handled as non-fatal when marking readiness.
- `retryDraft` re-queues failed items with `SkipSegmentation` defaulting to `false`; `acceptDraft` promotes a ready draft into a final wardrobe item and removes raw blob state.

### 9.3 What the Python processor guarantees

The processor endpoint `/api/process-image` is idempotent by `item_id`: if an archive blob already exists, it returns the existing URL and skips segmentation.

The segmentation path (`_segment_with_modal`) forwards normalized images to Modal BiRefNet, expects a transparent PNG response, and converts it to WebP before upload to archive.

`/api/extract-clothing-metadata` is then called by the .NET worker to enrich tags/brand/category/colours. It supports both API-key and Azure AD auth modes and is intentionally fail-open from the .NET side: metadata errors do not block the draft transition to `Ready`.

This single boolean created two meaningful runtimes from one API:

- **remote-first** for unknown or unprocessed uploads
- **local-first** for clients that already did the work

That kept the external contract stable while letting each platform specialize internally.

---

## 10) Why this mattered for cost and latency

The economic win in PluckIt was not "local AI is free."

The win was:

**do not pay remote compute for work the client already completed well enough.**

### Remote path

The remote segmentation path is useful because it gives:

- centralized quality,
- strong fallback behavior,
- simpler web clients,
- and no model distribution burden on thin clients

But it also carries:

- queue latency,
- network round trips,
- remote GPU spend,
- cold start behavior in some cases

### Local-first path

The local iOS and macOS segmentation paths change that shape:

- cleaner assets are produced at capture time,
- remote segmentation can be skipped,
- upload UX feels faster,
- and the backend does less unnecessary image cleanup work

The same wardrobe upload can therefore have very different cost envelopes:

- **web upload, raw image**: backend queue + remote segmentation
- **iOS pre-segmented upload**: backend storage path, no immediate remote segmentation call
- **macOS local try-on session**: local segmentation and local try-on, with no per-run remote VTON requirement

That is what made the split architecture worthwhile.

---

## 11) Why not just keep everything on web if web already worked?

Because "the web path works" is not the same as "the product is optimized."

### UX

Users feel the difference when image cleanup happens close to capture.

### Privacy posture

If the app can ship cleaner item cutouts instead of always shipping raw full-scene images, that is a better default.

### Platform fit

iPhone is a great place for lightweight assistive vision work.
Mac is a much better place for heavyweight local generation.

### Operational simplicity

One upload API plus one branching flag is much easier to maintain than separate platform-specific backends.

The point was never ideological local-only purity.
The point was to put each workload where it was most useful.

---

## 12) What this architecture taught me

The biggest lesson from PluckIt was that "move AI on-device" is too vague to be a good strategy.

A better strategy is:

1. identify the expensive or latency-sensitive stage,
2. move that stage only where the platform can support it,
3. preserve a shared backend contract,
4. build boring fallback paths,
5. and keep cloud inference as a reliability tier, not as the only tier.

In PluckIt, that became:

- **iOS** for local segmentation and upload quality improvement
- **macOS** for full local CatVTON and desktop-grade try-on
- **backend/web** for centralized fallback quality and unsegmented uploads

That is why iOS does not have VTON.
That is why macOS does.
That is why the system still keeps a remote path.

The long-term goal is not to remove the cloud entirely.
It is to use cloud inference where it improves reliability, and use device compute where it improves the product.

That is a much better rule than "run everything locally" or "run everything remotely."

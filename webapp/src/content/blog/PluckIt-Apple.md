---
title: "How I Split Local AI Across iPhone, Mac, and Cloud in PluckIt"
date: 2026-03-15
description: "PluckIt runs segmentation on the iPhone, full try-on on the Mac, and falls back to the cloud for everything else."
tags:
  - swift
  - ios
  - macos
  - model-deployment
  - machine-learning
  - architecture
  - azure
readTime: 6m read
image: /images/VTON-Example.png
---

![Local VTON sample output](/images/VTON-Example.png)

---

## What PluckIt does

PluckIt is a wardrobe app with a small AI stylist. I have a lot of clothes and never managed to organise them, and every app I tried had some restriction that annoyed me, so I built my own.

It has to handle four things:

1. People upload messy clothing photos.
2. They want clean wardrobe items with usable metadata.
3. Try-on should feel interactive, not like a batch job.
4. Style suggestions should account for taste and what is already in the wardrobe.

I first treated all of that as one inference problem. It's several different workloads, and they don't belong on the same machine.

The other constraint was one backend for web, iOS and macOS. Per-platform endpoints get messy fast, so there is one upload contract and different execution paths behind it.

## Three surfaces

**Web.** The client posts to `/api/wardrobe/upload`. The backend stores metadata and queues an `ImageProcessingMessage`. A worker calls a Python processor, which sends the image to BiRefNet on Modal for segmentation. There are no models to ship and the client stays thin.

**iOS.** Segmentation runs on the phone before upload. This is the most useful thing the phone can do. People take photos on their phones, and cleaning them up at capture saves a remote call per image, and Modal credits.

A friend who tried an early version suggested segmenting clothes off a person and adding virtual try-on. That was also my final year project, and I implemented it badly back then. I wanted to do it properly this time.

**macOS.** The Mac does segmentation and full try-on locally using CatVTON. It's the only device where I could make that work.

| Surface | Local segmentation | Local try-on | Upload |
| --- | --- | --- | --- |
| Web / Angular | no | no | `/api/wardrobe/upload` |
| iOS | yes, `ClothingSegmentationService` + `HumanParsingSegmenter` | no | same API, usually `skip_segmentation=true` |
| macOS | yes, `MacClothingSegmentationService` | yes, `MacTryOnSidecar` + local Flask server | same API, plus localhost try-on |

## Why iOS only gets segmentation

Most of the pain on mobile happens before try-on: cluttered photos, bad cutouts, several items in one frame. Segmentation fixes those directly.

Try-on is a different kind of job. CatVTON needs large models, diffusion scheduling and a lot of attention memory, and it runs for a long time. On a phone that means heat and battery drain. On a Mac I could absorb the cost. I'm looking at an AR overlay for iPhone, but not full diffusion.

## The iOS pipeline

`ClothingSegmentationService.segmentIntoItems(imageData:)` does this:

1. Decode and orient the image.
2. Run `VNDetectHumanRectanglesRequest` as a quick check for a person.
3. If there is one, run `HumanParsingSegmenter`. If not, treat it as a flat-lay and try `VNGenerateForegroundInstanceMaskRequest` (iOS 17+).
4. If that fails too, upload the original.

`HumanParsingSegmenter` loads `SegFormerClothes.mlmodelc`, resizes the input to 512x512, normalises it, runs Core ML on CPU and GPU, and reads the label map back. It keeps only the clothing classes:

```text
[4, 5, 6, 7, 8, 9, 10, 16, 17]
```

Then it groups pixels by label, drops regions under 500 pixels, crops each one onto a transparent background and emits a `SegmentedClothingItem`. One photo can become several wardrobe items.

The fallbacks matter as much as the model. No person, no model, an empty label map or an old OS version just changes the route. The upload never fails because of local ML.

## The macOS path

The VTON ecosystem is mostly Python, so I didn't port CatVTON to Swift. The Swift app owns the UI and lifecycle. `MacTryOnSidecar` sets up the Python environment and runs a local Flask server, and `MacTryOnService` talks to it over localhost. I can change the inference stack without touching Swift.

First launch creates a virtualenv, installs torch, diffusers and friends, clones CatVTON and downloads the weights and the Stable Diffusion inpainting base. That's a one-time download of about 10 GB, fine on a Mac and impossible on a phone.

It took some work to make usable:

- At about 1024x768, attention memory blew up because CatVTON concatenates person and garment before the UNet. Chunked attention fixed the crashes.
- Transparent PNG garments turned black on RGB conversion. I composite them on white.
- Plain resizing distorted bodies and garments. I fit and pad instead.
- I changed the scheduler from DDIM to `DPM++ 2M Karras` and cut steps from 50 to 20. That took try-on from about 252s to about 98s on my machine.

macOS segmentation currently uses `VNGenerateForegroundInstanceMaskRequest`. I plan to add SegFormer to match iOS.

## One flag in the backend

All of this hangs on a single field, `skip_segmentation`. A client that has already produced a clean cutout sends `skip_segmentation=true` to the same endpoint. The Angular client sends only `image` and lets remote segmentation run.

The queue worker branches on it:

```csharp
if (skipSegmentation)
{
    // store the blob as-is, skip remote BiRefNet
}
else
{
    // send raw bytes to the Python processor /api/process-image
}
```

Other details:

- The worker skips duplicate messages if the draft is no longer `Processing`.
- `/api/process-image` is idempotent by `item_id`.
- Metadata extraction failures don't block a draft from reaching `Ready`.
- `retryDraft` re-queues with `SkipSegmentation` set to `false`.

The native clients keep their own upload queue (`queued`, `uploading`, `processing`, `ready` or `failed`) but still go through the same draft and review flow on the backend. They add work at the edge without a second pipeline.

## Cost

The saving is not paying for remote compute the client already did. A web upload costs a queue hop and a remote segmentation call. A pre-segmented iOS upload skips the remote call. A Mac try-on session needs no remote VTON at all.

## Why not just stay on web

I expect mobile to be the main client, and on-device models cut the biggest cost, which is GPU time. The goal isn't to drop the cloud. It's to use it where it makes things more reliable and use the device where it makes the product better.

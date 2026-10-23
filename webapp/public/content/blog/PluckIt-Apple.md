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


## Three surfaces

**Web.** The client posts to `/api/wardrobe/upload`. The backend stores metadata and queues an `ImageProcessingMessage`. A worker calls a Python processor, which sends the image to BiRefNet on Modal for segmentation. There are no models to ship and the client stays thin.

**macOS.** The Mac does segmentation and full try-on locally using CatVTON. It's the only device where I could make that work.

| Surface | Local segmentation | Local try-on | Upload |
| --- | --- | --- | --- |
| Web / Angular | no | no | `/api/wardrobe/upload` |
| macOS | yes, `MacClothingSegmentationService` | yes, `MacTryOnSidecar` + local Flask server | same API, plus localhost try-on |


## The macOS path

The VTON ecosystem is mostly Python, so I didn't port CatVTON to Swift. The Swift app owns the UI and lifecycle. `MacTryOnSidecar` sets up the Python environment and runs a local Flask server, and `MacTryOnService` talks to it over localhost. this lets me change the inference stack without touching Swift.

First launch creates a virtualenv, installs torch, diffusers and friends, clones CatVTON and downloads the weights and the Stable Diffusion inpainting base.

macOS segmentation currently uses `VNGenerateForegroundInstanceMaskRequest`.

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
# Models

The product uses free, open-source models only. No paid model APIs are called from the app. Every AI feature has a non-AI fallback, so the app still works if every model is down.

## Models in the product

| Job | Model or method | Licence | Runs on | Fallback |
|---|---|---|---|---|
| Price forecast, 14 days (p10, p50, p90) | `amazon/chronos-bolt-small`, zero-shot | Apache-2.0 | GitHub Actions, CPU, nightly | Holt-Winters smoothing |
| Sell now or wait | Rule on the forecast: wait only if the 7-day p10 is at or above today's price and the p50 gain is at least 5% | Own code | Server | Default to sell now |
| Best centre | Net value = kg × price − distance × travel cost (R2 per km, configurable) | Own code | Server, PostGIS | Nearest open centre |
| Anomaly flags at sale time | Rules: weight above 3 × the reclaimer's 30-day 95th percentile, duplicate photo, centre far from usual area | Own code | Server | None needed |
| Anomaly score, batch | `IsolationForest` on weight, price, time and distance | BSD-3 (scikit-learn) | GitHub Actions, nightly | Rules only |
| Duplicate photo | 64-bit dHash, Hamming distance of 6 or less | Own code | Server, Postgres `bit_count` | None needed |
| Material suggestion from a photo, including mixed loads (built) | TinyCLIP ViT-8M, int8, plus a 30 KB classifier head trained on TrashNet, RealWaste and photos of electronics. Scores the whole photo and its four quarters. Runs on the phone with no data after the first download | MIT (model), MIT (TrashNet), CC BY 4.0 (RealWaste), CC0, public domain, CC BY and CC BY-SA (electronics photos) | In the browser, using transformers.js | The reclaimer picks a material by hand |
| isiZulu speech to text (stretch) | `uctnlp/omniASR-CTC-300M-v2-Zulu-All-v2` | Apache-2.0 | Hugging Face ZeroGPU Gradio Space | Icons and typing |
| English and Afrikaans speech to text (stretch) | `openai/whisper-large-v3-turbo` | MIT | Same Space | Icons and typing |
| Assistant answers | Built as a lookup, not a model: it reads the live board, the national ranges and the person's own fees, and writes the answer from templates | Own code | In the browser | Says there are no saved prices yet |
| Assistant answers, with a language model (stretch) | Gemma 4 on OpenRouter, given the recommendation as context | Open weights. Confirm the licence | OpenRouter free tier | The lookup above |

Current code: the on-device material scanner and the QR reader run in the app. The server-side models in this table, such as the forecast and the speech models, are not called yet.

## The on-device material scanner

**Why on the phone.** The photo never leaves the device, the scan works without the free-tier limits of a hosted model, and the model is small enough to cache. It runs in the browser, so one build serves Android and iPhone.

**How it works.** TinyCLIP ViT-8M (a small image and text model, MIT licence) turns a photo into 512 numbers. A linear head, trained on TrashNet (MIT), turns those into one of seven groups: cardboard, glass, metal, paper, plastic, trash and electronics. The app maps the groups to the materials it prices. Metal becomes cans, paper becomes white paper, and plastic stays ambiguous, so the reclaimer picks PET or HDPE. The reclaimer always confirms with a tap.

| Part | Size | Licence |
|---|---|---|
| `onnx-community/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX`, int8, pinned revision | 23.2 MB, served by the app from `/models/tinyclip/` and kept by the service worker | MIT |
| onnxruntime-web plain SIMD build | 14 MB, served from `/ort/` and kept by the service worker | MIT |
| `public/models/waste-head.json` (the head) | 30 KB | Ours, trained on MIT data |
| `@huggingface/transformers` 4.3.1 (runs the model) | Loaded on demand | Apache-2.0 |

**Works without data.** `tools/vision/fetch-assets.mjs` runs before every build. It copies the runtime from `node_modules` and downloads the model at a pinned revision, checked by SHA-256, into `public/` (git-ignored). The app never calls a CDN. The first scan downloads about 38 MB once; after that the service worker serves everything and scans work in flight mode. The tokenizer (5 MB) is not downloaded: the model's dummy text input is hard-coded as the four CLIP token ids for "a photo", checked against the real tokenizer. Verified with the server stopped: the sell page opened and a cardboard photo scanned at 100% in 714 ms.

**Evidence, version 3 (current): electronics.** The head learned a seventh group, electronics, from 1,391 openly licensed photos from Wikimedia Commons (CC0, public domain, CC BY and CC BY-SA; every author and licence is in [ELECTRONICS_PHOTO_CREDITS.md](ELECTRONICS_PHOTO_CREDITS.md)). When the scanner sees electronics it does not ask for a material. It says electronics are not paid for by the kilogram and links to the electronics guide. Electronics never count as a material in a mixed load.

The photos came from searches for 29 kinds of item (phones, laptops, keyboards, circuit boards, TVs, printers, chargers, cables, batteries, kettles, microwaves and more). A contact sheet check found that the "pile of e-waste" searches returned cityscapes, fields and bins, so that whole group (144 photos) was dropped. About one photo in twenty in the rest is probably still off-topic, which was not counted.

| Held-out check | Version 2 | Version 3 |
|---|---|---|
| TrashNet test (508) | 78.9% | 78.0% |
| RealWaste test (952, real photos) | 81.7% | 81.4% |
| Electronics test (282 photos, 20% of each kind held out) | not a group | **98.2% found** |
| Recyclables wrongly called electronics (TrashNet, RealWaste) | not a group | 0.2%, 0.1% |

A harder check holds out whole kinds of item, so the model never saw them in training: toaster, hair dryer, remote control, radio, DVD player, tangle of cables, hard disk drive, lithium battery pack, feature phone and laser printer (466 photos). It still found **97.0%**, and recyclables wrongly called electronics stayed at 0.2%. When it was at least 70% sure it answered 94% of electronics photos and was right 99% of the time.

**Read these numbers with care.** The electronics photos are clean Commons pictures and the recyclable photos come from other sources, so part of what the head learned may be the style of the picture and not the object. A phone on a messy table, a bag of old chargers or a fridge in a yard have not been tested. The Commons photos are mostly small devices, so big appliances such as fridges and washing machines are barely covered. Treat 97% as an upper bound and test on real photos from the target phones.

**Evidence, version 2.** The head is now trained on TrashNet and RealWaste (UCI, CC BY 4.0: 4,752 real landfill photos, mapped to the six groups; food, vegetation and textile waste count as trash). Each dataset has its own held-out 20%.

| Head | TrashNet test (508) | RealWaste test (952, real photos) |
|---|---|---|
| Version 1, the head in the app before (TrashNet only) | 82% | 34% |
| Version 2, TrashNet plus RealWaste (shipped) | 79% | **82%** |
| RealWaste only | 47% | 83% |

Version 1 looked good on clean photos and failed on real ones. Version 2 keeps most of the clean-photo accuracy and makes real photos usable. On real photos, when version 2 is at least 70% sure, it answers 69% of photos and is right 91% of the time. Per class on real photos: cardboard 81%, glass 81%, metal 80%, paper 73%, plastic 72%, trash 91%.

Not used: a Kaggle dataset. Kaggle downloads need a personal API token, which is not set up on the build machine. The same pipeline accepts any folder of class-named photos, so a Kaggle set can be added later. The CLIP network itself is not fine-tuned, only the head on top of it. Full fine-tuning needs a GPU and a training stack that is not set up here.

**Evidence, version 1 (before).** The head was trained on 80% of the 2,527 TrashNet photos and tested on the other 20% (508 photos it had never seen).

| Method | Held-out TrashNet photos |
|---|---|
| Zero-shot TinyCLIP, matching the photo to text prompts | 49% |
| TinyCLIP plus the trained head | **82%** |

Accuracy depends on how sure the head is. This is why the app shows a suggestion as a question below 70%.

| When the head is at least | It answers | And is right |
|---|---|---|
| 50% sure | 93% of photos | 85% of the time |
| 70% sure | 75% of photos | 91% of the time |
| 90% sure | 51% of photos | 97% of the time |

Speed: about 35 ms per photo on a laptop CPU in Node, and 130 to 250 ms in a desktop browser. It has not yet been timed on a phone.

**Limits to say out loud.**
- TrashNet photos are clean pictures of single items on a plain background. Real loads are piles and bags, so real accuracy will be lower.
- A rough check on 36 web photos of recycling scenes gave 33% grouped accuracy for the head and 17% zero-shot. That set was mostly mislabelled, so treat it as a warning and not as a measurement.
- The model cannot tell PET from HDPE, and plastic is its weakest group (72% on TrashNet).
- It does not read the material code or the brand. It looks at how the load looks.
- Electronics is the weakest-tested group: see the care note under version 3.
- Photos of real loads, with consent and correct labels, are the way to improve it. See [tools/vision/README.md](../tools/vision/README.md).

**Mixed loads.** The scanner scores the whole photo and its four quarters (five passes). If a quarter is at least 70% sure of one material and another quarter is at least 85% sure of a different one, the app says "Looks like a mixed load", lists each material with its share, and tells the reclaimer to sort before weighing, because centres pay each material apart. When the whole photo is unsure but three quarters strongly agree, the quarters win.

Measured on 2x2 mosaics built only from held-out TrashNet photos (`tools/vision/mixed-test.mjs`, 120 single-material, 120 two-and-two and 80 three-and-one mosaics):

| Check | Result |
|---|---|
| Single-material loads wrongly called mixed | 8% |
| Two-and-two mixed loads: both materials found | 64% |
| Three-and-one mixed loads: both materials found | 64% |
| Single-material accuracy, whole photo only | 89% |
| Single-material accuracy with three agreeing quarters | 93% |

Stricter and looser rules were compared in the same run. A 70% rule for both materials found more mixes (76 to 78%) but called 17% of single loads mixed, which is too many false alarms. The mosaics line up with the quarters and real piles do not, so real results will be lower. Five passes took about 2 seconds in a desktop browser.

**Reproducing it.** The training and test scripts are in `tools/vision/`.

**QR codes.** The centre console reads reclaimer codes with the browser's built-in BarcodeDetector where it exists, and with jsQR (Apache-2.0) elsewhere, such as on iPhone. 18 of 18 QR images decode in the decoder check.

**Optional bigger model.** The vision prompt below, for a hosted vision model on OpenRouter, is kept as a design option. It is not used, because the on-device scanner replaces it.

## Models we left out on purpose

| Model | Why not |
|---|---|
| Meta MMS (speech and text to speech) | CC BY-NC 4.0 forbids commercial use |
| NLLB-200 (translation) | CC BY-NC 4.0 |
| InkubaLM | CC BY-NC 4.0 |

South African languages matter to the product, so these were the obvious candidates. We would have had to remove them the day we sell to a PRO.

## Free-tier limits

| Service | Limit | Effect on the product |
|---|---|---|
| OpenRouter free models | 20 requests per minute. 50 per day with fewer than 10 credits bought. 1,000 per day after about $10 of credits | Cache results by photo hash. Optional credit top-up during judging |
| Hugging Face ZeroGPU | Free accounts can host 2 Gradio Spaces, with 5 GPU minutes per day. Account must be 30 days old with a verified email | Speech is a stretch goal. Keep the Space warm only during judging |
| Hugging Face Spaces, CPU or Docker | Need a paid plan | Not used |
| Supabase free | 500 MB database, 1 GB storage, 2 active projects. Projects pause after 7 days of inactivity | Keep-alive ping every 6 hours |
| GitHub Actions | Free minutes for public and private repos within plan limits | Nightly jobs are short |

## Vision prompt contract

The vision model must return JSON only:

```text
system: You classify recyclables in a photo for South African buy-back centres.
Return only JSON: {"material": one of ["PET","HDPE","CAN_AL","CARDBOARD","PAPER_WHITE","GLASS","OTHER"],
                   "confidence": number 0 to 1, "notes": short string}
Rules: pick the material that makes up most of the load. If unsure, use "OTHER" with low confidence.
```

The server validates the reply with zod, caches it by photo hash, and gives up after 8 seconds. A confidence below 0.6 shows the suggestion as a question instead of a pre-selected answer.

## Forecast data

There is no public history of buy-back prices. The seed script builds 180 days of daily prices for each material and area, anchored on the 2026 reported prices. The app labels every forecast screen as demo data. Forecasts must not be presented as market data.

## Models used to build the product

The team used Claude models (Opus 5.5, Sonnet 5.5 and Haiku 5.5) as development tools, for research, planning, writing code and checks. Those models are not part of the product and are not called by it. See [AGENTS.md](AGENTS.md).

## Adding a model

1. Check the licence on the model card. Reject non-commercial licences.
2. Check the free-tier limit and the expected load per demo.
3. Add a row to the first table, with a fallback.
4. Write the fallback path before the model path.
5. Record the change in [BUILD_LOG.md](BUILD_LOG.md).

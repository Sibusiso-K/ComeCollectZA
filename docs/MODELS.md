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

**How it works.** TinyCLIP ViT-8M (a small image and text model, MIT licence) turns a photo into 512 numbers. A small neural network head (one hidden layer of 128, version 7), trained on public recycling and electronics photos, turns those into one of seven groups: cardboard, glass, metal, paper, plastic, trash and electronics. The app maps the groups to the materials it prices. Metal becomes cans, paper becomes white paper, and plastic stays ambiguous, so the reclaimer picks PET or HDPE. The reclaimer always confirms with a tap.

| Part | Size | Licence |
|---|---|---|
| `onnx-community/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX`, int8, pinned revision | 23.2 MB, served by the app from `/models/tinyclip/` and kept by the service worker | MIT |
| onnxruntime-web plain SIMD build | 14 MB, served from `/ort/` and kept by the service worker | MIT |
| `public/models/waste-head.json` (the head, version 7) | 104 KB, 72 KB compressed. The hidden layer is stored as 8-bit whole numbers | Ours, trained on MIT, CC BY 4.0, Apache-2.0 and openly licensed data |
| `@huggingface/transformers` 4.3.1 (runs the model) | Loaded on demand | Apache-2.0 |

**Works without data.** `tools/vision/fetch-assets.mjs` runs before every build. It copies the runtime from `node_modules` and downloads the model at a pinned revision, checked by SHA-256, into `public/` (git-ignored). The app never calls a CDN. The first scan downloads about 38 MB once; after that the service worker serves everything and scans work in flight mode. The tokenizer (5 MB) is not downloaded: the model's dummy text input is hard-coded as the four CLIP token ids for "a photo", checked against the real tokenizer. Verified with the server stopped: the sell page opened and a cardboard photo scanned at 100% in 714 ms.

**Independent check: the Kaggle e-waste set (24 Oct).** `akshat103/e-waste-image-dataset` (Apache-2.0 declared, 3,000 photos of 10 kinds of electronic item, collected by someone else from mixed sources) was used as photos the live head had never seen. Version 4 found **94.3%** of the 300 test photos as electronics: batteries, printers and televisions 100%, keyboards 97%, microwaves 97%, players 97%, mobile phones 90%, mice 90%, circuit boards 90%, washing machines 83%. Misses were mostly called plastic (8 of 17). About 3% of the test photos have a near-copy in the Kaggle training folders, so treat the figure as slightly generous. This is the fairest number we have for photos from outside our own sources.

A retrained version 5 (Kaggle train and val photos added) found 99.3% of the Kaggle test photos, but dropped to 94.6% on the Commons electronics photos (from 98.6%) and lost a little on recycling (TrashNet 77.4%, was 78.1%; RealWaste 81.4%, was 81.6%). It is not in the app: it did not meet the rule that recycling accuracy must not fall. `tools/vision/embed-kaggle.mjs` and `eval-kaggle.mjs` reproduce both steps.

**Evidence, version 7 (current, 25 Oct): a small neural network head, measured fairly.**

*First, a correction.* The public photo sets overlap. TrashBusters repackages TrashNet and others, and some photos appear in more than one set. Checked by the features TinyCLIP gives each photo (cosine 0.95 or more counts as the same photo), **71% of the TrashNet test photos and 52% of the real-world test photos have a near-copy among the training photos.** Every earlier figure in this file was measured with those copies in the test, so it is too generous. The figures below are not.

*How version 7 was made.* `tools/vision/train-mlp.py` (numpy only):

- **Training photos:** every training photo, minus 3,076 that are copies of a test photo. That leaves 28,267 for training and 3,331 for validation, again with copies removed.
- **Settings:** one hidden layer of 128, light dropout, and a little noise added to the features. They were chosen on the validation photos only, never on a test.
- **Temperature:** fitted on the validation photos too, so that "85% sure" means what it says.
- **Storage:** the hidden layer is stored as 8-bit whole numbers. The stored head agrees with the trained one on 99.97% of test photos.
- **App check:** the app's own scoring code (`lib/vision/head.ts`) gives the same accuracy as the Python script.

*Test photos that no head has seen a copy of:*

| Held-out check | v5 (was live) | v6 (PR 37, never shipped) | **v7 (live)** |
|---|---|---|---|
| TrashNet (125) | 62.4% | 61.6% | **62.4%** |
| RealWaste, real photos (621) | 76.2% | 75.7% | **77.5%** |
| TrashBusters recycling photos (999) | 67.3% | 71.5% | **86.3%** |
| Real-world photos only (188) | 60.6% | 66.5% | **79.8%** |
| Commons electronics found (353) | 92.4% | 90.9% | **92.1%** |
| Kaggle electronics found (260) | 99.2% | 98.5% | **99.2%** |
| Recyclables wrongly called electronics | 3.0% | 1.8% | **0.8%** |
| At the app's 70% bar: names a material, and is wrong | 71% named, **19.8% wrong** | 69%, 16.4% wrong | 73% named, **8.7% wrong** |
| At 85% sure | 54% named, 14.5% wrong | 50%, 11.4% wrong | 57% named, 4.8% wrong |

*In the real app.* `tools/stress/scan-app.mjs` scanned 90 unseen photos in headless Chrome: 70 real-world recycling photos and 20 electronics. It ran once with each head on the same photos.

| | v5 | v7 |
|---|---|---|
| Names the right material | 47% | **66%** |
| Names a wrong material | 29% | **7%** |
| Electronics caught | 100% named | 90% named, 10% asked |

The rest of the photos are a question with two choices, or "Not sure, pick the material". Speed is unchanged, about 0.5 s a scan on a laptop after the first. The head adds 0.16 ms a photo. Phones that already have the 38 MB model keep it: the app asks for the new head at a new address (`waste-head.json?v=7`), so only the 72 KB head downloads again.

The 70% bar stays where it is. With version 7 it is wrong about 1 time in 11 on photos it names, against 1 in 5 before.

**Evidence, version 5 (replaced 25 Oct): real household recycling photos added.** These figures include test photos with copies in training (see above). Version 4 looked fine on our own tests, so it was checked on photos it had never come near: 8,433 more recycling photos from TrashBusters/combined on Hugging Face (MIT; it joins three public datasets: Household Garbage, Garbage Classification V2 and TriCascade WasteImage, each declared MIT on its card; 1,989 are tagged real-world). Its TrashNet-sourced photos were left out, so the TrashNet test stays clean. On these, version 4 was weak:

- It got **35.7% right**, and only **22.9% of the real-world photos**.
- It called **46.7%** of these recyclables **electronics**. The electronics group had learned to take photos that look like household scenes.

Version 5 is trained on everything: TrashNet, RealWaste, the new recycling photos, the Commons electronics photos and the Kaggle e-waste photos. The TrashNet and RealWaste photos are weighted 6 times, because with equal weight the new photos pushed accuracy on those down by 4 to 6 points. Held-out photos (20% of each source and context, never trained on):

| Held-out check | Version 4 | Version 5 |
|---|---|---|
| TrashNet test (508) | 78.1% | 77.8% |
| RealWaste test (952, real photos) | 81.6% | **81.6%** |
| New recycling photos (1,696, three sources) | 35.7% | **71.2%** |
| New real-world photos only (401) | 22.9% | **61.8%** |
| New recyclables wrongly called electronics | 46.7% | **3.5%** |
| Commons electronics found (370) | 98.6% | 92.2% |
| Kaggle electronics found (300, independent) | 94.3% | **99.3%** |

Settings tried, all with the same data: no extra weight on the old photos gave 79% on the new photos but lost 4 to 6 points on TrashNet and RealWaste. A weight of 3 gave 75% and a 2 point loss. A weight of 6 keeps the old tests where they were, which is the rule that nothing already working may get worse. The cost is 6 points on the clean Commons electronics photos, which the Kaggle photos suggest is mostly picture style and not real loss.

**What this means.** Household and real-world recycling photos are still the hardest case (about 62%), and the app answers "Not sure" or "Could be" on many of them and asks the person to pick. That is the right behaviour for a 62% model. The next gain is more labelled photos of real loads from the people who will use the app. `tools/vision/extract-trashbusters.py`, `embed-trashbusters.mjs` and `eval-recyclables2.mjs` reproduce this.

**Evidence, version 4: lamps and appliances added.** Round 2 added 435 more Commons photos: refrigerators, washing machines, stoves, dishwashers and other large appliances (171 photos), and fluorescent tubes, energy-saving and LED bulbs (107 photos), plus some photos of electronics in everyday scenes. Training now uses 1,826 electronics photos.

The scenes group was tested and left out. A contact sheet showed about a third of it was off-topic (power pylons, historic photos, a whale), and training with it was slightly worse on real recycling photos (81.2% against 81.6%) and on unseen appliances (94.7% against 95.3%).

| Held-out check | Version 3 | Version 4 |
|---|---|---|
| TrashNet test (508) | 78.0% | 78.1% |
| RealWaste test (952, real photos) | 81.4% | 81.6% |
| Electronics test (370 photos, 20% of each kind held out) | 98.2% | **98.6%** |
| Recyclables wrongly called electronics (TrashNet, RealWaste) | 0.2%, 0.1% | 0.4%, 0.2% |
| Lamps found (version 3 never saw lamps, version 4 held out 20%) | 83.2% | 100% |
| Large appliances never seen in training | 95.3% | 95.3% |

**What this round did and did not do.** Version 3 already recognised fridges and washing machines it had never trained on (95.3%), so adding appliances did not improve that. The real gain is lamps, which matter because the electronics guide has advice for tubes and bulbs. The cost is a small rise in recyclables wrongly called electronics, from 0.2% to 0.4% on TrashNet.

**Evidence, version 3: electronics.** The head learned a seventh group, electronics, from 1,391 openly licensed photos from Wikimedia Commons (CC0, public domain, CC BY and CC BY-SA; every author and licence is in [ELECTRONICS_PHOTO_CREDITS.md](ELECTRONICS_PHOTO_CREDITS.md)). When the scanner sees electronics it does not ask for a material. It says electronics are not paid for by the kilogram and links to the electronics guide. Electronics never count as a material in a mixed load.

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

**Checked inside the app (24 Oct).** The head is trained on embeddings made in Node, while the app runs the model in the browser with a different runtime and its own image resizing. On 120 held-out photos the two agree (cosine 0.99), and the top guess is right 74.2% of the time in the app against 75.0% in training, also with photos enlarged to phone-camera size. So the app does not lose accuracy on the way. Two things changed in how the app runs the model: the screen stays responsive between the five passes, and a black or blank photo is refused before the model guesses. Details and the "Looks like" threshold trade-off are in [STRESS_TEST.md](STRESS_TEST.md).

**Demo photo check (25 Oct, head version 7).** Before recording the demo video, eight open-licence photos went through the live app with `tools/stress/scan-app.mjs`. PET bales and a sack of PET bottles: "Looks like Plastic", right both times. Three photos of aluminium cans in piles: once "Could be Plastic", once "Plastic", once "Not a recyclable we buy", so 0 of 3. A clean cardboard photo: unsure. A glass jar: "Could be electronics". Eight photos is a small check, not a new accuracy figure, but cans in a pile look like a weak spot to test with real loads. The manual material buttons under the scanner cover it, and the demo scans PET.

**QR codes.** The centre console reads reclaimer codes with the browser's built-in BarcodeDetector where it exists, and with jsQR (Apache-2.0) elsewhere, such as on iPhone. 18 of 18 QR images decode in the decoder check.

**Optional bigger model.** The vision prompt below, for a hosted vision model on OpenRouter, is kept as a design option. It is not used, because the on-device scanner replaces it.

## Sell-or-wait advice and the earnings forecast

Two small pieces of intelligence that need no model, no server and no paid service. Both are plain rules in [lib/app/advice.ts](../lib/app/advice.ts), checked by `npm run test:app`, and both screens say that they are estimates.

**Sell now or wait (sell screen, once a material and centre are chosen).** The advice looks at the chosen centre's board price and answers in this order:

1. **A better centre.** If another centre pays at least 10% more for the material, it says "Compare first" and names the centre and its price.
2. **A falling market.** If a source reports that the price fell by 15% or more in 2026, it says "Sell now". Only PET (R7 to R3.50/kg, about 50%) and cans (R14 to R10/kg, about 29%) have a reported fall, from the Sunday Times (Sep 2026). Nothing is guessed for the other materials.
3. **Where the price sits in the usual range.** Above two thirds of the public 2026 range it says "Sell now". Below one third it says "Hold if you can". Between, "Fair price".

It is not a forecast of tomorrow's price. There is no public price history to train one on: the board holds one price per centre and material, and the app has not run long enough to build a history. The screen says "From today's centre prices and public 2026 prices. Not a promise of tomorrow's price."

**Next 30 days (My money).** From the person's own sales in the last 28 days: the pay per day since their first sale in that window, times 30, with a range of plus or minus a quarter. It needs at least 3 sales that span at least 7 days, so one sale never produces a forecast. Until then the card says "After 3 sales over a week, we show what you may earn in the next 30 days." It is labelled "Estimate".

**What would make it a model.** Once centres have posted prices for a few weeks, a seasonal or trend model on the board history could replace rule 3, and the forecast could use each person's weekday pattern. Both are future work.

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

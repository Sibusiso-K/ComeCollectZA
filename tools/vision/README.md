# Vision tools

Scripts that built and checked the on-device material scanner. They are not part of the app and are not run in CI. Everything here can be reproduced on a laptop in a few minutes.

## What the scanner is

TinyCLIP ViT-8M (MIT, int8, about 23 MB) turns a photo into 512 numbers. A small linear head turns those numbers into one of six groups: cardboard, glass, metal, paper, plastic, trash. The head is `public/models/waste-head.json` (30 KB). See [docs/MODELS.md](../../docs/MODELS.md) for results and limits.

## Reproduce the head

Use a separate folder so the app's dependencies stay clean.

```bash
mkdir vision-work && cd vision-work
cp ../tools/vision/*.mjs .
npm init -y
npm install @huggingface/transformers qrcode jsqr
```

1. **TrashNet photos (MIT).** Download `data/dataset-resized.zip` from https://github.com/garythung/trashnet and unzip it to `./trashnet/dataset-resized/` (six class folders).
2. **Extract features.** `node embed.mjs` runs TinyCLIP on every photo and writes `emb_trashnet.json`, `emb_wild.json` and `emb_text.json`. About 85 seconds on a laptop CPU.
3. **Train and evaluate.** `node train.mjs` trains the head on 80% of the photos, reports accuracy on the other 20%, and writes `head.json`.
4. **Export.** `node export-head.mjs ../public/models/waste-head.json` writes the rounded head the app loads.

`fetch-images.mjs` and `bench.mjs` are the first experiment: zero-shot matching against a small, noisy set of Wikimedia Commons photos. Keep them for comparison, but do not trust that set. Many of its labels are wrong.

`qr-test.mjs` checks that jsQR decodes the QR codes the app shows, at several sizes and colours.

## Improving the head

The head was trained on TrashNet, which has clean photos of single items. Real loads are piles and bags, so real accuracy will be lower. The way to improve it:

1. Collect photos of real loads with the right material label, with the reclaimer's consent.
2. Run `embed.mjs` on them and add them to the training set.
3. Retrain, check accuracy on a held-out set of real photos, and export a new `waste-head.json`.

Bump `version` in the exported file when you change it.

## Version 2: add real photos (RealWaste)

1. Download RealWaste from https://archive.ics.uci.edu/dataset/908/realwaste (CC BY 4.0) and unzip it. The class folders are under `realwaste-main/RealWaste/`.
2. `node embed-realwaste.mjs <path to RealWaste folder> emb_realwaste.json` embeds every photo with the app's model. About 5 minutes on a laptop CPU.
3. `node train2.mjs C` compares four heads on held-out photos and writes `head-v2.json` for the combined head.
4. `node export-v2.mjs ../public/models/waste-head.json` writes the head the app loads. Bump `version` when you change it.

A Kaggle dataset works the same way: unzip it so each class has its own folder, map its class names to the six groups in `embed-realwaste.mjs`, then run steps 2 to 4.

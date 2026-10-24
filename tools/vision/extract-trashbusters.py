"""Unpack TrashBusters/combined (MIT) parquet files into folders of photos, one folder per original source.

Photos whose source is TrashNet are skipped: our held-out TrashNet test photos come from the same set, and we keep
that test clean. Writes manifest.json with the source, original label, context and split of every photo.
Usage: python extract.py <folder with the parquet files> <output folder>
"""
import json
import os
import sys

import pyarrow.parquet as pq

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
manifest = []
counts = {}
for name in sorted(os.listdir(src)):
    if not name.endswith(".parquet"):
        continue
    split = name.split("-")[0]
    pf = pq.ParquetFile(os.path.join(src, name))
    for batch in pf.iter_batches(batch_size=64):
        for row in batch.to_pylist():
            source = row["source_dataset"]
            if "trashnet" in source.lower():
                continue
            label = row["label_name"]
            img = row["image"]
            data = img["bytes"] if isinstance(img, dict) else None
            if not data:
                continue
            key = (source, label)
            counts[key] = counts.get(key, 0) + 1
            folder = os.path.join(out, source, label)
            os.makedirs(folder, exist_ok=True)
            ext = ".png" if data[:4] == b"\x89PNG" else ".jpg"
            fname = f"{split}-{counts[key]:05d}{ext}"
            with open(os.path.join(folder, fname), "wb") as f:
                f.write(data)
            manifest.append({
                "file": f"{source}/{label}/{fname}",
                "source": source,
                "label": label,
                "original": row.get("original_label"),
                "context": row.get("image_context"),
                "split": split,
            })
    print("done", name, len(manifest), flush=True)
with open(os.path.join(out, "manifest.json"), "w") as f:
    json.dump(manifest, f)
by_source = {}
for m in manifest:
    by_source.setdefault(m["source"], {}).setdefault(m["label"], 0)
    by_source[m["source"]][m["label"]] += 1
print(json.dumps(by_source, indent=1))

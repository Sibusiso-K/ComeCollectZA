// Downloads a few freely licensed test photos per material from Wikimedia Commons. For model testing only.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";

const UA = "ComeCollectZA-model-test/1.0 (hackathon project; contact ksibusiso023@gmail.com)";
const queries = {
  CAN_AL: ["aluminium cans recycling", "crushed aluminum cans", "aluminum can bale"],
  PET: ["plastic bottles recycling", "PET bottle bale", "crushed plastic bottles"],
  CARDBOARD: ["cardboard recycling bale", "flattened cardboard boxes", "corrugated cardboard waste"],
  GLASS: ["glass bottles recycling", "glass bottle bank", "broken glass cullet"],
  PAPER_WHITE: ["waste paper recycling bale", "waste paper pile", "paper recycling"],
  HDPE: ["HDPE plastic recycling", "milk jugs recycling", "plastic containers recycling bale"],
};

async function search(q) {
  const url = "https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({
    action: "query", format: "json", generator: "search", gsrnamespace: "6", gsrlimit: "10", gsrsearch: q,
    prop: "imageinfo", iiprop: "url|mime|extmetadata", iiurlwidth: "512", origin: "*",
  });
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const data = await res.json();
  return Object.values(data.query?.pages ?? {}).map((p) => p.imageinfo?.[0]).filter(Boolean);
}

const out = new URL("./images/", import.meta.url);
mkdirSync(out, { recursive: true });
const manifest = [];
for (const [material, qs] of Object.entries(queries)) {
  let n = 0;
  for (const q of qs) {
    if (n >= 6) break;
    for (const info of await search(q)) {
      if (n >= 6) break;
      if (!/^image\/(jpeg|png)$/.test(info.mime) || !info.thumburl) continue;
      const license = info.extmetadata?.LicenseShortName?.value ?? "";
      if (!/CC|public domain|PD/i.test(license)) continue;
      const file = `${material}_${n}.jpg`;
      const path = new URL(file, out);
      if (!existsSync(path)) {
        const r = await fetch(info.thumburl, { headers: { "User-Agent": UA } });
        if (!r.ok) continue;
        writeFileSync(path, Buffer.from(await r.arrayBuffer()));
        await new Promise((r) => setTimeout(r, 400));
      }
      manifest.push({ file, material, license, source: info.descriptionurl });
      n++;
    }
  }
  console.log(material, n);
}
writeFileSync(new URL("./manifest.json", import.meta.url), JSON.stringify(manifest, null, 2));
console.log("total", manifest.length);

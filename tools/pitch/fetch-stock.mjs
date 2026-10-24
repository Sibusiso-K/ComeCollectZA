import { writeFileSync, mkdirSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
const UA = "ComeCollectZA-hackathon/1.0 (https://github.com/Sibusiso-K/ComeCollectZA)";
const Q = [
  ["picker", "waste picker Johannesburg"], ["picker", "waste pickers South Africa trolley"], ["picker", "reclaimer recycling bags trolley"],
  ["picker", "waste picker"], ["landfill", "landfill waste pickers"], ["pile", "plastic bottles pile recycling"],
  ["pile", "aluminium cans recycling pile"], ["pile", "cardboard bales recycling"], ["pile", "recycling sorting plastic bottles"],
  ["street", "illegal dumping South Africa"], ["street", "litter street rubbish bags"], ["ewaste", "electronic waste pile"],
];
const OK = /^(cc0|public domain|pd|cc by(-sa)? \d(\.\d)?)/i;
const out = [];
const seen = new Set();
for (const [g, q] of Q) {
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  Object.entries({ action: "query", format: "json", formatversion: "2", generator: "search", gsrnamespace: "6", gsrsearch: q + " filetype:bitmap", gsrlimit: "12", prop: "imageinfo", iiprop: "url|mime|extmetadata|size", iiurlwidth: "1920" }).forEach(([k, v]) => u.searchParams.set(k, v));
  const j = await (await fetch(u, { headers: { "User-Agent": UA } })).json();
  for (const p of j.query?.pages ?? []) {
    const ii = p.imageinfo?.[0]; const md = ii?.extmetadata ?? {};
    const lic = (md.LicenseShortName?.value ?? "").trim();
    if (!ii || ii.mime !== "image/jpeg" || !OK.test(lic) || seen.has(p.title) || (ii.width ?? 0) < 1200) continue;
    seen.add(p.title);
    const file = `${g}-${p.pageid}.jpg`;
    const r = await fetch(ii.thumburl, { headers: { "User-Agent": UA } }); if (!r.ok) continue;
    writeFileSync(`stock/${file}`, Buffer.from(await r.arrayBuffer()));
    out.push({ file, g, q, title: p.title, page: ii.descriptionurl, licence: lic, artist: (md.Artist?.value ?? "").replace(/<[^>]+>/g, "").trim().slice(0, 100) });
    await sleep(150);
  }
  console.log(q, out.length);
}
writeFileSync("stock/manifest.json", JSON.stringify(out, null, 1));

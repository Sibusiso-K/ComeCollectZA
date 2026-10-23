// Downloads openly licensed photos of electronics from Wikimedia Commons, for the scanner's "electronics" group.
// Every file's licence, author and page are kept in electronics/manifest.json. Only CC0, public domain, CC BY and
// CC BY-SA files are kept. Usage: node fetch-electronics.mjs [per-query limit]
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const UA = "ComeCollectZA-hackathon/1.0 (https://github.com/Sibusiso-K/ComeCollectZA)";
const OUT = new URL("./electronics/", import.meta.url);
const LIMIT = Number(process.argv[2] ?? 50);

// Each query is a kind of item people want to get rid of. "pile" queries are real e-waste heaps.
const QUERIES = [
  ["phone", "old mobile phone"],
  ["phone", "broken smartphone"],
  ["phone", "Nokia mobile phone"],
  ["phone", "feature phone"],
  ["computer", "laptop computer"],
  ["computer", "old laptop"],
  ["computer", "desktop computer tower"],
  ["computer", "computer keyboard"],
  ["computer", "computer mouse"],
  ["computer", "hard disk drive"],
  ["board", "printed circuit board"],
  ["board", "motherboard"],
  ["tv", "CRT television"],
  ["tv", "old television set"],
  ["tv", "computer monitor"],
  ["tv", "flat screen television"],
  ["printer", "inkjet printer"],
  ["printer", "laser printer"],
  ["cables", "phone charger"],
  ["cables", "power adapter"],
  ["cables", "tangle of cables"],
  ["battery", "AA batteries"],
  ["battery", "used batteries"],
  ["battery", "lithium ion battery pack"],
  ["small", "electric kettle"],
  ["small", "microwave oven kitchen"],
  ["small", "toaster"],
  ["small", "hair dryer"],
  ["small", "remote control"],
  ["small", "radio receiver"],
  ["small", "DVD player"],
  ["pile", "electronic waste"],
  ["pile", "e-waste recycling"],
  ["pile", "discarded electronics"],
  ["pile", "e-waste dump"],
];

const ALLOWED = /^(cc0|public domain|pd|cc by(-sa)? \d(\.\d)?|cc by(-sa)?( \d\.\d)?)/i;

async function api(params) {
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  for (const [k, v] of Object.entries({ format: "json", formatversion: "2", origin: "*", ...params })) u.searchParams.set(k, v);
  for (let tries = 0; tries < 4; tries++) {
    const r = await fetch(u, { headers: { "User-Agent": UA } });
    if (r.ok) return r.json();
    await sleep(2000 * (tries + 1));
  }
  throw new Error("Commons API failed");
}

mkdirSync(fileURLToPath(OUT), { recursive: true });
const seen = new Set();
const manifest = [];
for (const [group, q] of QUERIES) {
  const data = await api({
    action: "query",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: `${q} filetype:bitmap`,
    gsrlimit: String(LIMIT),
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "320",
  });
  let kept = 0;
  for (const p of data.query?.pages ?? []) {
    const ii = p.imageinfo?.[0];
    if (!ii || ii.mime !== "image/jpeg" || seen.has(p.title)) continue;
    const md = ii.extmetadata ?? {};
    const licence = (md.LicenseShortName?.value ?? "").trim();
    if (!ALLOWED.test(licence)) continue;
    seen.add(p.title);
    const file = `${group}-${p.pageid}.jpg`;
    const path = join(fileURLToPath(OUT), file);
    if (!existsSync(path)) {
      const r = await fetch(ii.thumburl, { headers: { "User-Agent": UA } });
      if (!r.ok) continue;
      writeFileSync(path, Buffer.from(await r.arrayBuffer()));
      await sleep(150);
    }
    const artist = (md.Artist?.value ?? "").replace(/<[^>]+>/g, "").trim().slice(0, 120);
    manifest.push({ file, group, query: q, title: p.title, page: ii.descriptionurl, licence, artist });
    kept++;
  }
  console.log(q.padEnd(28), kept);
  await sleep(500);
}
writeFileSync(new URL("./electronics/manifest.json", import.meta.url), JSON.stringify(manifest, null, 1));
console.log("kept", manifest.length, "files");

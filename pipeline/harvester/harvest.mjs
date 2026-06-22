// Browser-driven harvest of Activate's companies directory.
//
// The Softr data proxy ignores offset for direct API calls, but the real app
// paginates correctly. So we drive the actual app in headless Chrome, intercept
// every /data response, and scroll / click "load more" until the record set
// stops growing. Output: data/processed/00_airtable_raw.json
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const APP = "https://activate-companies.softr.app/";
const OUT = new URL("../../data/processed/00_airtable_raw.json", import.meta.url);

const byId = new Map();

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1400 });

page.on("response", async (res) => {
  if (!res.url().includes("/datasource/airtable/") || !res.url().endsWith("/data")) return;
  try {
    const json = await res.json();
    for (const r of json.records ?? []) byId.set(r.id, r);
  } catch {}
});

console.log("loading app...");
await page.goto(APP, { waitUntil: "networkidle2", timeout: 60000 });

// Scroll + click "load more" until the record count stabilizes.
let stable = 0;
for (let i = 0; i < 60 && stable < 4; i++) {
  const before = byId.size;
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  // Click any visible "load more" / "show more" button.
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button, a")].find((b) =>
      /load more|show more|view more|more/i.test(b.textContent || ""));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 1200));
  const after = byId.size;
  console.log(`  iter ${i}: ${after} records`);
  stable = after === before ? stable + 1 : 0;
}

await browser.close();
const records = [...byId.values()];
writeFileSync(OUT, JSON.stringify(records, null, 2));
console.log(`\nHarvested ${records.length} unique records -> ${OUT.pathname}`);
const years = {};
for (const r of records) {
  const y = r.fields?.["Cohort Year"] ?? "—";
  years[y] = (years[y] || 0) + 1;
}
console.log("by year:", years);

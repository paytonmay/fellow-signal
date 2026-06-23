// Harvest Activate's authoritative Fellows table (Softr app over the same
// Airtable base as Companies, table "Fellows"). Richer per-fellow data:
// Full Name, Biography (education/background), Cohort, Community, Fellow Company,
// Company Verticals, LinkedIn, Twitter. Intercept /data responses while scrolling.
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const APP = "https://nathanael7947.softr.app/";
const OUT = new URL("../../data/processed/00_fellows_raw.json", import.meta.url);

const byId = new Map();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1400 });
page.on("response", async (res) => {
  if (!res.url().includes("/datasource/airtable/") || !res.url().endsWith("/data")) return;
  try { for (const r of (await res.json()).records ?? []) byId.set(r.id, r); } catch {}
});

console.log("loading fellows app...");
await page.goto(APP, { waitUntil: "networkidle2", timeout: 60000 });

let stable = 0;
for (let i = 0; i < 80 && stable < 4; i++) {
  const before = byId.size;
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button, a")].find((b) => /load more|show more|view more|more/i.test(b.textContent || ""));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 1200));
  console.log(`  iter ${i}: ${byId.size}`);
  stable = byId.size === before ? stable + 1 : 0;
}
await browser.close();

const records = [...byId.values()];
writeFileSync(OUT, JSON.stringify(records, null, 2));
console.log(`\nHarvested ${records.length} fellows -> ${OUT.pathname}`);
if (records[0]) console.log("fields:", Object.keys(records[0].fields));

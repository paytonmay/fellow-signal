import puppeteer from "/Users/paytonmay/activate/pipeline/harvester/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js";
import { writeFileSync } from "node:fs";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args:["--no-sandbox"] });
const p = await b.newPage();
await p.goto("https://www.engine.xyz/companies", {waitUntil:"networkidle2", timeout:60000});
await new Promise(r=>setTimeout(r,1500));
const cos = await p.evaluate(() => {
  return [...document.querySelectorAll('[data-industries]')].map(el => {
    const inds = el.getAttribute('data-industries');
    // company name: an alt text on img, or aria-label, or heading text
    const img = el.querySelector('img');
    const name = (el.getAttribute('aria-label') || img?.getAttribute('alt') ||
                  el.querySelector('h1,h2,h3,h4')?.textContent || el.textContent || '').trim().split('\n')[0].trim();
    return { name, industries: inds.split(',').map(s=>s.trim()).filter(Boolean) };
  }).filter(c => c.name);
});
await b.close();
writeFileSync("/tmp/engine_cos.json", JSON.stringify(cos,null,2));
console.log(`extracted ${cos.length} companies`);
const indFreq={}; cos.forEach(c=>c.industries.forEach(i=>indFreq[i]=(indFreq[i]||0)+1));
console.log("industries:", JSON.stringify(indFreq,null,0));
console.log("sample:", cos.slice(0,5).map(c=>c.name+" ["+c.industries.join("|")+"]").join("\n  "));

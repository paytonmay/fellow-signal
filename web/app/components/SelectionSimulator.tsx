"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Dataset, verticalColor } from "@/lib/data";

// Selection Simulator (see docs/selection-simulator-proposal.md).
// A SYNTHETIC field of candidate-like profiles drawn from selected-fellow and
// field-signal priors (NOT applicant data). 1,000 dots clustered by sector;
// weights + levers reshape which ~50 get picked. The point: there is no objective
// best 50, only a strategy made explicit. Composition is portfolio construction.

const N = 1000;
const FEDCAP = 40;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

type Weights = { research: number; funding: number; depth: number; whitespace: number };
type Cand = {
  i: number; sector: string; si: number; hub: string;
  researchN: number; fundingN: number; whitespaceN: number; presence: number;
  cite: number; depthPct: number; x: number; y: number; score: number;
};

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick(rng: () => number, cum: number[], total: number) {
  const r = rng() * total;
  for (let i = 0; i < cum.length; i++) if (r < cum[i]) return i;
  return cum.length - 1;
}
function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
const COLS = 4, ROWS = 4;
const shortLabel = (v: string) => v.replace(" / CO2e", "").split(/ & | \/ /)[0];

type Config = { w: Weights; size: number; leanSector: string; leanStrength: number; cap: number; breadth: number };
const BASE: Config = { w: { research: 60, funding: 45, depth: 50, whitespace: 30 }, size: 50, leanSector: "", leanStrength: 50, cap: 100, breadth: 0 };
const PRESETS: Record<string, Config> = {
  "Balanced": { w: { research: 50, funding: 50, depth: 50, whitespace: 40 }, size: 50, leanSector: "", leanStrength: 50, cap: 100, breadth: 0 },
  "Climate-forward": { w: { research: 55, funding: 60, depth: 40, whitespace: 35 }, size: 50, leanSector: "Climate", leanStrength: 50, cap: 100, breadth: 1 },
  "Frontier bets": { w: { research: 70, funding: 55, depth: 25, whitespace: 90 }, size: 50, leanSector: "", leanStrength: 50, cap: 100, breadth: 0 },
  "Research depth": { w: { research: 40, funding: 30, depth: 95, whitespace: 20 }, size: 50, leanSector: "", leanStrength: 50, cap: 100, breadth: 0 },
  "Comprehensive": { w: { research: 55, funding: 50, depth: 55, whitespace: 35 }, size: 50, leanSector: "", leanStrength: 50, cap: 22, breadth: 2 },
  "Broad & diverse": { w: { research: 50, funding: 50, depth: 50, whitespace: 45 }, size: 50, leanSector: "", leanStrength: 50, cap: 16, breadth: 1 },
};

function toQuery(c: Config, sectors: string[]): string {
  const p = new URLSearchParams();
  p.set("w", [c.w.research, c.w.funding, c.w.depth, c.w.whitespace].join(","));
  p.set("n", String(c.size)); p.set("cap", String(c.cap)); p.set("br", String(c.breadth));
  if (c.leanSector) { p.set("ls", String(sectors.indexOf(c.leanSector))); p.set("lst", String(c.leanStrength)); }
  return p.toString();
}
function fromQuery(q: string, sectors: string[]): Config | null {
  const p = new URLSearchParams(q);
  const ws = (p.get("w") || "").split(",").map(Number);
  if (ws.length !== 4 || ws.some((n) => Number.isNaN(n))) return null;
  const lsI = p.has("ls") ? +(p.get("ls") as string) : -1;
  return {
    w: { research: clamp(ws[0], 0, 100), funding: clamp(ws[1], 0, 100), depth: clamp(ws[2], 0, 100), whitespace: clamp(ws[3], 0, 100) },
    size: clamp(+(p.get("n") || 50), 30, 70), cap: clamp(+(p.get("cap") || 100), 10, 100), breadth: clamp(+(p.get("br") || 0), 0, 3),
    leanSector: lsI >= 0 && lsI < sectors.length ? sectors[lsI] : "", leanStrength: clamp(+(p.get("lst") || 50), 0, 100),
  };
}

export default function SelectionSimulator({ data }: { data: Dataset }) {
  const sectorNames = useMemo(() => data.verticals.map((v) => v.vertical), [data]);
  const [cfg, setCfg] = useState<Config>(BASE);
  const { w, size, leanSector, leanStrength, cap, breadth } = cfg;
  const set = (patch: Partial<Config>) => setCfg((p) => ({ ...p, ...patch }));
  const [hovered, setHovered] = useState<Cand | null>(null);
  const [copied, setCopied] = useState(false);

  // read shareable state from the URL on mount; mirror it back on change
  useEffect(() => { const c = fromQuery(window.location.search, sectorNames); if (c) setCfg(c); }, [sectorNames]);
  useEffect(() => {
    const q = toQuery(cfg, sectorNames);
    window.history.replaceState(null, "", `${window.location.pathname}?${q}`);
  }, [cfg, sectorNames]);

  // ---- generate the synthetic field once, from real priors ----
  const field = useMemo(() => {
    const rng = mulberry32(20260624);
    const sectors = data.verticals.map((v) => v.vertical);
    const sw = data.verticals.map((v) => v.count);
    const swTot = sw.reduce((a, b) => a + b, 0);
    const swCum: number[] = []; let a1 = 0; for (const x of sw) { a1 += x; swCum.push(a1); }
    const radarB = Object.fromEntries(data.radar.map((r) => [r.vertical, r]));
    const spaceB = Object.fromEntries(data.space_signals.spaces.map((s) => [s.vertical, s]));
    const maxFM = Math.max(...data.radar.map((r) => r.field_momentum), 1);
    const maxFed = Math.max(...data.space_signals.spaces.map((s) => Math.min(s.federal_momentum, FEDCAP)), 1);
    const maxPres = Math.max(...data.radar.map((r) => r.activate_presence_recent), 0.0001);
    const hubs = data.hub_atlas.hubs;
    const hubCnt = hubs.map((h) => data.companies.filter((c) => c.hub && c.hub.includes(h)).length);
    const hubTot = hubCnt.reduce((a, b) => a + b, 0) || 1;
    const hubCum: number[] = []; let a2 = 0; for (const x of hubCnt) { a2 += x; hubCum.push(a2); }
    const cites = data.companies.flatMap((c) =>
      (c.founders ?? []).filter((f) => f.resolved && (f.cited_by_count ?? 0) > 0).map((f) => f.cited_by_count as number));

    const cand: Cand[] = [];
    for (let i = 0; i < N; i++) {
      const si = pick(rng, swCum, swTot);
      const sector = sectors[si];
      const r = radarB[sector], s = spaceB[sector];
      const presence = r ? r.activate_presence_recent : 0;
      const hi = pick(rng, hubCum, hubTot);
      const col = si % COLS, row = Math.floor(si / COLS);
      const gx = (rng() + rng() + rng() - 1.5) / 1.5, gy = (rng() + rng() + rng() - 1.5) / 1.5;
      const x = Math.min(0.985, Math.max(0.015, (col + 0.5) / COLS + gx * 0.085));
      const y = Math.min(0.97, Math.max(0.03, (row + 0.5) / ROWS + gy * 0.085));
      cand.push({
        i, si, sector, hub: hubs[hi],
        researchN: r ? r.field_momentum / maxFM : 0, fundingN: s ? Math.min(s.federal_momentum, FEDCAP) / maxFed : 0,
        whitespaceN: 1 - presence / maxPres, presence, cite: cites.length ? cites[Math.floor(rng() * cites.length)] : 0,
        depthPct: 0, x, y, score: 0,
      });
    }
    [...cand].sort((a, b) => a.cite - b.cite).forEach((c, idx) => { c.depthPct = idx / (N - 1); });
    return { cand, sectors };
  }, [data]);

  // ---- score + pick the cohort (sector lean, breadth floor, diversity cap) ----
  const { sel, nearMiss } = useMemo(() => {
    const sum = w.research + w.funding + w.depth + w.whitespace || 1;
    field.cand.forEach((c) => {
      let s = (w.research * c.researchN + w.funding * c.fundingN + w.depth * c.depthPct + w.whitespace * c.whitespaceN) / sum;
      if (leanSector && c.sector === leanSector) s += leanStrength / 200; // softened (max +0.5)
      c.score = s;
    });
    const sorted = [...field.cand].sort((a, b) => b.score - a.score);
    const capN = cap >= 100 ? Infinity : Math.max(1, Math.ceil((cap / 100) * size));
    const per: Record<string, number> = {};
    const out = new Set<number>();
    if (breadth > 0) {
      const got: Record<string, number> = {};
      for (const c of sorted) {
        if (out.size >= size) break;
        if ((got[c.sector] || 0) >= breadth || (per[c.sector] || 0) >= capN) continue;
        got[c.sector] = (got[c.sector] || 0) + 1; per[c.sector] = (per[c.sector] || 0) + 1; out.add(c.i);
      }
    }
    for (const c of sorted) {
      if (out.size >= size) break;
      if (out.has(c.i) || (per[c.sector] || 0) >= capN) continue;
      per[c.sector] = (per[c.sector] || 0) + 1; out.add(c.i);
    }
    const nm = sorted[Math.min(sorted.length - 1, Math.floor(size * 1.25))]?.score ?? 0;
    return { sel: out, nearMiss: nm };
  }, [w, size, leanSector, leanStrength, cap, breadth, field]);

  const statusOf = (c: Cand) => sel.has(c.i) ? "selected" : c.score >= nearMiss ? "just missed" : "not selected";

  // ---- who changed: counts AND sector-level swap ----
  const prevSel = useRef<Set<number>>(new Set());
  const prevSec = useRef<Record<string, number>>({});
  const [diff, setDiff] = useState<{ inN: number; outN: number; up: [string, number][]; down: [string, number][] }>({ inN: 0, outN: 0, up: [], down: [] });
  useEffect(() => {
    const cur: Record<string, number> = {};
    field.cand.forEach((c) => { if (sel.has(c.i)) cur[c.sector] = (cur[c.sector] || 0) + 1; });
    const keys = new Set([...Object.keys(cur), ...Object.keys(prevSec.current)]);
    const deltas = [...keys].map((s) => [s, (cur[s] || 0) - (prevSec.current[s] || 0)] as [string, number]).filter((d) => d[1] !== 0);
    let inN = 0, outN = 0;
    sel.forEach((i) => { if (!prevSel.current.has(i)) inN++; });
    prevSel.current.forEach((i) => { if (!sel.has(i)) outN++; });
    setDiff({
      inN, outN,
      up: deltas.filter((d) => d[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 2),
      down: deltas.filter((d) => d[1] < 0).sort((a, b) => a[1] - b[1]).slice(0, 2),
    });
    prevSel.current = new Set(sel); prevSec.current = cur;
  }, [sel, field]);

  // ---- canvas ----
  const wrapRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [cw, setCw] = useState(720);
  useLayoutEffect(() => {
    const measure = () => setCw(wrapRef.current?.clientWidth || 720);
    measure(); window.addEventListener("resize", measure); return () => window.removeEventListener("resize", measure);
  }, []);
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const H = 440, W = cw, dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.font = "9px ui-sans-serif, system-ui"; ctx.textAlign = "center";
    field.sectors.forEach((s, si) => {
      const col = si % COLS, row = Math.floor(si / COLS);
      ctx.fillStyle = hexA(verticalColor(s), 0.32);
      ctx.fillText(shortLabel(s), ((col + 0.5) / COLS) * W, (row / ROWS) * H + 12);
    });
    for (const c of field.cand) { if (sel.has(c.i)) continue; ctx.beginPath(); ctx.arc(c.x * W, c.y * H, 1.9, 0, 6.2832); ctx.fillStyle = hexA(verticalColor(c.sector), 0.12); ctx.fill(); }
    for (const c of field.cand) {
      if (!sel.has(c.i)) continue;
      ctx.beginPath(); ctx.arc(c.x * W, c.y * H, 3.3, 0, 6.2832); ctx.fillStyle = verticalColor(c.sector); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 0.6; ctx.stroke();
    }
    if (hovered) { ctx.beginPath(); ctx.arc(hovered.x * W, hovered.y * H, 6.5, 0, 6.2832); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.4; ctx.stroke(); }
  }, [sel, field, cw, hovered]);

  const onMove = (e: React.MouseEvent) => {
    const cv = cvRef.current; if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let best: Cand | null = null, bestD = 81;
    for (const c of field.cand) { const dx = c.x * cw - mx, dy = c.y * 440 - my, d = dx * dx + dy * dy; if (d < bestD) { bestD = d; best = c; } }
    if (best?.i !== hovered?.i) setHovered(best);
  };

  // ---- portfolio composition ----
  const comp = useMemo(() => {
    const s = field.cand.filter((c) => sel.has(c.i));
    const bySector: Record<string, number> = {}, byHub: Record<string, number> = {};
    s.forEach((c) => { bySector[c.sector] = (bySector[c.sector] || 0) + 1; byHub[c.hub] = (byHub[c.hub] || 0) + 1; });
    const sectorRank = Object.entries(bySector).sort((a, b) => b[1] - a[1]);
    const hubRank = Object.entries(byHub).sort((a, b) => b[1] - a[1]);
    const whitespace = s.filter((c) => c.presence < 0.12).length;
    const topShare = sectorRank.length ? sectorRank[0][1] / (s.length || 1) : 0;
    const topHubShare = hubRank.length ? hubRank[0][1] / (s.length || 1) : 0;
    const medDepth = s.length ? [...s].sort((a, b) => a.depthPct - b.depthPct)[Math.floor(s.length / 2)].depthPct : 0;
    return { sectorRank, hubRank, whitespace, topShare, topHubShare, medDepth, n: s.length };
  }, [sel, field]);

  const depthDominant = w.depth >= 70 && w.depth > w.research && w.depth > w.funding && w.depth > w.whitespace;

  const sliders: [keyof Weights, string, string][] = [
    ["research", "Research momentum", "favor fields whose science is accelerating"],
    ["funding", "Funding momentum", "favor fields where federal money is accelerating"],
    ["depth", "Founder research depth", "favor deeper, more-cited founders (percentile-ranked)"],
    ["whitespace", "Whitespace / frontier", "favor fields Activate is barely in yet"],
  ];
  const swap = (arr: [string, number][], sign: string) => arr.map(([s, n]) => `${sign}${Math.abs(n)} ${shortLabel(s)}`).join(", ");

  return (
    <div>
      <div className="panel p-3 mb-4 border-l-2 border-l-amber-500/50">
        <div className="text-[11.5px] text-zinc-300">
          Illustrative model. A <span className="text-amber-300">synthetic field of ~1,000 candidate-like profiles</span>,
          drawn from selected-fellow and field-signal priors, to show how a selection strategy shapes a cohort.
        </div>
        <div className="text-[11px] text-zinc-600 mt-1">
          Not real applicant data, and it does not estimate applicant quality or selection probability, we don&apos;t have
          the applicant pool. Profiles are built from <span className="text-zinc-400">accepted</span> fellows and public
          field signals as a stand-in; sectors are sampled from Activate&apos;s vertical-mention counts, not unique primary sectors.
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[11.5px] text-zinc-500 mr-1">Try a strategy:</span>
        {Object.keys(PRESETS).map((name) => (
          <button key={name} onClick={() => setCfg(PRESETS[name])}
            className="text-[11.5px] rounded-full px-3 py-1 border border-[#1d2128] bg-[#0e1014] text-zinc-300 hover:border-teal-500/50 hover:text-teal-200 transition">{name}</button>
        ))}
        <button onClick={() => setCfg(BASE)} className="text-[11px] text-zinc-600 hover:text-zinc-300 px-1">reset</button>
        <button onClick={() => { navigator.clipboard?.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="ml-auto text-[11px] text-teal-300/90 hover:text-teal-200 border border-teal-500/30 rounded-full px-2.5 py-1">{copied ? "link copied" : "copy share link"}</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[12.5px] text-zinc-300">1,000 candidate-like profiles, clustered by sector</span>
            <span className="text-[11px] text-zinc-500">
              <span className="inline-block w-2 h-2 rounded-full bg-zinc-200 mr-1 align-middle" />
              {comp.n} selected ({Math.round((comp.n / N) * 100)}%)
            </span>
          </div>
          <div ref={wrapRef} className="panel p-2">
            <canvas ref={cvRef} onMouseMove={onMove} onMouseLeave={() => setHovered(null)} style={{ width: "100%", height: 440, display: "block", cursor: "crosshair" }} />
          </div>
          {/* dot detail / swap delta strip */}
          <div className="mt-2 panel p-2.5 min-h-[58px]">
            {hovered ? (
              <div className="flex items-center gap-3 flex-wrap text-[11px]">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: verticalColor(hovered.sector) }} /><span className="text-zinc-200">{hovered.sector.replace(" / CO2e", "")}</span></span>
                <span className="text-zinc-500">{hovered.hub}</span>
                <span className="text-zinc-600">research {Math.round(hovered.researchN * 100)} · funding {Math.round(hovered.fundingN * 100)} · whitespace {Math.round(hovered.whitespaceN * 100)} · depth {Math.round(hovered.depthPct * 100)}</span>
                <span className="text-zinc-300">score {Math.round(hovered.score * 100)}</span>
                <span className={statusOf(hovered) === "selected" ? "text-teal-300" : statusOf(hovered) === "just missed" ? "text-amber-300" : "text-zinc-600"}>{statusOf(hovered)}</span>
              </div>
            ) : (diff.up.length || diff.down.length) ? (
              <div className="text-[11px]">
                <span className="text-zinc-500">Last change: </span>
                {diff.up.length > 0 && <span className="text-teal-300">{swap(diff.up, "+")}</span>}
                {diff.up.length > 0 && diff.down.length > 0 && <span className="text-zinc-600"> · </span>}
                {diff.down.length > 0 && <span className="text-zinc-400">{swap(diff.down, "-")}</span>}
                <span className="text-zinc-600"> ({diff.inN} in / {diff.outN} out)</span>
              </div>
            ) : (
              <div className="text-[11px] text-zinc-600">Hover a dot for its sector, hub, signal percentiles, score, and whether it made the cut. Drag a lever to see the swap here.</div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-[12.5px] font-medium text-zinc-200 mb-2">Signal weights</div>
            <div className="space-y-3">
              {sliders.map(([k, label, hint]) => (
                <div key={k}>
                  <div className="flex justify-between text-[11.5px]"><span className="text-zinc-300">{label}</span><span className="text-teal-300 tabular-nums">{w[k]}</span></div>
                  <input type="range" min={0} max={100} value={w[k]} onChange={(e) => set({ w: { ...w, [k]: +e.target.value } })} className="w-full accent-teal-400" />
                  <div className="text-[10px] text-zinc-600 -mt-0.5">{hint}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#15181e] pt-3">
            <div className="text-[12.5px] font-medium text-zinc-200">Experimental levers</div>
            <div className="text-[10px] text-zinc-600 mb-2">Illustrative of the range; a real version would be tuned to Activate&apos;s actual process.</div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[11.5px]"><span className="text-zinc-300">Cohort size</span><span className="text-teal-300 tabular-nums">{size}</span></div>
                <input type="range" min={30} max={70} value={size} onChange={(e) => set({ size: +e.target.value })} className="w-full accent-teal-400" />
              </div>
              <div>
                <div className="text-[11.5px] text-zinc-300 mb-1">Lean into a sector <span className="text-zinc-600">(strong institutional override)</span></div>
                <select value={leanSector} onChange={(e) => set({ leanSector: e.target.value })}
                  className="w-full bg-[#0e1014] border border-[#1d2128] rounded-lg px-2 py-1 text-[11.5px] text-zinc-200 focus:outline-none focus:border-teal-500/60">
                  <option value="">none</option>
                  {sectorNames.map((v) => <option key={v} value={v}>{v.replace(" / CO2e", "")}</option>)}
                </select>
                {leanSector && <input type="range" min={0} max={100} value={leanStrength} onChange={(e) => set({ leanStrength: +e.target.value })} className="w-full accent-teal-400 mt-1.5" />}
              </div>
              <div>
                <div className="flex justify-between text-[11.5px]"><span className="text-zinc-300">Diversity cap</span><span className="text-teal-300 tabular-nums">{cap >= 100 ? "off" : `${cap}%`}</span></div>
                <input type="range" min={10} max={100} step={2} value={cap} onChange={(e) => set({ cap: +e.target.value })} className="w-full accent-teal-400" />
                <div className="text-[10px] text-zinc-600 -mt-0.5">ceiling, max share any one sector can take</div>
              </div>
              <div>
                <div className="flex justify-between text-[11.5px]"><span className="text-zinc-300">Breadth floor</span><span className="text-teal-300 tabular-nums">{breadth === 0 ? "off" : `${breadth}/sector`}</span></div>
                <input type="range" min={0} max={3} step={1} value={breadth} onChange={(e) => set({ breadth: +e.target.value })} className="w-full accent-teal-400" />
                <div className="text-[10px] text-zinc-600 -mt-0.5">floor, reserve up to N per sector (real cohorts span the frontier)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel p-4 mt-5">
        <div className="text-[11.5px] font-medium text-zinc-200 mb-3">The cohort you just built (portfolio composition)</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <Stat v={`${Math.round(comp.topShare * 100)}%`} l="top sector concentration" />
              <Stat v={`${Math.round(comp.topHubShare * 100)}%`} l="top hub concentration" />
              <Stat v={`${Math.round((comp.whitespace / (comp.n || 1)) * 100)}%`} l="whitespace" accent />
              <Stat v={`${Math.round(comp.medDepth * 100)}`} l="median depth pct" />
            </div>
            {depthDominant && (
              <div className="mt-2 text-[10.5px] text-amber-300/90 leading-snug">
                Citation-heavy strategy: weighting depth this hard favors founders from well-resourced labs. Watch the second-order effects.
              </div>
            )}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Sector mix</div>
            <div className="space-y-0.5">
              {comp.sectorRank.slice(0, 6).map(([s, n]) => (
                <div key={s} className="flex items-center gap-2 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: verticalColor(s) }} />
                  <span className="text-zinc-400 flex-1 truncate">{s.replace(" / CO2e", "")}</span><span className="text-zinc-500 tabular-nums">{n}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Hub balance</div>
            <div className="space-y-0.5">
              {comp.hubRank.map(([h, n]) => (
                <div key={h} className="flex items-center gap-2 text-[11px]"><span className="text-zinc-400 flex-1">{h}</span><span className="text-zinc-500 tabular-nums">{n}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 panel p-4 border-l-2 border-l-teal-500/50">
        <div className="text-[13px] text-zinc-200">There is no objective best 50, only a strategy made explicit.</div>
        <div className="text-[11.5px] text-zinc-500 mt-1 leading-relaxed">
          Lean on funding momentum and you build an energy and climate cohort; lean on research depth and you build a
          publication-heavy one. And notice: pure scoring leaves whole sectors dark, because real selection isn&apos;t
          pure optimization. Activate&apos;s actual cohorts span every sector, so set a <span className="text-zinc-300">breadth
          floor</span> and watch the frontier fill in. The job isn&apos;t optimizing a score, it&apos;s choosing which
          portfolio you want, breadth and all, and being able to say why.
        </div>
      </div>
    </div>
  );
}

function Stat({ v, l, accent }: { v: string; l: string; accent?: boolean }) {
  return (
    <div className="panel p-2">
      <div className={`text-base font-semibold tabular-nums ${accent ? "text-amber-300" : "text-zinc-100"}`}>{v}</div>
      <div className="text-[9.5px] text-zinc-500 leading-tight mt-0.5">{l}</div>
    </div>
  );
}

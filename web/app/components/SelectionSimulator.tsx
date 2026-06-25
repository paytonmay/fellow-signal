"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Dataset, verticalColor } from "@/lib/data";

// Phase 1 of the Selection Simulator (see docs/selection-simulator-proposal.md).
// A SYNTHETIC candidate field drawn from selected-fellow and field-signal priors
// (NOT applicant data). 1,000 dots clustered by sector; four weights reshape which
// ~50 get picked. The point: there is no objective best 50, only a strategy made
// explicit. Composition is framed as portfolio construction, not a ranked truth.

const N = 1000;
const PICK = 50; // ~5%, mirroring Activate's real acceptance rate
const FEDCAP = 40;

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

export default function SelectionSimulator({ data }: { data: Dataset }) {
  const [w, setW] = useState({ research: 60, funding: 45, depth: 50, whitespace: 30 });

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
        researchN: r ? r.field_momentum / maxFM : 0,
        fundingN: s ? Math.min(s.federal_momentum, FEDCAP) / maxFed : 0,
        whitespaceN: 1 - presence / maxPres,
        presence,
        cite: cites.length ? cites[Math.floor(rng() * cites.length)] : 0,
        depthPct: 0,
        x, y, score: 0,
      });
    }
    // percentile-rank founder depth so raw-citation outliers can't dominate
    [...cand].sort((a, b) => a.cite - b.cite).forEach((c, idx) => { c.depthPct = idx / (N - 1); });
    return { cand, sectors };
  }, [data]);

  // ---- score + pick top-50 ----
  const selected = useMemo(() => {
    const sum = w.research + w.funding + w.depth + w.whitespace || 1;
    field.cand.forEach((c) => {
      c.score = (w.research * c.researchN + w.funding * c.fundingN + w.depth * c.depthPct + w.whitespace * c.whitespaceN) / sum;
    });
    const top = [...field.cand].sort((a, b) => b.score - a.score).slice(0, PICK);
    return new Set(top.map((c) => c.i));
  }, [w, field]);

  // ---- who changed since the last adjustment ----
  const prev = useRef<Set<number>>(new Set());
  const [diff, setDiff] = useState({ inN: 0, outN: 0 });
  useEffect(() => {
    let inN = 0, outN = 0;
    selected.forEach((i) => { if (!prev.current.has(i)) inN++; });
    prev.current.forEach((i) => { if (!selected.has(i)) outN++; });
    setDiff({ inN, outN });
    prev.current = new Set(selected);
  }, [selected]);

  // ---- canvas draw ----
  const wrapRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [cw, setCw] = useState(720);
  useLayoutEffect(() => {
    const measure = () => setCw(wrapRef.current?.clientWidth || 720);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const H = 440, W = cw, dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // faint sector labels
    ctx.font = "9px ui-sans-serif, system-ui"; ctx.textAlign = "center";
    field.sectors.forEach((s, si) => {
      const col = si % COLS, row = Math.floor(si / COLS);
      ctx.fillStyle = hexA(verticalColor(s), 0.32);
      ctx.fillText(shortLabel(s), ((col + 0.5) / COLS) * W, (row / ROWS) * H + 12);
    });
    // unselected (dim), then selected (bright)
    for (const c of field.cand) {
      if (selected.has(c.i)) continue;
      ctx.beginPath(); ctx.arc(c.x * W, c.y * H, 1.9, 0, 6.2832);
      ctx.fillStyle = hexA(verticalColor(c.sector), 0.12); ctx.fill();
    }
    for (const c of field.cand) {
      if (!selected.has(c.i)) continue;
      ctx.beginPath(); ctx.arc(c.x * W, c.y * H, 3.3, 0, 6.2832);
      ctx.fillStyle = verticalColor(c.sector); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 0.6; ctx.stroke();
    }
  }, [selected, field, cw]);

  // ---- portfolio composition of the chosen cohort ----
  const comp = useMemo(() => {
    const sel = field.cand.filter((c) => selected.has(c.i));
    const bySector: Record<string, number> = {};
    const byHub: Record<string, number> = {};
    sel.forEach((c) => { bySector[c.sector] = (bySector[c.sector] || 0) + 1; byHub[c.hub] = (byHub[c.hub] || 0) + 1; });
    const sectorRank = Object.entries(bySector).sort((a, b) => b[1] - a[1]);
    const hubRank = Object.entries(byHub).sort((a, b) => b[1] - a[1]);
    const whitespace = sel.filter((c) => c.presence < 0.12).length;
    const topShare = sectorRank.length ? sectorRank[0][1] / sel.length : 0;
    const medDepth = sel.length ? [...sel].sort((a, b) => a.depthPct - b.depthPct)[Math.floor(sel.length / 2)].depthPct : 0;
    return { sectorRank, hubRank, whitespace, topShare, medDepth, n: sel.length };
  }, [selected, field]);

  const sliders: [keyof typeof w, string, string][] = [
    ["research", "Research momentum", "favor fields whose science is accelerating"],
    ["funding", "Funding momentum", "favor fields where federal money is accelerating"],
    ["depth", "Founder research depth", "favor deeper, more-cited founders (percentile-ranked)"],
    ["whitespace", "Whitespace / frontier", "favor fields Activate is barely in yet"],
  ];

  return (
    <div>
      {/* caveats, always on screen */}
      <div className="panel p-3 mb-4 border-l-2 border-l-amber-500/50">
        <div className="text-[11.5px] text-zinc-300">
          Illustrative model. A <span className="text-amber-300">synthetic candidate field</span> drawn from
          selected-fellow and field-signal priors, to show how a selection strategy shapes a cohort.
        </div>
        <div className="text-[11px] text-zinc-600 mt-1">
          Not real applicant data. This does not estimate applicant quality or real selection probability, we don&apos;t
          have the applicant pool, so the field is built from <span className="text-zinc-400">accepted</span> fellows and
          public field signals as a stand-in.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* the field */}
        <div className="lg:col-span-2">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[12.5px] text-zinc-300">{N.toLocaleString()} candidates, clustered by sector</span>
            <span className="text-[11px] text-zinc-500">
              <span className="inline-block w-2 h-2 rounded-full bg-zinc-200 mr-1 align-middle" />
              {PICK} selected ({Math.round((PICK / N) * 100)}%) · <span className="text-zinc-600">{diff.inN > 0 ? `+${diff.inN} in / -${diff.outN} out` : "steady"}</span>
            </span>
          </div>
          <div ref={wrapRef} className="panel p-2">
            <canvas ref={cvRef} style={{ width: "100%", height: 440, display: "block" }} />
          </div>
          <div className="mt-2 text-[10.5px] text-zinc-600">
            Bright dots = the chosen cohort; dim = not selected. Drag a weight and watch the cohort reshape.
          </div>
        </div>

        {/* controls + composition */}
        <div className="space-y-4">
          <div>
            <div className="text-[12.5px] font-medium text-zinc-200 mb-2">Selection strategy</div>
            <div className="space-y-3">
              {sliders.map(([k, label, hint]) => (
                <div key={k}>
                  <div className="flex justify-between text-[11.5px]">
                    <span className="text-zinc-300">{label}</span>
                    <span className="text-teal-300 tabular-nums">{w[k]}</span>
                  </div>
                  <input type="range" min={0} max={100} value={w[k]}
                    onChange={(e) => setW((p) => ({ ...p, [k]: +e.target.value }))}
                    className="w-full accent-teal-400" />
                  <div className="text-[10px] text-zinc-600 -mt-0.5">{hint}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-3">
            <div className="text-[11.5px] font-medium text-zinc-200 mb-2">The cohort you just built</div>
            <div className="grid grid-cols-3 gap-2 mb-3 text-center">
              <Stat v={`${Math.round(comp.topShare * 100)}%`} l="in top sector" />
              <Stat v={`${Math.round((comp.whitespace / (comp.n || 1)) * 100)}%`} l="whitespace" accent />
              <Stat v={`${Math.round(comp.medDepth * 100)}`} l="med depth pct" />
            </div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Sector mix</div>
            <div className="space-y-0.5 mb-2">
              {comp.sectorRank.slice(0, 6).map(([s, n]) => (
                <div key={s} className="flex items-center gap-2 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: verticalColor(s) }} />
                  <span className="text-zinc-400 flex-1 truncate">{s.replace(" / CO2e", "")}</span>
                  <span className="text-zinc-500 tabular-nums">{n}</span>
                </div>
              ))}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Hub balance</div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-zinc-500">
              {comp.hubRank.map(([h, n]) => <span key={h}>{h} <span className="text-zinc-400 tabular-nums">{n}</span></span>)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 panel p-4 border-l-2 border-l-teal-500/50">
        <div className="text-[13px] text-zinc-200">
          There is no objective best 50, only a strategy made explicit.
        </div>
        <div className="text-[11.5px] text-zinc-500 mt-1 leading-relaxed">
          Lean on funding momentum and you build an energy and climate cohort; lean on research depth and you build a
          publication-heavy one; lean on whitespace and you bet on the frontier. Same candidates, different cohort. The
          job isn&apos;t optimizing a score, it&apos;s choosing which portfolio you want and being able to say why.
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

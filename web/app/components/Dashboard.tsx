"use client";

import { useMemo, useState } from "react";
import { Dataset, fmtUSD } from "@/lib/data";
import * as D from "@/lib/derive";
import FrontierRadar from "./FrontierRadar";
import OutcomesBars from "./OutcomesBars";
import HubAtlas from "./HubAtlas";
import ConvergenceMap from "./ConvergenceMap";
import CohortDrift from "./CohortDrift";
import PortfolioPanel from "./PortfolioPanel";
import SpaceForecast from "./SpaceForecast";
import FunderLandscape from "./FunderLandscape";
import FunderModel from "./FunderModel";
import PeerFunders from "./PeerFunders";
import Insights from "./Insights";

function Panel({ title, sub, span = "", children }: { title: string; sub?: string; span?: string; children: React.ReactNode }) {
  return (
    <div className={`panel p-4 md:p-5 ${span}`}>
      <div className="mb-3">
        <div className="text-[12.5px] font-medium text-zinc-200">{title}</div>
        {sub && <div className="text-[10.5px] text-zinc-600 mt-0.5">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function Kpi({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return (
    <div className="panel px-4 py-3">
      <div className={`text-xl md:text-2xl font-semibold tracking-tight ${accent ?? "text-zinc-100"}`}>{value}</div>
      <div className="text-[11px] text-zinc-500 mt-0.5">{label}</div>
    </div>
  );
}

export default function Dashboard({ data }: { data: Dataset }) {
  const [f, setF] = useState<D.Filters>(D.EMPTY_FILTERS);
  const cos = data.companies;

  const filtered = useMemo(() => D.applyFilters(cos, f), [cos, f]);
  const chartCos = useMemo(() => D.applyFilters(cos, { ...f, vertical: "" }), [cos, f]);
  const atlasCos = useMemo(() => D.applyFilters(cos, { ...f, vertical: "", hub: "" }), [cos, f]);

  const kpi = useMemo(() => D.kpis(filtered), [filtered]);
  const verts = useMemo(() => D.verticalsAgg(chartCos), [chartCos]);
  const radar = useMemo(() => D.radarRows(chartCos, data.radar), [chartCos, data.radar]);
  const conv = useMemo(() => D.convergence(chartCos), [chartCos]);
  const yrs = useMemo(() => D.years(chartCos), [chartCos]);
  const atlas = useMemo(() => D.hubAtlas(atlasCos, data.hub_atlas.hubs), [atlasCos, data.hub_atlas.hubs]);

  const allVerticals = data.verticals.map((v) => v.vertical);
  const allYears = [...new Set(cos.map((c) => c.cohort_year).filter(Boolean))].sort((a, b) => (b as number) - (a as number));
  const set = (patch: Partial<D.Filters>) => setF((p) => ({ ...p, ...patch }));
  const toggleVert = (v: string) => set({ vertical: f.vertical === v ? "" : v });
  const toggleHub = (h: string) => set({ hub: f.hub === h ? "" : h });

  const sel = "bg-[#0e1014] border border-[#1d2128] rounded-lg px-2.5 py-1.5 text-[12.5px] text-zinc-200 focus:outline-none focus:border-teal-500/60";

  return (
    <div className="min-h-screen">
      {/* ===== Top bar ===== */}
      <header className="sticky top-0 z-30 bg-[#08090b]/90 backdrop-blur border-b border-[#15181e]">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 mr-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              <span className="text-[13px] font-semibold tracking-tight text-zinc-100">Fellow Signal</span>
              <span className="hidden md:inline text-[11px] text-zinc-600">· Activate fellowship intelligence</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap ml-auto">
              <input value={f.q} onChange={(e) => set({ q: e.target.value })}
                placeholder="Search…" className={`${sel} w-40`} />
              <select value={f.vertical} onChange={(e) => set({ vertical: e.target.value })} className={sel}>
                <option value="">All verticals</option>
                {allVerticals.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={f.hub} onChange={(e) => set({ hub: e.target.value })} className={sel}>
                <option value="">All hubs</option>
                {data.hub_atlas.hubs.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
              <select value={f.year} onChange={(e) => set({ year: e.target.value })} className={sel}>
                <option value="">All years</option>
                {allYears.map((y) => <option key={y} value={String(y)}>{y}</option>)}
              </select>
              <button onClick={() => set({ funded: !f.funded })}
                className={`rounded-lg px-2.5 py-1.5 text-[12.5px] border transition ${f.funded ? "bg-teal-400/15 border-teal-500/50 text-teal-200" : "bg-[#0e1014] border-[#1d2128] text-zinc-400 hover:text-zinc-200"}`}>
                Funded
              </button>
              {D.isActive(f) && (
                <button onClick={() => setF(D.EMPTY_FILTERS)} className="text-[12px] text-zinc-500 hover:text-zinc-200 px-1">
                  Reset ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-5">
        {/* ===== KPI row ===== */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <Kpi value={String(kpi.count)} label={`ventures${D.isActive(f) ? " in view" : ", 2015-2025"}`} />
          <Kpi value={fmtUSD(kpi.federal, { compact: true })} label="federal non-dilutive" accent="text-teal-300" />
          <Kpi value={`${kpi.count ? Math.round((kpi.funded / kpi.count) * 100) : 0}%`} label="won funding" />
          <Kpi value={String(kpi.fellows)} label="scientist-founders" />
          <Kpi value={String(kpi.profiled)} label="research-profiled" />
        </div>

        {D.isActive(f) && (
          <div className="text-[11.5px] text-zinc-500 mb-4">
            Filtering {kpi.count} of {cos.length} ventures
            {f.vertical && <> · vertical <span className="text-teal-300">{f.vertical}</span></>}
            {f.hub && <> · hub <span className="text-teal-300">{f.hub}</span></>}
            {f.year && <> · cohort <span className="text-teal-300">{f.year}</span></>}
            <span className="text-zinc-600"> · comparison panels show all verticals for context</span>
          </div>
        )}

        {/* ===== Bento grid ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Panel title="Frontier Radar" sub="Research momentum × Activate presence × federal funding (bubble) · the opportunity map" span="lg:col-span-3">
            <FrontierRadar rows={radar} />
          </Panel>

          <div className="lg:col-span-3 mt-2">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] font-mono text-teal-400/80">Insights</span>
              <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">what the data says, and the so-what</span>
            </div>
            <Insights data={data} />
          </div>

          <Panel title="Non-dilutive funding won" sub="Federal $ captured, by space · click to filter">
            <OutcomesBars verticals={verts} onSelect={toggleVert} />
          </Panel>
          <Panel title="Hub Atlas" sub="Specialization by community · click a hub to scope" span="lg:col-span-2">
            <HubAtlas atlas={atlas} onSelectHub={toggleHub} activeHub={f.hub} />
          </Panel>
          <Panel title="Convergence" sub="Where verticals combine · click a node to filter">
            <ConvergenceMap data={conv} onSelect={toggleVert} />
          </Panel>
          <Panel title="Cohort drift" sub="Vertical mix by cohort year" span="lg:col-span-2">
            <CohortDrift years={yrs} topVerticals={verts.map((v) => v.vertical)} />
          </Panel>
          <Panel title="Space Forecast" sub="Per space: is the science accelerating, who's funding it, is Activate early? Growth multiples vs a decade-ago baseline." span="lg:col-span-3">
            <SpaceForecast spaces={data.space_signals.spaces} activeVertical={f.vertical} onSelect={toggleVert} />
          </Panel>
          <Panel title="Funder Landscape" sub="Federal funding by agency × space · who's putting money where" span="lg:col-span-3">
            <FunderLandscape data={data.space_signals}
              verticalsOrder={[...data.space_signals.spaces].sort((a, b) => b.federal_total - a.federal_total).map((s) => s.vertical)}
              activeVertical={f.vertical} onSelect={toggleVert} />
          </Panel>
          {data.peer_funders.funders[0] && (
            <Panel title="Peer funders" sub="Where another deep-tech funder concentrates vs Activate · click a space to filter" span="lg:col-span-3">
              <PeerFunders peer={data.peer_funders.funders[0]} activateVerticals={data.verticals}
                activateTotal={data.headline.companies} activeVertical={f.vertical} onSelect={toggleVert} />
            </Panel>
          )}
          {data.funder_model && (
            <Panel title="Funder & Model" sub="Activate's own finances (IRS 990) · money in vs. impact out" span="lg:col-span-3">
              <FunderModel model={data.funder_model} portfolioNsf={data.headline.federal_total} />
            </Panel>
          )}
          <Panel title="Portfolio" sub="Click any venture for its funding, narrative, and founder research footprint" span="lg:col-span-3">
            <PortfolioPanel companies={filtered} />
          </Panel>
        </div>

        <footer className="mt-6 pt-6 border-t border-[#15181e] text-[11.5px] text-zinc-600">
          Data: Activate&apos;s public companies directory, USAspending, NSF, SEC EDGAR, OpenAlex, IRS 990.
          Momentum figures are directional (keyword-relevance search); trust the ranking over exact magnitudes.
        </footer>
      </div>
    </div>
  );
}

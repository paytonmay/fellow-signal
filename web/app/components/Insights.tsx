"use client";

import { useMemo } from "react";
import { Dataset, fmtUSD } from "@/lib/data";

// The synthesis layer: findings DERIVED from the data, each with evidence and a
// "so what". This is the point of the whole thing, discovery & insight, not a
// pile of charts.
export default function Insights({ data }: { data: Dataset }) {
  const ins = useMemo(() => {
    const co = data.companies;
    const cohortShare = (yr: number) => {
      const rows = co.filter((c) => c.cohort_year === yr);
      const n = rows.length || 1;
      const m: Record<string, number> = {};
      rows.forEach((c) => c.verticals.forEach((v) => (m[v] = (m[v] || 0) + 1)));
      return { share: (v: string) => (m[v] || 0) / n, n };
    };
    const s24 = cohortShare(2024), s25 = cohortShare(2025);
    const verts = data.verticals.map((v) => v.vertical);
    const risers = verts
      .map((v) => ({ v, d: s25.share(v) - s24.share(v), a: s24.share(v), b: s25.share(v) }))
      .sort((x, y) => y.d - x.d)
      .slice(0, 2);

    const sp = Object.fromEntries(data.space_signals.spaces.map((s) => [s.vertical, s]));
    const radar = data.radar;
    const medPres = [...radar].map((r) => r.activate_presence_recent).sort((a, b) => a - b)[Math.floor(radar.length / 2)];
    const white = radar
      .filter((r) => r.field_momentum >= 4 && r.activate_presence_recent < medPres && (sp[r.vertical]?.federal_momentum ?? 0) >= 8)
      .sort((a, b) => (sp[b.vertical]?.federal_momentum ?? 0) - (sp[a.vertical]?.federal_momentum ?? 0))
      .slice(0, 2);

    // NY over-index
    const g: Record<string, number> = {};
    co.forEach((c) => c.verticals.forEach((v) => (g[v] = (g[v] || 0) + 1 / co.length)));
    const ny = co.filter((c) => c.hub === "New York");
    const nyShare: Record<string, number> = {};
    ny.forEach((c) => c.verticals.forEach((v) => (nyShare[v] = (nyShare[v] || 0) + 1 / (ny.length || 1))));
    const nyTop = Object.keys(nyShare)
      .map((v) => ({ v, over: nyShare[v] - (g[v] || 0) }))
      .sort((a, b) => b.over - a.over).slice(0, 2);

    const funded = co.filter((c) => c.federal_total > 0).length;

    const fin = data.funder_model?.financials ?? [];
    const y19 = fin.find((f) => f.year === 2019);
    const last = fin[fin.length - 1];
    const mult = y19 && last ? (last.revenue / y19.revenue).toFixed(1) : null;

    return { risers, white, nyTop, funded, total: data.headline.federal_total, mult, y19, last, n24: s24.n, n25: s25.n };
  }, [data]);

  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const cards = [
    {
      tag: "Frontier shift",
      head: `The ${ins.n25 ? 2025 : ""} cohort pivoted hard`,
      body: (
        <>
          {ins.risers.map((r) => (
            <span key={r.v} className="block">
              {r.v.replace(" / CO2e", "")} <span className="text-teal-300">{pct(r.a)} → {pct(r.b)}</span> of the cohort
            </span>
          ))}
          <span className="block text-[11px] text-zinc-600 mt-1">cohorts of {ins.n24} and {ins.n25}, so directional</span>
        </>
      ),
      so: "Where Activate sources is moving year to year, discovery should track these accelerations, not last cohort's mix.",
    },
    {
      tag: "Whitespace",
      head: "Hot science, hot money, Activate light",
      body: (
        <>
          {ins.white.map((w) => (
            <span key={w.vertical} className="block">
              {w.vertical.replace(" / CO2e", "")}: research <span className="text-teal-300">×{w.field_momentum.toFixed(1)}</span>,
              federal $ <span className="text-amber-300">×{(data.space_signals.spaces.find((s) => s.vertical === w.vertical)?.federal_momentum ?? 0) >= 99 ? "99+" : Math.round(data.space_signals.spaces.find((s) => s.vertical === w.vertical)?.federal_momentum ?? 0)}</span>,
              presence <span className="text-zinc-200">{pct(w.activate_presence_recent)}</span>
            </span>
          ))}
        </>
      ),
      so: "The clearest sourcing-opportunity gaps: fields the science and the funders are racing into, where Activate is under-represented.",
    },
    {
      tag: "Hub thesis",
      head: "New York is a climate & carbon cluster",
      body: (
        <>
          {ins.nyTop.map((h) => (
            <span key={h.v} className="block">
              {h.v.replace(" / CO2e", "")} <span className="text-teal-300">+{Math.round(h.over * 100)}pp</span> vs the portfolio
            </span>
          ))}
        </>
      ),
      so: "Hubs aren't interchangeable, each is a distinct bet, so sourcing and partner cultivation should be hub-specific.",
    },
    {
      tag: "Outcomes",
      head: "The selections win money on their own",
      body: (
        <span>
          <span className="text-teal-300 text-lg font-semibold">{fmtUSD(ins.total, { compact: true })}</span> in federal non-dilutive
          funding across <span className="text-zinc-100">{pct(ins.funded / data.headline.companies)}</span> of ventures
        </span>
      ),
      so: "An independent, public validation that pick-quality converts to real traction, before any equity round.",
    },
    {
      tag: "Model",
      head: ins.mult ? `An equity-free model that ${ins.mult}×'d its budget` : "An equity-free model",
      body: ins.y19 && ins.last ? (
        <span>
          Revenue <span className="text-teal-300">{fmtUSD(ins.y19.revenue, { compact: true })} → {fmtUSD(ins.last.revenue, { compact: true })}</span> ({ins.y19.year}–{ins.last.year}),
          funded by philanthropy + government, not VC
        </span>
      ) : null,
      so: "A scalable, founder-first alternative to the accelerator model, and the growth shows it's resonating with funders.",
    },
    {
      tag: "Discovery signal",
      head: "The science predicts the venture, years early",
      body: (
        <span>
          Founders&apos; pre-founding publications map onto their companies, e.g. Ryan DuChanois&apos;s membrane / ion-separation
          research → Solidec&apos;s electrochemical reactors.
        </span>
      ),
      so: "Research footprints are a leading indicator for founder discovery, surfacing scientists before they've incorporated.",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((c) => (
        <div key={c.tag} className="panel p-4 flex flex-col">
          <div className="text-[10.5px] uppercase tracking-[0.18em] text-teal-400/80 mb-1.5">{c.tag}</div>
          <div className="text-[15px] font-semibold text-zinc-100 leading-snug">{c.head}</div>
          <div className="text-[12.5px] text-zinc-400 mt-2 leading-relaxed">{c.body}</div>
          <div className="text-[12px] text-zinc-500 mt-3 pt-3 border-t border-[#1a1d23] leading-relaxed">
            <span className="text-zinc-400 font-medium">So what:</span> {c.so}
          </div>
        </div>
      ))}
    </div>
  );
}

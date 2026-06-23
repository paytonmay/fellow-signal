"use client";

import { useMemo } from "react";
import { Dataset, verticalColor } from "@/lib/data";

// The on-thesis view: turn the signals into a sourcing recommendation —
// WHERE to look (emerging spaces Activate is light in) and WHAT profile to look
// for (the founder research footprint that precedes a venture).
export default function FounderDiscovery({ data }: { data: Dataset }) {
  const model = useMemo(() => {
    const sp = Object.fromEntries(data.space_signals.spaces.map((s) => [s.vertical, s]));
    const maxR = Math.max(...data.radar.map((r) => r.field_momentum));
    const maxF = Math.max(...data.space_signals.spaces.map((s) => Math.min(s.federal_momentum, 40)));
    const maxP = Math.max(...data.radar.map((r) => r.activate_presence_recent));

    const spaces = data.radar.map((r) => {
      const fed = Math.min(sp[r.vertical]?.federal_momentum ?? 0, 40);
      const research = r.field_momentum / maxR;
      const funding = fed / maxF;
      const presence = r.activate_presence_recent / (maxP || 1);
      // hot science + hot money, discounted by how present Activate already is
      const opportunity = (0.5 * research + 0.5 * funding) * (1 - 0.65 * presence);
      return {
        vertical: r.vertical,
        opportunity,
        research: r.field_momentum,
        fed: sp[r.vertical]?.federal_momentum ?? 0,
        presence: r.activate_presence_recent,
        agency: sp[r.vertical]?.top_agencies?.[0]?.name,
      };
    }).sort((a, b) => b.opportunity - a.opportunity);

    // Founder exemplars: resolved founders with strong, traceable research.
    const exemplars = data.companies
      .flatMap((c) => (c.founders ?? [])
        .filter((f) => f.resolved && (f.cited_by_count ?? 0) > 0 && (f.pre_founding_topics?.length ?? 0) > 0)
        .map((f) => ({ ...f, company: c.name, vertical: c.verticals[0] })))
      .sort((a, b) => (b.cited_by_count ?? 0) - (a.cited_by_count ?? 0))
      .slice(0, 4);

    const profiled = data.companies.filter((c) => (c.founders ?? []).some((f) => f.resolved)).length;

    // Typical-founder profile: descriptive baselines from the resolved founders'
    // own outputs — a screening FILTER, not a target to hit.
    const resolved = data.companies.flatMap((c) =>
      (c.founders ?? []).filter((f) => f.resolved).map((f) => ({
        ...f,
        latency: f.years_to_founding ?? (f.first_pub_year && c.cohort_year ? c.cohort_year - f.first_pub_year : null),
      })));
    const pctile = (vals: number[], p: number) => {
      const s = vals.filter((v) => v != null && !Number.isNaN(v)).sort((a, b) => a - b);
      return s.length ? s[Math.max(0, Math.round(p * (s.length - 1)))] : 0;
    };
    const cv = resolved.map((f) => f.cited_by_count ?? 0);
    const hv = resolved.map((f) => f.h_index ?? 0);
    const lv = resolved.map((f) => f.latency).filter((x): x is number => x != null && x >= 0 && x < 30);
    const typical = {
      n: resolved.length,
      citesMed: pctile(cv, 0.5), citesLo: pctile(cv, 0.25), citesHi: pctile(cv, 0.75),
      hMed: pctile(hv, 0.5), hLo: pctile(hv, 0.25), hHi: pctile(hv, 0.75),
      latMed: pctile(lv, 0.5), latLo: pctile(lv, 0.25), latHi: pctile(lv, 0.75),
    };

    return { spaces, exemplars, profiled, typical };
  }, [data]);

  const maxOpp = model.spaces[0]?.opportunity || 1;
  const shortAgency = (n?: string) => (n || "").replace("Department of ", "").replace("National Science Foundation", "NSF").replace("Environmental Protection Agency", "EPA");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* WHERE to source */}
      <div>
        <div className="text-[12.5px] font-medium text-zinc-200 mb-1">Where to source next</div>
        <div className="text-[11px] text-zinc-600 mb-3">
          Spaces ranked by opportunity = research × federal-funding momentum, discounted by how present Activate already is. Top = hot and under-sourced.
        </div>
        <div className="space-y-1.5">
          {model.spaces.slice(0, 8).map((s, i) => (
            <div key={s.vertical} className="relative flex items-center gap-3 px-2.5 py-1.5 rounded-lg overflow-hidden">
              <div className="absolute inset-y-0 left-0 rounded-lg pointer-events-none"
                style={{ width: `${(s.opportunity / maxOpp) * 100}%`, background: `${verticalColor(s.vertical)}1c` }} />
              <span className="relative text-[10.5px] text-zinc-600 w-3.5 text-right tabular-nums">{i + 1}</span>
              <span className="relative w-2 h-2 rounded-full shrink-0" style={{ background: verticalColor(s.vertical) }} />
              <span className="relative text-[12.5px] text-zinc-200 flex-1 truncate">{s.vertical.replace(" / CO2e", "")}</span>
              <span className="relative text-[10.5px] text-zinc-500 hidden sm:block">
                res ×{s.research.toFixed(1)} · fed ×{s.fed >= 99 ? "99+" : Math.round(s.fed)}
              </span>
              <span className="relative text-[11px] w-14 text-right">
                {s.presence < 0.12
                  ? <span className="text-amber-300">{Math.round(s.presence * 100)}% in</span>
                  : <span className="text-zinc-500">{Math.round(s.presence * 100)}% in</span>}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[11px] text-zinc-600">
          <span className="text-amber-300">Amber</span> = Activate under 12% present — the sharpest gaps. Lead funder shown in the Space Forecast.
        </div>
      </div>

      {/* WHAT profile to look for */}
      <div>
        <div className="text-[12.5px] font-medium text-zinc-200 mb-1">The typical founder, as a filter</div>
        <div className="text-[11px] text-zinc-600 mb-3">
          Descriptive baselines from {model.typical.n} resolved founders&apos; own research output — a starting screen for candidates, not a bar to clear.
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "citations", med: model.typical.citesMed.toLocaleString(), range: `${model.typical.citesLo.toLocaleString()}–${model.typical.citesHi.toLocaleString()}` },
            { label: "h-index", med: String(model.typical.hMed), range: `${model.typical.hLo}–${model.typical.hHi}` },
            { label: "yrs paper→found", med: String(model.typical.latMed), range: `${model.typical.latLo}–${model.typical.latHi}` },
          ].map((s) => (
            <div key={s.label} className="panel p-2.5 text-center">
              <div className="text-lg font-semibold text-teal-300 tabular-nums">{s.med}</div>
              <div className="text-[10px] text-zinc-500">{s.label}</div>
              <div className="text-[9.5px] text-zinc-600 mt-0.5">mid 50%: {s.range}</div>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-zinc-500 mb-2">Exemplars (highest-cited resolved profiles):</div>
        <div className="space-y-2">
          {model.exemplars.map((f, i) => (
            <div key={i} className="panel p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-medium text-zinc-100">{f.name}</span>
                <span className="text-[11px] text-zinc-500">{f.company}</span>
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                {f.institution} · {(f.cited_by_count ?? 0).toLocaleString()} citations · h-index {f.h_index}
              </div>
              <div className="mt-1.5 text-[11px] text-zinc-400">
                <span className="text-zinc-600">pre-founding research: </span>
                {(f.pre_founding_topics ?? []).slice(0, 3).join(" · ")}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[11px] text-zinc-600 leading-relaxed">
          Sourcing implication: in the target spaces above, look for scientists with deep, highly-cited work in the underlying
          discipline 2-4 years before they incorporate — the research footprint is the earliest discovery signal, ahead of any company.
        </div>
      </div>
    </div>
  );
}

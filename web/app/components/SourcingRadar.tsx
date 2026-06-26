"use client";

import { useMemo, useState } from "react";
import { Dataset, SourcingArea } from "@/lib/data";

// Phase 1 Sourcing Radar (see docs/sourcing-radar-proposal.md). Pick a research
// area, get a reviewer packet: where to look (US research-institution hotspots),
// why now, what is technically hard, and how under-covered Activate is.
// Institutions and areas only, no individuals.

const evColor = (q: string) => q === "strong" || q === "matched keyword" ? "text-teal-300" : q === "limited" || q === "low/flat" ? "text-amber-300" : q === "unavailable" || q === "thin" ? "text-zinc-500" : "text-zinc-300";

export default function SourcingRadar({ data }: { data: Dataset }) {
  const areas = useMemo(() => [...(data.sourcing?.areas ?? [])].sort((a, b) => b.research_growth - a.research_growth), [data]);
  const [sel, setSel] = useState(0);
  const a: SourcingArea | undefined = areas[sel];
  if (!a) return <div className="text-zinc-500">No sourcing data.</div>;

  const maxInst = Math.max(...a.institutions.map((i) => i.recent), 1);
  const maxBn = Math.max(...a.bottlenecks.map((b) => b.count), 1);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-[12px] text-zinc-500">Research area</span>
        <select value={sel} onChange={(e) => setSel(+e.target.value)}
          className="bg-[#0e1014] border border-[#1d2128] rounded-lg px-3 py-1.5 text-[13px] text-zinc-200 focus:outline-none focus:border-teal-500/60 max-w-[420px]">
          {areas.map((x, i) => <option key={x.topic} value={i}>{x.topic.replace(" Research", "").replace(" Methods", "")}</option>)}
        </select>
        {a.orphan
          ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300">orphan: science ahead of the ecosystem</span>
          : a.activate_present
            ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-400/10 text-teal-300/90">Activate present</span>
            : <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-700/40 text-zinc-400">whitespace</span>}
        <span className="text-[11px] text-zinc-600">{a.field}</span>
      </div>

      {/* why now */}
      <div className="panel p-4 mb-4 border-l-2 border-l-teal-500/50">
        <div className="text-[10px] uppercase tracking-wider text-teal-400/70 mb-1">Why now</div>
        <div className="text-[13.5px] text-zinc-200 leading-relaxed">{a.why_now}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* where to look */}
        <div className="panel p-4">
          <div className="text-[12px] font-medium text-zinc-200">Where to look</div>
          <div className="text-[10px] text-zinc-600 mb-2.5">US research-institution hotspots, scored by output × specialization × growth (not raw count)</div>
          <div className="space-y-1.5">
            {a.institutions.map((inst, i) => (
              <div key={i} className="relative flex items-center gap-2 px-2 py-1 rounded-lg overflow-hidden">
                <div className="absolute inset-y-0 left-0 rounded-lg bg-teal-400/[0.06]" style={{ width: `${(inst.recent / maxInst) * 100}%` }} />
                <span className="relative text-[10px] text-zinc-600 w-3 text-right tabular-nums">{i + 1}</span>
                <span className="relative flex-1 min-w-0">
                  <span className="block text-[12px] text-zinc-200 truncate">{inst.name}</span>
                  <span className="block text-[9.5px] text-zinc-600">{inst.type} · {inst.recent} recent papers · ×{inst.growth} growth</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* what is technically hard */}
        <div className="panel p-4">
          <div className="text-[12px] font-medium text-zinc-200">What&apos;s technically hard</div>
          <div className="text-[10px] text-zinc-600 mb-2.5">Recurring unsolved constraints in recent abstracts, the company-thesis territory</div>
          <div className="space-y-2.5">
            {a.bottlenecks.map((b, i) => (
              <div key={i}>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-zinc-200">{b.term}</span>
                  <span className="flex-1 h-1.5 rounded bg-[#0e1014] overflow-hidden"><span className="block h-full bg-amber-400/60 rounded" style={{ width: `${(b.count / maxBn) * 100}%` }} /></span>
                  <span className="text-[10px] text-zinc-600 tabular-nums">{b.count}</span>
                </div>
                {i < 3 && b.samples[0] && <div className="text-[10px] text-zinc-600 mt-0.5 pl-0.5 leading-snug truncate" title={b.samples[0]}>e.g. &ldquo;{b.samples[0]}&rdquo;</div>}
              </div>
            ))}
            {a.bottlenecks.length === 0 && <div className="text-[11px] text-zinc-600">No recurring constraint terms found in the sample.</div>}
          </div>
        </div>

        {/* signals + evidence */}
        <div className="panel p-4">
          <div className="text-[12px] font-medium text-zinc-200 mb-2.5">Signals</div>
          <div className="space-y-1.5 text-[11.5px]">
            <Row k="Research growth" v={`×${a.research_growth} over a decade`} />
            <Row k="Federal funding" v={a.funding_phrase} accent={a.orphan ? "text-amber-300" : a.funding_phrase.includes("unavailable") ? "text-zinc-500" : "text-zinc-300"} />
            <Row k="Activate presence" v={a.activate_present ? "in this space" : "not yet"} accent={a.activate_present ? "text-teal-300" : "text-amber-300/80"} />
          </div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600 mt-3 mb-1.5">Evidence quality</div>
          <div className="space-y-1 text-[11px]">
            <Row k="Topic match" v={a.evidence.topic_match} />
            <Row k="US institution coverage" v={a.evidence.us_institutions} accent={evColor(a.evidence.us_institutions)} />
            <Row k="Funding match" v={a.evidence.funding_match} accent={evColor(a.evidence.funding_match)} />
            <Row k="Abstract coverage" v={`${Math.round(a.evidence.abstract_coverage * 100)}% of sampled papers`} />
          </div>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-zinc-600 leading-relaxed max-w-4xl">
        A candidate surface for human curation, not a ranking to act on blindly. Institutions only, no individuals, and US-scoped
        (the global ranking points at institutions Activate doesn&apos;t recruit from). Hotspots cover universities, national labs, and
        academic medical centers, where pre-company research happens. OpenAlex topic-to-institution attribution is imperfect, so a
        recognizable institution is the signal; an unfamiliar one may be a tagging artifact. Bottleneck terms are keyword-matched.
      </p>
    </div>
  );
}

function Row({ k, v, accent }: { k: string; v: string; accent?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-zinc-500 shrink-0">{k}</span>
      <span className={`text-right ${accent ?? "text-zinc-300"}`}>{v}</span>
    </div>
  );
}

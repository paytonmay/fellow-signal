"use client";

import { Dataset, fmtUSD } from "@/lib/data";

// Bottom-up frontier detection: the fastest-rising OpenAlex research topics (not
// our 16 verticals), crossed with federal funding momentum, flagged by whether
// any Activate fellow already publishes in them. Ranked by opportunity = research
// x funding momentum, so the hottest unclaimed areas surface themselves.
export default function EmergingScience({ data }: { data: Dataset }) {
  const topics = data.emerging_science?.topics ?? [];
  const open = topics.filter((t) => !t.activate_present);
  const max = Math.max(...topics.map((t) => t.opportunity), 0.1);

  const fed = (t: (typeof topics)[number]) => {
    if (!t.federal_matched) return <span className="text-zinc-700">no fed match</span>;
    if (t.federal_new) return <span className="text-amber-300">new ${Math.round(t.federal_recent / 1e6)}M</span>;
    if (t.federal_momentum > 0) return <span className="text-zinc-300">×{Math.round(t.federal_momentum)} · {fmtUSD(t.federal_recent, { compact: true })}</span>;
    return <span className="text-zinc-600">{t.federal_recent > 0 ? fmtUSD(t.federal_recent, { compact: true }) : "n/a"}</span>;
  };

  return (
    <div>
      <div className="text-[11px] text-zinc-600 mb-3 max-w-3xl">
        The fastest-rising research topics (OpenAlex, incl. arXiv / bioRxiv preprints), crossed with federal funding
        momentum, and ranked by opportunity = research × funding. <span className="text-amber-300">Amber</span> = an
        emerging area with no Activate fellow yet, the sourcing watch list. The top amber rows are research-hot,
        money-hot, and unclaimed.
      </div>
      <div className="grid grid-cols-12 gap-2 px-2.5 pb-1.5 text-[10px] uppercase tracking-wider text-zinc-600">
        <span className="col-span-5">Emerging topic</span>
        <span className="col-span-2 text-right">Research</span>
        <span className="col-span-3 text-right">Federal funding</span>
        <span className="col-span-2 text-right">Activate</span>
      </div>
      <div className="max-h-[440px] overflow-y-auto scroll-thin pr-1">
        {topics.map((t) => (
          <div key={t.topic}
            className={`relative grid grid-cols-12 gap-2 items-center px-2.5 py-1.5 rounded-lg overflow-hidden ${t.activate_present ? "" : "bg-amber-400/[0.05]"}`}>
            <div className="absolute inset-y-0 left-0 rounded-lg pointer-events-none"
              style={{ width: `${(t.opportunity / max) * 100}%`, background: t.activate_present ? "#5eead412" : "#fbbf2412" }} />
            <span className="relative col-span-5 min-w-0">
              <span className="block text-[12.5px] text-zinc-200 truncate">{t.topic}</span>
              <span className="block text-[10px] text-zinc-600">{t.field}</span>
            </span>
            <span className="relative col-span-2 text-right text-[12px] text-teal-300 tabular-nums">×{t.growth.toFixed(1)}</span>
            <span className="relative col-span-3 text-right text-[11px] tabular-nums">{fed(t)}</span>
            <span className={`relative col-span-2 text-right text-[10.5px] ${t.activate_present ? "text-zinc-600" : "text-amber-300/90"}`}>
              {t.activate_present ? "in it" : "open"}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-zinc-600 leading-relaxed max-w-3xl">
        Candidate surface for curation, not a ranking to act on blindly. Research is share-normalized (growth above ~8×
        filtered as a coverage artifact); federal momentum uses curated keywords against USAspending and only counts when
        current funding is material (≥$20M), so tiny-base ratios can&apos;t dominate. {open.length} of {topics.length} topics are open.
      </p>
    </div>
  );
}

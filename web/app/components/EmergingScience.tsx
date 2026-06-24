"use client";

import { Dataset } from "@/lib/data";

// Bottom-up frontier detection: the fastest-rising OpenAlex research topics (not
// our 16 pre-defined verticals), flagged by whether any Activate fellow already
// publishes in them. The whitespace rows are emerging science with no Activate
// founder yet — the earliest watch list.
export default function EmergingScience({ data }: { data: Dataset }) {
  const topics = data.emerging_science?.topics ?? [];
  const whitespace = topics.filter((t) => !t.activate_present).length;
  const max = Math.max(...topics.map((t) => t.growth), 1);

  return (
    <div>
      <div className="text-[11px] text-zinc-600 mb-4 max-w-3xl">
        The fastest-rising research topics by growth in publication share (2016-17 → 2023-24), surfaced from ~4,500
        OpenAlex topics (which include arXiv / bioRxiv preprints), not our verticals.{" "}
        <span className="text-amber-300">Amber</span> = an emerging area where no Activate fellow publishes yet,
        the earliest sourcing watch list. {whitespace} of {topics.length} are open.
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-1.5 max-h-[460px] overflow-y-auto scroll-thin pr-1">
        {topics.map((t) => (
          <div key={t.topic}
            className={`relative flex items-center gap-3 px-2.5 py-1.5 rounded-lg overflow-hidden ${t.activate_present ? "" : "bg-amber-400/[0.04]"}`}>
            <div className="absolute inset-y-0 left-0 rounded-lg pointer-events-none"
              style={{ width: `${(t.growth / max) * 100}%`, background: t.activate_present ? "#5eead41a" : "#fbbf241a" }} />
            <span className="relative text-[12px] font-medium tabular-nums w-10 text-right"
              style={{ color: t.activate_present ? "#5eead4" : "#fbbf24" }}>×{t.growth.toFixed(1)}</span>
            <span className="relative flex-1 min-w-0">
              <span className="block text-[12.5px] text-zinc-200 truncate">{t.topic}</span>
              <span className="block text-[10px] text-zinc-600">{t.field}</span>
            </span>
            <span className={`relative text-[10px] shrink-0 ${t.activate_present ? "text-zinc-600" : "text-amber-300/90"}`}>
              {t.activate_present ? "Activate in" : "whitespace"}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-zinc-600 leading-relaxed max-w-3xl">
        A candidate surface for human curation, not a ranking to act on. OpenAlex&apos;s topic tagging is imperfect, so
        some software and adjacent-science topics slip in; the value is flagging emerging deep-tech areas, and especially
        the whitespace, early. Share-normalized to control for the index growing; growth above ~8× is filtered as a coverage artifact.
      </p>
    </div>
  );
}

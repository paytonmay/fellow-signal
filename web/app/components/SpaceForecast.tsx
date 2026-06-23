"use client";

import { useState } from "react";
import { SpaceSignal, fmtUSD, shortAgency, verticalColor } from "@/lib/data";

type Sort = "federal_momentum" | "research_momentum" | "federal_total" | "activate_presence";

function Spark({ data }: { data: Record<string, number> }) {
  const years = Object.keys(data).map(Number).sort((a, b) => a - b);
  if (years.length < 2) return <div className="w-[88px]" />;
  const vals = years.map((y) => data[String(y)]);
  const max = Math.max(...vals), min = Math.min(...vals);
  const W = 88, H = 26;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = H - ((v - min) / (max - min || 1)) * (H - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline points={pts.join(" ")} fill="none" stroke="#5eead4" strokeWidth={1.5} />
      <circle cx={W} cy={pts.at(-1)!.split(",")[1]} r={2} fill="#5eead4" />
    </svg>
  );
}

export default function SpaceForecast({
  spaces,
  activeVertical,
  onSelect,
}: {
  spaces: SpaceSignal[];
  activeVertical?: string;
  onSelect?: (v: string) => void;
}) {
  const [sort, setSort] = useState<Sort>("federal_momentum");
  const rows = [...spaces].sort((a, b) => (b[sort] ?? 0) - (a[sort] ?? 0));

  const Head = ({ k, label }: { k: Sort; label: string }) => (
    <button onClick={() => setSort(k)}
      className={`text-left transition ${sort === k ? "text-teal-300" : "text-zinc-500 hover:text-zinc-300"}`}>
      {label}
    </button>
  );

  return (
    <div className="overflow-x-auto scroll-thin">
      <div className="min-w-[640px]">
        <div className="grid items-center gap-3 px-2 pb-2 text-[10.5px] uppercase tracking-wider"
          style={{ gridTemplateColumns: "1.5fr 1fr 1.1fr 0.95fr 0.95fr 0.65fr" }}>
          <span className="text-zinc-500">Space</span>
          <Head k="research_momentum" label="Research growth" />
          <span className="text-zinc-500">Federal funding (FY15-25)</span>
          <Head k="federal_momentum" label="Federal $ growth" />
          <span className="text-zinc-500">Lead agencies</span>
          <Head k="activate_presence" label="Activate" />
        </div>
        {rows.map((s) => {
          const active = activeVertical === s.vertical;
          return (
            <div key={s.vertical}
              onClick={() => onSelect?.(s.vertical)}
              className={`grid items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer border-t border-[#15181e] transition ${active ? "bg-teal-400/10" : "hover:bg-white/[0.02]"}`}
              style={{ gridTemplateColumns: "1.5fr 1fr 1.1fr 0.95fr 0.95fr 0.65fr" }}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: verticalColor(s.vertical) }} />
                <span className="text-[12.5px] text-zinc-200 truncate">{s.vertical.replace(" / CO2e", "")}</span>
              </div>
              <span className="text-[12.5px] text-zinc-300">
                {s.research_momentum ? `×${s.research_momentum.toFixed(1)}` : "n/a"}
              </span>
              <div className="flex items-center gap-2">
                <Spark data={s.federal_by_year} />
                <span className="text-[11px] text-zinc-500">{fmtUSD(s.federal_total, { compact: true })}</span>
              </div>
              <span className={`text-[12.5px] font-medium ${s.federal_momentum >= 10 ? "text-teal-300" : "text-zinc-300"}`}>
                ×{s.federal_momentum >= 99 ? "99+" : s.federal_momentum.toFixed(0)}
              </span>
              <span className="text-[11px] text-zinc-400 truncate">
                {s.top_agencies.slice(0, 2).map((a) => shortAgency(a.name)).join(" · ") || "n/a"}
              </span>
              <span className="text-[12px] text-zinc-300">
                {s.activate_presence != null ? `${Math.round(s.activate_presence * 100)}%` : "n/a"}
              </span>
            </div>
          );
        })}
        <div className="mt-3 px-2 text-[11px] text-zinc-600 leading-relaxed">
          <span className="text-zinc-400">Growth = a multiple, not year-over-year.</span> Research growth is the field&apos;s
          share of global publications in 2021-24 vs its 2013-16 baseline (×14.7 ≈ 15× its decade-ago level);
          Federal $ growth compares FY22-25 funding to FY16-19. Research from OpenAlex, funding from USAspending
          (keyword-matched, directional). Click a space to scope the board.
        </div>
      </div>
    </div>
  );
}

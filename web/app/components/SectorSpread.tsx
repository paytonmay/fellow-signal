"use client";

import { Vertical, verticalColor } from "@/lib/data";

// Venture count per sector for the in-view set. Cross-filters with the year/hub
// selectors, so picking Year = 2025 shows the 2025 cohort's sector spread.
export default function SectorSpread({
  verts, total, activeVertical, onSelect,
}: {
  verts: Vertical[];
  total: number;
  activeVertical?: string;
  onSelect?: (v: string) => void;
}) {
  const rows = [...verts].filter((v) => v.count > 0).sort((a, b) => b.count - a.count);
  const max = Math.max(...rows.map((v) => v.count), 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
      {rows.map((v) => {
        const act = activeVertical === v.vertical;
        return (
          <button key={v.vertical} onClick={() => onSelect?.(v.vertical)}
            className={`grid items-center gap-2 text-left rounded px-1.5 py-0.5 transition ${act ? "bg-teal-400/10" : "hover:bg-white/[0.02]"}`}
            style={{ gridTemplateColumns: "152px 1fr 62px" }}>
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: verticalColor(v.vertical) }} />
              <span className="text-[12px] text-zinc-300 truncate">{v.vertical.replace(" / CO2e", "")}</span>
            </span>
            <span className="h-2.5 rounded bg-[#0e1014] overflow-hidden">
              <span className="block h-full rounded" style={{ width: `${(v.count / max) * 100}%`, background: verticalColor(v.vertical), opacity: 0.78 }} />
            </span>
            <span className="text-[11px] text-zinc-500 text-right tabular-nums">
              {v.count} <span className="text-zinc-600">· {total ? Math.round((v.count / total) * 100) : 0}%</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

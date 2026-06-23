"use client";

import { verticalColor } from "@/lib/data";

// Which academic disciplines the founders of each space came from — "to source
// in space X, look for scientists trained in Y". From the fellow bios.
export default function DisciplineMap({
  map,
  onSelect,
  activeVertical,
}: {
  map: Record<string, [string, number][]>;
  onSelect?: (v: string) => void;
  activeVertical?: string;
}) {
  const rows = Object.entries(map)
    .map(([vertical, discs]) => ({ vertical, discs, total: discs.reduce((s, [, n]) => s + n, 0) }))
    .sort((a, b) => b.total - a.total);
  const maxDisc = Math.max(...rows.flatMap((r) => r.discs.map(([, n]) => n)), 1);

  return (
    <div>
      <div className="text-[11px] text-zinc-600 mb-4">
        The academic backgrounds the founders of each space actually came from — a sourcing key: to find candidates for a space, look for these disciplines.
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3">
        {rows.map((r) => (
          <button key={r.vertical} onClick={() => onSelect?.(r.vertical)}
            className={`text-left rounded-lg px-2.5 py-2 transition ${activeVertical === r.vertical ? "bg-teal-400/10" : "hover:bg-white/[0.02]"}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: verticalColor(r.vertical) }} />
              <span className="text-[12.5px] font-medium text-zinc-200">{r.vertical.replace(" / CO2e", "")}</span>
            </div>
            <div className="space-y-1 pl-4">
              {r.discs.slice(0, 4).map(([d, n]) => (
                <div key={d} className="flex items-center gap-2">
                  <span className="w-40 text-[11.5px] text-zinc-400 truncate">{d}</span>
                  <div className="flex-1 h-2 bg-[#0e1014] rounded overflow-hidden max-w-[120px]">
                    <div className="h-full rounded bg-teal-400/55" style={{ width: `${(n / maxDisc) * 100}%` }} />
                  </div>
                  <span className="text-[10.5px] text-zinc-600 tabular-nums w-4">{n}</span>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

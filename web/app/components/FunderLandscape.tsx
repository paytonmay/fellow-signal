"use client";

import { SpaceSignals, fmtUSD, shortAgency } from "@/lib/data";

export default function FunderLandscape({
  data,
  verticalsOrder,
  activeVertical,
  onSelect,
}: {
  data: SpaceSignals;
  verticalsOrder: string[];
  activeVertical?: string;
  onSelect?: (v: string) => void;
}) {
  const matrix = data.agency_matrix;
  // top agencies by total federal $ across all spaces
  const agencyTotals = Object.entries(matrix).map(([a, m]) => ({
    agency: a,
    total: Object.values(m).reduce((s, v) => s + Math.max(v, 0), 0),
  }));
  const agencies = agencyTotals.sort((a, b) => b.total - a.total).slice(0, 8).map((a) => a.agency);

  const cell = (v: string, a: string) => Math.max(matrix[a]?.[v] ?? 0, 0);
  const maxLog = Math.log10(
    Math.max(1, ...verticalsOrder.flatMap((v) => agencies.map((a) => cell(v, a))))
  );

  // intensity (0-1) on a log scale; drives both fill and whether label text
  // should be dark (on bright cells) or light (on dim cells).
  function intensity(amt: number): number {
    return amt > 0 ? 0.08 + 0.9 * (Math.log10(amt) / maxLog) : 0;
  }

  return (
    <div className="overflow-x-auto scroll-thin">
      <div className="min-w-[640px]">
        <div className="grid items-end" style={{ gridTemplateColumns: `180px repeat(${agencies.length}, 1fr)` }}>
          <div />
          {agencies.map((a) => (
            <div key={a} className="px-1 pb-2 text-center text-[11px] font-medium text-zinc-300"
              title={a}>
              {shortAgency(a)}
            </div>
          ))}
        </div>
        {verticalsOrder.map((v) => {
          const active = activeVertical === v;
          return (
            <div key={v} className="grid items-stretch border-t border-[#15181e]"
              style={{ gridTemplateColumns: `180px repeat(${agencies.length}, 1fr)` }}>
              <button onClick={() => onSelect?.(v)}
                className={`py-2 pr-3 text-[12px] text-right self-center transition ${active ? "text-teal-300" : "text-zinc-400 hover:text-zinc-200"}`}>
                {v.replace(" / CO2e", "")}
              </button>
              {agencies.map((a) => {
                const amt = cell(v, a);
                const t = intensity(amt);
                return (
                  <div key={a} className="m-[2px] rounded flex items-center justify-center"
                    style={{ background: amt > 0 ? `rgba(94,234,212,${t.toFixed(3)})` : "rgba(120,128,140,0.05)", minHeight: 28 }}
                    title={`${shortAgency(a)} · ${v}: ${fmtUSD(amt, { compact: true })}`}>
                    {amt > 0 && (
                      <span className="text-[9.5px] font-medium tabular-nums"
                        style={{ color: t >= 0.5 ? "#04201b" : "#86b8af" }}>
                        {fmtUSD(amt, { compact: true })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        <div className="mt-3 text-[11px] text-zinc-600">
          Federal obligations by agency × space (USAspending, FY15-25, log scale). Brighter = more money. Click a space to scope the dashboard.
        </div>
      </div>
    </div>
  );
}

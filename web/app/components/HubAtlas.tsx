import { HubAtlas as HubAtlasData } from "@/lib/data";

// Heatmap: each cell is a hub's over/under-index in a vertical vs the global mix.
// Teal = the hub specializes there; faint = under-indexed.
export default function HubAtlas({ atlas }: { atlas: HubAtlasData }) {
  const { hubs, verticals, cells } = atlas;
  const maxPos = Math.max(
    ...verticals.flatMap((v) => hubs.map((h) => cells[h].verticals[v].over))
  );

  function bg(over: number): string {
    if (over > 0) {
      const a = 0.1 + 0.85 * (over / maxPos);
      return `rgba(94,234,212,${a.toFixed(3)})`;
    }
    return "rgba(120,128,140,0.06)";
  }

  return (
    <div className="overflow-x-auto scroll-thin">
      <div className="min-w-[680px]">
        {/* header */}
        <div className="grid items-end" style={{ gridTemplateColumns: `190px repeat(${hubs.length}, 1fr)` }}>
          <div />
          {hubs.map((h) => (
            <div key={h} className="px-2 pb-2 text-center">
              <div className="text-[12.5px] font-medium text-zinc-200">{h}</div>
              <div className="text-[10.5px] text-zinc-600">{cells[h].n} cos</div>
            </div>
          ))}
        </div>
        {/* rows */}
        {verticals.map((v) => (
          <div key={v} className="grid items-stretch border-t border-[#15181e]"
            style={{ gridTemplateColumns: `190px repeat(${hubs.length}, 1fr)` }}>
            <div className="py-2 pr-3 text-[12px] text-zinc-400 text-right self-center">
              {v.replace(" / CO2e", "")}
            </div>
            {hubs.map((h) => {
              const cell = cells[h].verticals[v];
              const pp = Math.round(cell.over * 100);
              const strong = pp >= 4;
              return (
                <div key={h} className="m-[2px] rounded flex items-center justify-center"
                  style={{ background: bg(cell.over), minHeight: 30 }}
                  title={`${h} · ${v}: ${cell.count} cos, ${pp >= 0 ? "+" : ""}${pp}pp vs global`}>
                  {strong && (
                    <span className="text-[11px] font-semibold text-[#04201b]">+{pp}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div className="mt-3 text-[11px] text-zinc-600">
          Cells show each hub&apos;s over-index (percentage points vs the global vertical mix). Brighter teal = stronger specialization.
        </div>
      </div>
    </div>
  );
}

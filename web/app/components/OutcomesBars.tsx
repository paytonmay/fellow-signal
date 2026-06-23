import { Vertical, fmtUSD, verticalColor } from "@/lib/data";

// Number-forward funding leaderboard: the dollar figure is the hero, ranking +
// a subtle background fill convey magnitude (so small values still read cleanly
// instead of becoming tiny broken bars).
export default function OutcomesBars({
  verticals,
  onSelect,
}: {
  verticals: Vertical[];
  onSelect?: (v: string) => void;
}) {
  const rows = [...verticals].sort((a, b) => b.federal_total - a.federal_total).slice(0, 12);
  const max = Math.max(...rows.map((r) => r.federal_total), 1);

  return (
    <div className="space-y-1">
      <div className="text-[10.5px] text-zinc-600 mb-2">
        A venture counts toward each of its verticals, so these exceed the portfolio total.
      </div>
      {rows.map((r, i) => {
        const color = verticalColor(r.vertical);
        return (
          <button key={r.vertical} onClick={() => onSelect?.(r.vertical)}
            className="relative w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg overflow-hidden group hover:bg-white/[0.02] transition">
            {/* magnitude as a soft background fill, not a bar */}
            <div className="absolute inset-y-0 left-0 rounded-lg pointer-events-none"
              style={{ width: `${Math.max((r.federal_total / max) * 100, 2)}%`, background: `${color}1c` }} />
            <span className="relative flex items-center gap-2.5 min-w-0">
              <span className="text-[10.5px] tabular-nums text-zinc-600 w-3.5 text-right">{i + 1}</span>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-[12.5px] text-zinc-300 truncate group-hover:text-teal-200 transition">
                {r.vertical.replace(" / CO2e", "")}
              </span>
            </span>
            <span className="relative flex items-baseline gap-2 shrink-0">
              <span className="text-[14.5px] font-semibold text-zinc-50 tabular-nums">{fmtUSD(r.federal_total, { compact: true })}</span>
              <span className="text-[10.5px] text-zinc-600 w-11 text-right">{r.federal_cos} cos</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

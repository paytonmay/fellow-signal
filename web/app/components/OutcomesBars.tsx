import { Vertical, fmtUSD, verticalColor } from "@/lib/data";

export default function OutcomesBars({ verticals }: { verticals: Vertical[] }) {
  const rows = [...verticals].sort((a, b) => b.nsf_total - a.nsf_total).slice(0, 12);
  const max = Math.max(...rows.map((r) => r.nsf_total), 1);

  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.vertical} className="flex items-center gap-3">
          <div className="w-44 shrink-0 text-[12.5px] text-zinc-400 text-right">
            {r.vertical.replace(" / CO2e", "")}
          </div>
          <div className="flex-1 h-6 bg-[#0e1014] rounded-md overflow-hidden">
            <div
              className="h-full rounded-md flex items-center justify-end pr-2"
              style={{
                width: `${Math.max((r.nsf_total / max) * 100, 4)}%`,
                background: `linear-gradient(90deg, ${verticalColor(r.vertical)}22, ${verticalColor(r.vertical)}cc)`,
              }}
            >
              <span className="text-[11px] font-medium text-zinc-100/90">
                {fmtUSD(r.nsf_total, { compact: true })}
              </span>
            </div>
          </div>
          <div className="w-16 shrink-0 text-[11px] text-zinc-600">{r.nsf_cos} cos</div>
        </div>
      ))}
    </div>
  );
}

import { FunderModel as FM, fmtUSD } from "@/lib/data";

// Activate's own finances (IRS 990): revenue vs expenses by year + the growth
// story. The nonprofit "money in" side, opposite the portfolio's outcomes.
export default function FunderModel({ model, portfolioNsf }: { model: FM; portfolioNsf: number }) {
  const fin = model.financials;
  const W = 880, H = 230, PAD = { t: 14, r: 14, b: 26, l: 56 };
  const innerW = W - PAD.l - PAD.r, innerH = H - PAD.t - PAD.b;
  const max = Math.max(...fin.map((f) => Math.max(f.revenue, f.expenses)));
  const colW = innerW / fin.length;
  const barW = Math.min(colW * 0.3, 26);
  const y = (v: number) => PAD.t + innerH - (v / max) * innerH;

  const first = fin[0], last = fin[fin.length - 1];
  const mult = first.revenue > 0 ? Math.round(last.revenue / first.revenue) : null;
  const since2019 = fin.find((f) => f.year === 2019);
  const mult2019 = since2019 ? (last.revenue / since2019.revenue).toFixed(1) : null;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  return (
    <div>
      <div className="flex flex-wrap gap-x-8 gap-y-2 mb-5">
        <div>
          <div className="text-2xl font-semibold text-teal-300">{fmtUSD(last.revenue, { compact: true })}</div>
          <div className="text-[11px] text-zinc-500">FY{last.year} revenue</div>
        </div>
        {mult2019 && (
          <div>
            <div className="text-2xl font-semibold text-zinc-100">{mult2019}×</div>
            <div className="text-[11px] text-zinc-500">revenue growth since 2019</div>
          </div>
        )}
        <div>
          <div className="text-2xl font-semibold text-zinc-100">{fmtUSD(last.net_assets, { compact: true })}</div>
          <div className="text-[11px] text-zinc-500">net assets, FY{last.year}</div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} y1={y(t)} x2={W - PAD.r} y2={y(t)} stroke="#15181e" />
            <text x={PAD.l - 8} y={y(t) + 3} textAnchor="end" fill="#6b7280" fontSize="10">
              {fmtUSD(t, { compact: true })}
            </text>
          </g>
        ))}
        {fin.map((f, i) => {
          const cx = PAD.l + i * colW + colW / 2;
          return (
            <g key={f.year}>
              <rect x={cx - barW - 1} y={y(f.revenue)} width={barW} height={PAD.t + innerH - y(f.revenue)}
                fill="#5eead4" rx={2}>
                <title>{`FY${f.year} revenue ${fmtUSD(f.revenue)}`}</title>
              </rect>
              <rect x={cx + 1} y={y(f.expenses)} width={barW} height={PAD.t + innerH - y(f.expenses)}
                fill="#3f6b63" rx={2}>
                <title>{`FY${f.year} expenses ${fmtUSD(f.expenses)}`}</title>
              </rect>
              <text x={cx} y={H - 10} textAnchor="middle" fill="#6b7280" fontSize="10.5">&apos;{String(f.year).slice(2)}</text>
            </g>
          );
        })}
      </svg>

      <div className="flex items-center gap-4 mt-3 text-[11px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#5eead4]" />Revenue (philanthropy + government)</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#3f6b63]" />Expenses</span>
      </div>
      <p className="mt-4 text-[12.5px] text-zinc-400 max-w-3xl leading-relaxed">
        A different model: an equity-free nonprofit, scaled by philanthropy and government rather than venture capital.
        That {fmtUSD(last.revenue, { compact: true })} of annual money-in backs the fellows whose ventures have, in turn,
        pulled in {fmtUSD(portfolioNsf, { compact: true })}+ of NSF non-dilutive funding alone, before private capital.
      </p>
      <div className="mt-2 text-[10.5px] text-zinc-600">{model.source} · EIN {model.ein}</div>
    </div>
  );
}

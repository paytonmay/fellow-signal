import { YearRow, verticalColor } from "@/lib/data";

// Normalized stacked bars: each cohort year = 100%, segments = vertical share.
export default function CohortDrift({
  years,
  topVerticals,
}: {
  years: YearRow[];
  topVerticals: string[];
}) {
  const order = topVerticals.slice(0, 8);
  const W = 920;
  const H = 320;
  const PAD = { t: 16, r: 16, b: 28, l: 16 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const colW = innerW / years.length;
  const barW = colW * 0.62;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {years.map((yr, i) => {
          const mentions = order.map((v) => yr.verticals[v] ?? 0);
          const otherCount =
            Object.entries(yr.verticals)
              .filter(([v]) => !order.includes(v))
              .reduce((s, [, n]) => s + n, 0);
          const total = mentions.reduce((s, n) => s + n, 0) + otherCount || 1;
          const x = PAD.l + i * colW + (colW - barW) / 2;
          let yAcc = PAD.t;
          const segs = [
            ...order.map((v, k) => ({ v, n: mentions[k], color: verticalColor(v) })),
            { v: "Other", n: otherCount, color: "#3a3f4a" },
          ];
          return (
            <g key={yr.year}>
              {segs.map((s) => {
                if (!s.n) return null;
                const h = (s.n / total) * innerH;
                const rect = (
                  <rect key={s.v} x={x} y={yAcc} width={barW} height={Math.max(h - 1, 0)}
                    fill={s.color} fillOpacity={0.88} rx={1} />
                );
                yAcc += h;
                return rect;
              })}
              <text x={x + barW / 2} y={H - 10} textAnchor="middle" fill="#6b7280" fontSize="11">
                &apos;{String(yr.year).slice(2)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4">
        {order.map((v) => (
          <span key={v} className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: verticalColor(v) }} />
            {v.replace(" / CO2e", "")}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#3a3f4a]" />
          Other
        </span>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { RadarRow, verticalColor } from "@/lib/data";

const W = 920;
const H = 560;
const PAD = { t: 40, r: 40, b: 64, l: 64 };

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

export default function FrontierRadar({ rows }: { rows: RadarRow[] }) {
  const [hover, setHover] = useState<RadarRow | null>(null);

  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  // x = field momentum (log — Computing is a far outlier); y = Activate presence.
  const xs = rows.map((r) => Math.log10(r.field_momentum));
  const ys = rows.map((r) => r.activate_presence_recent);
  const xMin = Math.min(...xs) - 0.04;
  const xMax = Math.max(...xs) + 0.04;
  const yMin = 0;
  const yMax = Math.max(...ys) * 1.1;

  const fx = (m: number) => PAD.l + ((Math.log10(m) - xMin) / (xMax - xMin)) * innerW;
  const fy = (p: number) => PAD.t + innerH - ((p - yMin) / (yMax - yMin)) * innerH;

  const medMom = median(rows.map((r) => r.field_momentum));
  const medPres = median(rows.map((r) => r.activate_presence_recent));
  const cx = fx(medMom);
  const cy = fy(medPres);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* quadrant tints */}
        <rect x={cx} y={PAD.t} width={W - PAD.r - cx} height={cy - PAD.t} fill="#5eead4" opacity={0.05} />
        <rect x={cx} y={cy} width={W - PAD.r - cx} height={PAD.t + innerH - cy} fill="#fbbf24" opacity={0.06} />

        {/* median crosshairs */}
        <line x1={cx} y1={PAD.t} x2={cx} y2={PAD.t + innerH} stroke="#2a2f39" strokeDasharray="4 4" />
        <line x1={PAD.l} y1={cy} x2={PAD.l + innerW} y2={cy} stroke="#2a2f39" strokeDasharray="4 4" />

        {/* axes */}
        <line x1={PAD.l} y1={PAD.t + innerH} x2={PAD.l + innerW} y2={PAD.t + innerH} stroke="#3a3f4a" />
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + innerH} stroke="#3a3f4a" />

        {/* axis labels */}
        <text x={PAD.l + innerW / 2} y={H - 18} textAnchor="middle" fill="#8b919e" fontSize="13">
          Research momentum  →  (field&apos;s share of publications, recent vs 2013–16)
        </text>
        <text x={18} y={PAD.t + innerH / 2} textAnchor="middle" fill="#8b919e" fontSize="13"
          transform={`rotate(-90 18 ${PAD.t + innerH / 2})`}>
          Activate presence  →  (% of recent cohorts)
        </text>

        {/* quadrant captions */}
        <text x={PAD.l + innerW - 8} y={PAD.t + 20} textAnchor="end" fill="#5eead4" fontSize="12" fontWeight={600} opacity={0.85}>
          VALIDATED — hot &amp; present
        </text>
        <text x={PAD.l + innerW - 8} y={PAD.t + innerH - 10} textAnchor="end" fill="#fbbf24" fontSize="12" fontWeight={600} opacity={0.9}>
          WHITESPACE — hot, Activate light
        </text>

        {/* points */}
        {rows.map((r) => {
          const x = fx(r.field_momentum);
          const y = fy(r.activate_presence_recent);
          const active = hover?.vertical === r.vertical;
          const color = verticalColor(r.vertical);
          return (
            <g key={r.vertical} onMouseEnter={() => setHover(r)} onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}>
              <circle cx={x} cy={y} r={active ? 11 : 7} fill={color} fillOpacity={active ? 1 : 0.85}
                stroke="#08090b" strokeWidth={2} />
              <text x={x + 12} y={y + 4} fill={active ? "#e6e8ec" : "#9aa0ab"} fontSize="11.5"
                fontWeight={active ? 600 : 400}>
                {r.vertical.replace(" / CO2e", "").replace(" & Connectivity", "").replace(" & Aeronautics", "")}
              </text>
            </g>
          );
        })}
      </svg>

      {hover && (
        <div className="absolute top-3 left-3 panel px-4 py-3 text-sm max-w-xs pointer-events-none">
          <div className="font-semibold text-zinc-100">{hover.vertical}</div>
          <div className="mt-1 text-zinc-400">
            Field momentum <span className="text-teal-300 font-medium">×{hover.field_momentum.toFixed(2)}</span>
            {" · "}Activate <span className="text-zinc-200 font-medium">{Math.round(hover.activate_presence_recent * 100)}%</span> of recent cohorts
          </div>
        </div>
      )}
    </div>
  );
}

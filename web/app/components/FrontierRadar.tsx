"use client";

import { useMemo, useState } from "react";
import { RadarRow, verticalColor } from "@/lib/data";

const W = 960;
const H = 600;
const PAD = { t: 44, r: 150, b: 66, l: 70 };

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function shortLabel(v: string): string {
  return v
    .replace(" / CO2e", "")
    .replace(" & Connectivity", "")
    .replace(" & Aeronautics", "")
    .replace(" & Batteries", "")
    .replace(" Manufacturing & Robotics", " Mfg/Robotics")
    .replace(" Generation & Delivery", " Gen/Delivery");
}

type Placed = RadarRow & {
  px: number;
  py: number;
  side: "L" | "R";
  ly: number;
  label: string;
};

export default function FrontierRadar({ rows }: { rows: RadarRow[] }) {
  const [hover, setHover] = useState<string | null>(null);

  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const xs = rows.map((r) => Math.log10(r.field_momentum));
  const ys = rows.map((r) => r.activate_presence_recent);
  const xMin = Math.min(...xs) - 0.04;
  const xMax = Math.max(...xs) + 0.04;
  const yMax = Math.max(...ys) * 1.12;

  const fx = (m: number) => PAD.l + ((Math.log10(m) - xMin) / (xMax - xMin)) * innerW;
  const fy = (p: number) => PAD.t + innerH - (p / yMax) * innerH;

  const medMom = median(rows.map((r) => r.field_momentum));
  const medPres = median(rows.map((r) => r.activate_presence_recent));
  const cx = fx(medMom);
  const cy = fy(medPres);

  // ---- Label de-collision: place each label left/right of its point, then
  // push labels apart vertically within each side so none overlap. ----
  const placed = useMemo<Placed[]>(() => {
    const GAP = 19;
    const pts = rows.map((r) => {
      const px = fx(r.field_momentum);
      const py = fy(r.activate_presence_recent);
      const label = shortLabel(r.vertical);
      const w = label.length * 6.1 + 16;
      const side: "L" | "R" = px + w > PAD.l + innerW ? "L" : "R";
      return { ...r, px, py, side, ly: py, label };
    });
    for (const side of ["L", "R"] as const) {
      const col = pts.filter((p) => p.side === side).sort((a, b) => a.py - b.py);
      let last = -Infinity;
      for (const p of col) {
        p.ly = Math.max(p.py, last + GAP);
        last = p.ly;
      }
      // if the column overflowed the bottom, shift the whole column up
      const overflow = (col.at(-1)?.ly ?? 0) - (PAD.t + innerH);
      if (overflow > 0) for (const p of col) p.ly -= overflow;
    }
    return pts;
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* quadrant tints */}
        <rect x={cx} y={PAD.t} width={PAD.l + innerW - cx} height={cy - PAD.t} fill="#5eead4" opacity={0.05} />
        <rect x={cx} y={cy} width={PAD.l + innerW - cx} height={PAD.t + innerH - cy} fill="#fbbf24" opacity={0.06} />

        {/* median crosshairs */}
        <line x1={cx} y1={PAD.t} x2={cx} y2={PAD.t + innerH} stroke="#2a2f39" strokeDasharray="4 4" />
        <line x1={PAD.l} y1={cy} x2={PAD.l + innerW} y2={cy} stroke="#2a2f39" strokeDasharray="4 4" />

        {/* axes */}
        <line x1={PAD.l} y1={PAD.t + innerH} x2={PAD.l + innerW} y2={PAD.t + innerH} stroke="#3a3f4a" />
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + innerH} stroke="#3a3f4a" />

        {/* axis labels */}
        <text x={PAD.l + innerW / 2} y={H - 18} textAnchor="middle" fill="#8b919e" fontSize="13">
          Research momentum  →  (field&apos;s growing share of publications)
        </text>
        <text x={20} y={PAD.t + innerH / 2} textAnchor="middle" fill="#8b919e" fontSize="13"
          transform={`rotate(-90 20 ${PAD.t + innerH / 2})`}>
          Activate presence  →  (% of recent cohorts)
        </text>

        {/* quadrant captions */}
        <text x={PAD.l + innerW - 8} y={PAD.t + 18} textAnchor="end" fill="#5eead4" fontSize="11.5" fontWeight={600} opacity={0.85}>
          VALIDATED · hot, present
        </text>
        <text x={PAD.l + innerW - 8} y={PAD.t + innerH - 8} textAnchor="end" fill="#fbbf24" fontSize="11.5" fontWeight={600} opacity={0.9}>
          WHITESPACE · hot, Activate light
        </text>

        {/* leader lines + points + labels */}
        {placed.map((p) => {
          const active = hover === p.vertical;
          const color = verticalColor(p.vertical);
          const labelX = p.side === "R" ? p.px + 11 : p.px - 11;
          const anchor = p.side === "R" ? "start" : "end";
          return (
            <g key={p.vertical}
              onMouseEnter={() => setHover(p.vertical)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}>
              <line x1={p.px} y1={p.py} x2={labelX} y2={p.ly} stroke={color}
                strokeWidth={1} opacity={active ? 0.7 : 0.28} />
              <circle cx={p.px} cy={p.py} r={active ? 9 : 6} fill={color}
                fillOpacity={active ? 1 : 0.9} stroke="#08090b" strokeWidth={2} />
              <text x={labelX + (p.side === "R" ? 2 : -2)} y={p.ly + 3.5} textAnchor={anchor}
                fill={active ? "#f3f4f6" : "#9aa0ab"} fontSize="11.5" fontWeight={active ? 600 : 400}>
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hover && (() => {
        const r = rows.find((x) => x.vertical === hover)!;
        return (
          <div className="absolute top-3 left-3 panel px-4 py-3 text-sm max-w-xs pointer-events-none">
            <div className="font-semibold text-zinc-100">{r.vertical}</div>
            <div className="mt-1 text-zinc-400">
              Field momentum <span className="text-teal-300 font-medium">×{r.field_momentum.toFixed(2)}</span>
              {" · "}Activate <span className="text-zinc-200 font-medium">{Math.round(r.activate_presence_recent * 100)}%</span> of recent cohorts
            </div>
          </div>
        );
      })()}
    </div>
  );
}

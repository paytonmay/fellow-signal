"use client";

import { useMemo, useState } from "react";
import { Convergence, verticalColor } from "@/lib/data";

const W = 820;
const H = 660;

function short(v: string): string {
  return v
    .replace(" / CO2e", "")
    .replace(" & Connectivity", "")
    .replace(" & Aeronautics", "")
    .replace(" & Batteries", "")
    .replace(" & Robotics", "")
    .replace(" & Delivery", "");
}

export default function ConvergenceMap({ data }: { data: Convergence }) {
  const [hover, setHover] = useState<string | null>(null);

  const cx = W / 2;
  const cy = H / 2 + 6;
  const R = 232;

  const nodes = useMemo(() => {
    const n = data.nodes.length;
    const maxCount = Math.max(...data.nodes.map((d) => d.count));
    return data.nodes.map((d, i) => {
      const ang = (i / n) * 2 * Math.PI - Math.PI / 2;
      return {
        ...d,
        ang,
        x: cx + R * Math.cos(ang),
        y: cy + R * Math.sin(ang),
        r: 4 + 9 * Math.sqrt(d.count / maxCount),
      };
    });
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const pos = Object.fromEntries(nodes.map((n) => [n.vertical, n]));
  const maxLink = Math.max(...data.links.map((l) => l.count));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* links bowed toward center */}
        {data.links.map((l, i) => {
          const a = pos[l.a], b = pos[l.b];
          if (!a || !b) return null;
          const active = hover === l.a || hover === l.b;
          const dim = hover && !active;
          const w = 0.5 + 5 * (l.count / maxLink);
          return (
            <path key={i} d={`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`}
              fill="none" stroke={active ? "#5eead4" : "#8b919e"}
              strokeWidth={active ? w + 0.6 : w}
              strokeOpacity={dim ? 0.04 : active ? 0.55 : 0.13} />
          );
        })}

        {/* nodes + labels */}
        {nodes.map((n) => {
          const active = hover === n.vertical;
          const dim = hover && !active;
          const right = Math.cos(n.ang) >= -0.01;
          const lx = cx + (R + 12) * Math.cos(n.ang);
          const ly = cy + (R + 12) * Math.sin(n.ang);
          return (
            <g key={n.vertical}
              onMouseEnter={() => setHover(n.vertical)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }} opacity={dim ? 0.4 : 1}>
              <circle cx={n.x} cy={n.y} r={active ? n.r + 2 : n.r}
                fill={verticalColor(n.vertical)} stroke="#08090b" strokeWidth={1.5} />
              <text x={lx} y={ly + 3.5} textAnchor={right ? "start" : "end"}
                fill={active ? "#f3f4f6" : "#9aa0ab"} fontSize="11"
                fontWeight={active ? 600 : 400}>
                {short(n.vertical)}
              </text>
            </g>
          );
        })}
      </svg>

      {hover && (() => {
        const partners = data.links
          .filter((l) => l.a === hover || l.b === hover)
          .map((l) => ({ v: l.a === hover ? l.b : l.a, n: l.count }))
          .sort((a, b) => b.n - a.n)
          .slice(0, 4);
        return (
          <div className="absolute top-2 left-2 panel px-4 py-3 text-sm max-w-xs pointer-events-none">
            <div className="font-semibold text-zinc-100">{hover}</div>
            <div className="mt-1.5 text-[12px] text-zinc-400">Most combined with:</div>
            <div className="mt-1 space-y-0.5">
              {partners.map((p) => (
                <div key={p.v} className="text-[12px] text-zinc-300 flex justify-between gap-4">
                  <span>{short(p.v)}</span>
                  <span className="text-teal-300">{p.n}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

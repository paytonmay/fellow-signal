"use client";

import { FellowBackground as FB } from "@/lib/data";

// Authoritative founder background from Activate's own fellow bios: degree level
// + where they trained. The demographic half of the "typical founder" filter.
export default function FellowBackground({ bg }: { bg: FB }) {
  const unis = bg.top_universities.slice(0, 14);
  const maxU = Math.max(...unis.map(([, n]) => n), 1);
  const degTotal = bg.degree_mix.PhD + bg.degree_mix["Master's"] + bg.degree_mix["Bachelor's"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Degrees */}
      <div>
        <div className="flex items-baseline gap-3 mb-4">
          <div className="text-4xl font-semibold text-teal-300">{Math.round(bg.phd_pct * 100)}%</div>
          <div className="text-[13px] text-zinc-400 leading-tight">
            of {bg.total} fellows hold a <span className="text-zinc-200">PhD</span><br />
            <span className="text-zinc-600 text-[11.5px]">Activate funds doctoral scientists, not generic founders</span>
          </div>
        </div>
        <div className="space-y-2">
          {(["PhD", "Master's", "Bachelor's"] as const).map((d) => {
            const n = bg.degree_mix[d];
            return (
              <div key={d} className="flex items-center gap-3">
                <span className="w-20 text-[12px] text-zinc-400 text-right">{d}</span>
                <div className="flex-1 h-5 bg-[#0e1014] rounded overflow-hidden">
                  <div className="h-full rounded bg-gradient-to-r from-teal-500/30 to-teal-400/80"
                    style={{ width: `${(n / degTotal) * 100}%` }} />
                </div>
                <span className="w-8 text-[12px] text-zinc-300 tabular-nums text-right">{n}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-[11px] text-zinc-600">
          Parsed from Activate&apos;s own fellow biographies ({bg.with_university} name a university, {bg.with_linkedin} have LinkedIn).
        </div>
      </div>

      {/* Universities */}
      <div>
        <div className="text-[12px] uppercase tracking-wider text-zinc-500 mb-3">Where they trained</div>
        <div className="space-y-1.5">
          {unis.map(([u, n]) => (
            <div key={u} className="flex items-center gap-3">
              <span className="w-36 text-[12px] text-zinc-300 text-right truncate">{u}</span>
              <div className="flex-1 h-4 bg-[#0e1014] rounded overflow-hidden">
                <div className="h-full rounded bg-teal-400/70" style={{ width: `${(n / maxU) * 100}%` }} />
              </div>
              <span className="w-7 text-[11px] text-zinc-500 tabular-nums text-right">{n}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[11px] text-zinc-600">
          Top three (MIT, Berkeley, Stanford) account for roughly half of all university mentions, a concentrated training pipeline.
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Company, fmtUSD, topCitations, verticalColor } from "@/lib/data";
import CompanyDrawer from "./CompanyDrawer";

type Sort = "cohort" | "nsf" | "citations" | "name";

export default function PortfolioPanel({ companies }: { companies: Company[] }) {
  const [sort, setSort] = useState<Sort>("cohort");
  const [selected, setSelected] = useState<Company | null>(null);

  const rows = useMemo(() => {
    const s: Record<Sort, (a: Company, b: Company) => number> = {
      cohort: (a, b) => (b.cohort_year ?? 0) - (a.cohort_year ?? 0) || b.nsf_total - a.nsf_total,
      nsf: (a, b) => b.nsf_total - a.nsf_total,
      citations: (a, b) => topCitations(b) - topCitations(a),
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return [...companies].sort(s[sort]);
  }, [companies, sort]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] text-zinc-500">{rows.length} ventures in view</span>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}
          className="bg-[#0e1014] border border-[#1d2128] rounded-lg px-2.5 py-1.5 text-[12px] text-zinc-300 focus:outline-none focus:border-teal-500/60">
          <option value="cohort">Newest</option>
          <option value="nsf">NSF funding</option>
          <option value="citations">Founder citations</option>
          <option value="name">A-Z</option>
        </select>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto scroll-thin pr-1">
        {rows.map((c) => {
          const cites = topCitations(c);
          return (
            <button key={c.id} onClick={() => setSelected(c)}
              className="panel p-3.5 flex flex-col text-left hover:border-teal-500/40 transition group">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-[14px] text-zinc-100 leading-tight group-hover:text-teal-200 transition">{c.name}</h3>
                <span className="text-[10.5px] text-zinc-500 whitespace-nowrap mt-0.5">{c.cohort_year ?? "n/a"}</span>
              </div>
              <p className="text-[12px] text-zinc-400 mt-1.5 line-clamp-2 flex-1">{c.one_liner}</p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {c.verticals.slice(0, 2).map((v) => (
                  <span key={v} className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: verticalColor(v) }} />
                    {v.replace(" / CO2e", "").replace(" & Connectivity", "")}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-[#1a1d23] text-[10.5px]">
                {c.hub && <span className="text-zinc-500">{c.hub}</span>}
                {c.nsf_total > 0 && <span className="text-teal-300 font-medium">{fmtUSD(c.nsf_total, { compact: true })}</span>}
                {cites > 0 && <span className="text-zinc-500">{cites.toLocaleString()} cites</span>}
                <span className="ml-auto text-zinc-600 group-hover:text-teal-300 transition">view →</span>
              </div>
            </button>
          );
        })}
      </div>

      <CompanyDrawer company={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

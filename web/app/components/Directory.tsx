"use client";

import { useMemo, useState } from "react";
import { Company, fmtUSD, topCitations, verticalColor } from "@/lib/data";
import CompanyDrawer from "./CompanyDrawer";

type Props = { companies: Company[]; verticals: string[]; hubs: string[] };
type Sort = "cohort" | "nsf" | "citations" | "name";

export default function Directory({ companies, verticals, hubs }: Props) {
  const [q, setQ] = useState("");
  const [vert, setVert] = useState("");
  const [hub, setHub] = useState("");
  const [fundedOnly, setFundedOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("cohort");
  const [selected, setSelected] = useState<Company | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = companies
      .filter((c) => (vert ? c.verticals.includes(vert) : true))
      .filter((c) => (hub ? c.hub === hub : true))
      .filter((c) => (fundedOnly ? c.nsf_total > 0 || c.edgar_formD > 0 : true))
      .filter((c) =>
        needle
          ? c.name.toLowerCase().includes(needle) ||
            c.one_liner.toLowerCase().includes(needle) ||
            c.fellows.some((f) => f.toLowerCase().includes(needle))
          : true
      );
    const sorters: Record<Sort, (a: Company, b: Company) => number> = {
      cohort: (a, b) => (b.cohort_year ?? 0) - (a.cohort_year ?? 0) || b.nsf_total - a.nsf_total,
      nsf: (a, b) => b.nsf_total - a.nsf_total,
      citations: (a, b) => topCitations(b) - topCitations(a),
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return [...rows].sort(sorters[sort]);
  }, [companies, q, vert, hub, fundedOnly, sort]);

  // Live summary of the current filtered set: analysis Activate's directory lacks.
  const summary = useMemo(() => {
    const nsf = filtered.reduce((s, c) => s + c.nsf_total, 0);
    const funded = filtered.filter((c) => c.nsf_total > 0 || c.edgar_formD > 0).length;
    const profiled = filtered.filter((c) => (c.founders ?? []).some((f) => f.resolved)).length;
    return { nsf, funded, profiled };
  }, [filtered]);

  const sel =
    "bg-[#0e1014] border border-[#1d2128] rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-teal-500/60";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search company, fellow, or technology…" className={`${sel} flex-1 min-w-[220px]`} />
        <select value={vert} onChange={(e) => setVert(e.target.value)} className={sel}>
          <option value="">All verticals</option>
          {verticals.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={hub} onChange={(e) => setHub(e.target.value)} className={sel}>
          <option value="">All hubs</option>
          {hubs.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={sel}>
          <option value="cohort">Sort: newest</option>
          <option value="nsf">Sort: NSF funding</option>
          <option value="citations">Sort: founder citations</option>
          <option value="name">Sort: A–Z</option>
        </select>
        <button onClick={() => setFundedOnly((v) => !v)}
          className={`rounded-lg px-3 py-2 text-sm border transition ${
            fundedOnly ? "bg-teal-400/15 border-teal-500/50 text-teal-200"
              : "bg-[#0e1014] border-[#1d2128] text-zinc-400 hover:text-zinc-200"}`}>
          Funded only
        </button>
      </div>

      {/* live summary of the filtered set */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[12px] text-zinc-500 mb-5 panel px-4 py-2.5">
        <span><span className="text-zinc-200 font-medium">{filtered.length}</span> ventures</span>
        <span><span className="text-teal-300 font-medium">{fmtUSD(summary.nsf, { compact: true })}</span> NSF non-dilutive</span>
        <span><span className="text-zinc-200 font-medium">{filtered.length ? Math.round((summary.funded / filtered.length) * 100) : 0}%</span> funded</span>
        <span><span className="text-zinc-200 font-medium">{summary.profiled}</span> with founder research profile</span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[760px] overflow-y-auto scroll-thin pr-1">
        {filtered.map((c) => {
          const cites = topCitations(c);
          return (
            <button key={c.id} onClick={() => setSelected(c)}
              className="panel p-4 flex flex-col text-left hover:border-teal-500/40 transition group">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-zinc-100 leading-tight group-hover:text-teal-200 transition">{c.name}</h3>
                <span className="text-[11px] text-zinc-500 whitespace-nowrap mt-0.5">{c.cohort_year ?? "n/a"}</span>
              </div>
              <p className="text-[13px] text-zinc-400 mt-1.5 line-clamp-3 flex-1">{c.one_liner}</p>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {c.verticals.slice(0, 3).map((v) => (
                  <span key={v} className="inline-flex items-center gap-1 text-[10.5px] text-zinc-400">
                    <span className="w-2 h-2 rounded-full" style={{ background: verticalColor(v) }} />
                    {v.replace(" / CO2e", "").replace(" & Connectivity", "")}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#1a1d23] text-[11px]">
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

"use client";

import { useMemo, useState } from "react";
import { Company, fmtUSD, verticalColor } from "@/lib/data";

type Props = { companies: Company[]; verticals: string[]; hubs: string[] };

export default function Directory({ companies, verticals, hubs }: Props) {
  const [q, setQ] = useState("");
  const [vert, setVert] = useState("");
  const [hub, setHub] = useState("");
  const [fundedOnly, setFundedOnly] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return companies
      .filter((c) => (vert ? c.verticals.includes(vert) : true))
      .filter((c) => (hub ? c.hub === hub : true))
      .filter((c) => (fundedOnly ? c.nsf_total > 0 || c.edgar_formD > 0 : true))
      .filter((c) =>
        needle
          ? c.name.toLowerCase().includes(needle) ||
            c.one_liner.toLowerCase().includes(needle) ||
            c.fellows.some((f) => f.toLowerCase().includes(needle))
          : true
      )
      .sort((a, b) => (b.cohort_year ?? 0) - (a.cohort_year ?? 0) || b.nsf_total - a.nsf_total);
  }, [companies, q, vert, hub, fundedOnly]);

  const sel =
    "bg-[#0e1014] border border-[#1d2128] rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-teal-500/60";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search company, fellow, or technology…"
          className={`${sel} flex-1 min-w-[220px]`}
        />
        <select value={vert} onChange={(e) => setVert(e.target.value)} className={sel}>
          <option value="">All verticals</option>
          {verticals.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <select value={hub} onChange={(e) => setHub(e.target.value)} className={sel}>
          <option value="">All hubs</option>
          {hubs.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <button
          onClick={() => setFundedOnly((v) => !v)}
          className={`rounded-lg px-3 py-2 text-sm border transition ${
            fundedOnly
              ? "bg-teal-400/15 border-teal-500/50 text-teal-200"
              : "bg-[#0e1014] border-[#1d2128] text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Funded only
        </button>
      </div>

      <div className="text-xs text-zinc-500 mb-4">
        {filtered.length} of {companies.length} ventures
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[760px] overflow-y-auto scroll-thin pr-1">
        {filtered.map((c) => (
          <div key={c.id} className="panel p-4 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-zinc-100 leading-tight">{c.name}</h3>
              <span className="text-[11px] text-zinc-500 whitespace-nowrap mt-0.5">
                {c.cohort_year ?? "—"}
              </span>
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

            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#1a1d23]">
              {c.hub && <span className="text-[11px] text-zinc-500">{c.hub}</span>}
              {c.nsf_total > 0 && (
                <span className="text-[11px] text-teal-300 font-medium">
                  {fmtUSD(c.nsf_total, { compact: true })} NSF
                </span>
              )}
              {c.edgar_formD > 0 && (
                <span className="text-[11px] text-amber-300/90">raised</span>
              )}
              {c.website && (
                <a href={c.website} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-zinc-500 hover:text-zinc-200 ml-auto">
                  site ↗
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

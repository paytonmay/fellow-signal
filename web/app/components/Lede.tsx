"use client";

import { Dataset, fmtUSD } from "@/lib/data";

// Executive-summary lede: the thesis + the four headline findings, so a skimming
// reviewer gets the punchline before diving into the panels.
export default function Lede({ data }: { data: Dataset }) {
  const h = data.headline;
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  const cohortShare = (yr: number) => {
    const rows = data.companies.filter((c) => c.cohort_year === yr);
    const n = rows.length || 1;
    const m: Record<string, number> = {};
    rows.forEach((c) => c.verticals.forEach((v) => (m[v] = (m[v] || 0) + 1)));
    return (v: string) => (m[v] || 0) / n;
  };
  const s24 = cohortShare(2024), s25 = cohortShare(2025);
  const riser = data.verticals
    .map((v) => v.vertical)
    .map((v) => ({ v, d: s25(v) - s24(v), a: s24(v), b: s25(v) }))
    .sort((x, y) => y.d - x.d)[0];

  const open = (data.emerging_science?.topics ?? []).find((t) => !t.activate_present && (t.federal_recent > 0 || t.federal_new));
  const openName = open?.topic.replace(/ (Research|Techniques|Methods|and Applications)$/i, "");

  const findings: [string, React.ReactNode][] = [
    ["The picks win, independently", <>{fmtUSD(h.federal_total, { compact: true })} in federal non-dilutive funding across {pct(h.federal_funded / h.companies)} of ventures, DOE-led, before any equity round.</>],
    ["The frontier is moving", <>the 2025 cohort pivoted into {riser.v.replace(" / CO2e", "")} ({pct(riser.a)} → {pct(riser.b)} of the cohort), discovery should track the acceleration.</>],
    ["Discovery isn't selection", <>a founder&apos;s research footprint finds scientists years early, but doesn&apos;t predict outcomes, use it to find, not to rank.</>],
    ["The whitespace is visible", <>emerging science with fresh federal money and no Activate fellow yet{openName ? <> ({openName})</> : ""}, the earliest sourcing leads.</>],
  ];

  return (
    <div className="panel p-5 md:p-6 mb-4 bg-grid">
      <p className="text-[15px] md:text-[16px] text-zinc-300 max-w-4xl leading-relaxed">
        <span className="text-zinc-50 font-semibold">Fellow Signal</span>{" "}
        is an intelligence layer on Activate&apos;s fellowship, {h.companies} hard-tech ventures and{" "}
        {data.fellow_background.total} scientist-fellows ({h.cohorts}),
        built entirely from public data. Four things the data says:
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mt-4">
        {findings.map(([head, body], i) => (
          <div key={i} className="flex gap-3">
            <span className="text-[12px] font-mono text-teal-400/70 mt-0.5">{String(i + 1).padStart(2, "0")}</span>
            <p className="text-[13.5px] text-zinc-400 leading-relaxed">
              <span className="text-zinc-100 font-medium">{head}.</span> {body}
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-5 text-[12px]">
        <a href="/findings" className="text-teal-300 hover:text-teal-200">Read the Findings →</a>
        <span className="text-zinc-700">·</span>
        <a href="/brief" className="text-teal-300 hover:text-teal-200">Point of View →</a>
        <span className="text-zinc-700">·</span>
        <a href="/methods" className="text-zinc-500 hover:text-zinc-300">Data, methods &amp; sources</a>
      </div>
    </div>
  );
}

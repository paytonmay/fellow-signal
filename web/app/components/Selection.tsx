"use client";

import { useMemo } from "react";
import { Dataset, fmtUSD, verticalColor } from "@/lib/data";

// The selection / talent-engine pillar: operationalize the signals into a
// per-space screening profile, and close the loop — show that the screening
// signal (research depth) actually tracks outcomes. Descriptive, not predictive.
export default function Selection({
  data,
  activeVertical,
  onSelect,
}: {
  data: Dataset;
  activeVertical?: string;
  onSelect?: (v: string) => void;
}) {
  const model = useMemo(() => {
    // opportunity / sourcing priority per space (same logic as Founder Discovery)
    const sp = Object.fromEntries(data.space_signals.spaces.map((s) => [s.vertical, s]));
    const maxR = Math.max(...data.radar.map((r) => r.field_momentum));
    const maxF = Math.max(...data.space_signals.spaces.map((s) => Math.min(s.federal_momentum, 40)));
    const maxP = Math.max(...data.radar.map((r) => r.activate_presence_recent));
    const opp = (v: string) => {
      const r = data.radar.find((x) => x.vertical === v);
      if (!r) return 0;
      const f = Math.min(sp[v]?.federal_momentum ?? 0, 40);
      return (0.5 * (r.field_momentum / maxR) + 0.5 * (f / maxF)) * (1 - 0.65 * (r.activate_presence_recent / (maxP || 1)));
    };
    const ranked = data.radar.map((r) => r.vertical).sort((a, b) => opp(b) - opp(a));
    const space = activeVertical || ranked[0];
    const rank = ranked.indexOf(space) + 1;
    const r = data.radar.find((x) => x.vertical === space);
    const presence = r?.activate_presence_recent ?? 0;
    const priority = presence < 0.12 ? "Whitespace — prioritize" : rank <= 8 ? "Active" : "Established";

    // Loop closure: do companies with a stronger founder research footprint win
    // more non-dilutive funding? (split at the founder-citation median)
    const withFounder = data.companies
      .map((c) => ({
        fed: c.federal_total,
        cites: Math.max(0, ...(c.founders ?? []).filter((f) => f.resolved).map((f) => f.cited_by_count ?? 0)),
      }))
      .filter((c) => c.cites > 0);
    const med = [...withFounder.map((c) => c.cites)].sort((a, b) => a - b)[Math.floor(withFounder.length / 2)] || 0;
    const hi = withFounder.filter((c) => c.cites >= med);
    const lo = withFounder.filter((c) => c.cites < med);
    const avg = (xs: { fed: number }[]) => (xs.length ? xs.reduce((s, c) => s + c.fed, 0) / xs.length : 0);
    const fundedRate = (xs: { fed: number }[]) => (xs.length ? xs.filter((c) => c.fed > 0).length / xs.length : 0);

    return {
      space, rank, priority, presence,
      research: r?.field_momentum ?? 0,
      fed: sp[space]?.federal_momentum ?? 0,
      disciplines: data.discipline_map[space] ?? [],
      phd_pct: data.fellow_background.phd_pct,
      loop: { med, hiAvg: avg(hi), loAvg: avg(lo), hiRate: fundedRate(hi), loRate: fundedRate(lo), n: withFounder.length },
    };
  }, [data, activeVertical]);

  const verts = data.radar.map((r) => r.vertical);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Screening profile for a space */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[12.5px] text-zinc-500">Screen candidates for</span>
          <select value={model.space} onChange={(e) => onSelect?.(e.target.value)}
            className="bg-[#0e1014] border border-[#1d2128] rounded-lg px-2.5 py-1 text-[12.5px] text-zinc-200 focus:outline-none focus:border-teal-500/60">
            {verts.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[14px] font-medium text-zinc-100">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: verticalColor(model.space) }} />
              {model.space.replace(" / CO2e", "")}
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${model.priority.startsWith("White") ? "bg-amber-400/15 text-amber-300" : "bg-zinc-700/40 text-zinc-400"}`}>
              {model.priority}
            </span>
          </div>

          <Row label="Sourcing signal">
            research ×{model.research.toFixed(1)} · federal $ ×{model.fed >= 99 ? "99+" : Math.round(model.fed)} · Activate {Math.round(model.presence * 100)}% present
          </Row>
          <Row label="Look for disciplines">
            {model.disciplines.length ? model.disciplines.slice(0, 3).map(([d]) => d).join(" · ") : "—"}
          </Row>
          <Row label="Research depth">
            in the band of resolved founders (median ~{model.loop.med.toLocaleString()} citations); deep, cited work that precedes the venture
          </Row>
          <Row label="Training">
            {Math.round(model.phd_pct * 100)}% of fellows hold a PhD — a baseline, not a gate
          </Row>
        </div>
        <p className="mt-3 text-[11px] text-zinc-600">
          A starting screen, not a scorecard to optimize: it points sourcing at the right space and the scientist profile that has worked there.
        </p>
      </div>

      {/* Loop closure */}
      <div>
        <div className="text-[12.5px] font-medium text-zinc-200 mb-1">Does the signal track outcomes?</div>
        <div className="text-[11px] text-zinc-600 mb-4">
          Closing the loop: companies split at the median founder-citation count ({model.loop.n} with a research profile), compared on the outcome we can measure independently — federal non-dilutive funding.
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { t: "Above-median research depth", avg: model.loop.hiAvg, rate: model.loop.hiRate, hot: true },
            { t: "Below-median", avg: model.loop.loAvg, rate: model.loop.loRate, hot: false },
          ].map((s) => (
            <div key={s.t} className="panel p-4">
              <div className={`text-2xl font-semibold ${s.hot ? "text-teal-300" : "text-zinc-300"}`}>{fmtUSD(s.avg, { compact: true })}</div>
              <div className="text-[10.5px] text-zinc-500 mt-0.5">avg federal $ / company</div>
              <div className="text-[11.5px] text-zinc-400 mt-2">{Math.round(s.rate * 100)}% won funding</div>
              <div className="text-[10.5px] text-zinc-600 mt-1">{s.t}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11.5px] text-zinc-500 leading-relaxed">
          The relationship is real but <span className="text-zinc-400">directional</span>: ~{model.loop.n} data points,
          uncontrolled for cohort age and vertical, and research depth is only one input. It&apos;s a hypothesis the talent
          engine should keep testing every cohort — the value is the loop, not a single coefficient.
        </p>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-t border-[#1a1d23] pt-2.5 first:border-0 first:pt-0">
      <span className="w-32 shrink-0 text-[11px] text-zinc-500">{label}</span>
      <span className="text-[12.5px] text-zinc-300">{children}</span>
    </div>
  );
}

// Client-side aggregation: every dashboard panel derives its data from the
// currently filtered company set, so one set of filters cross-filters them all.
import { Company, RadarRow, Vertical, YearRow, HubAtlas, Convergence } from "./data";

export type Filters = {
  vertical: string;
  hub: string;
  year: string;
  funded: boolean;
  q: string;
};

export const EMPTY_FILTERS: Filters = { vertical: "", hub: "", year: "", funded: false, q: "" };

export function isActive(f: Filters): boolean {
  return !!(f.vertical || f.hub || f.year || f.funded || f.q.trim());
}

export function applyFilters(cos: Company[], f: Filters, opts: { ignoreHub?: boolean } = {}): Company[] {
  const q = f.q.trim().toLowerCase();
  return cos.filter(
    (c) =>
      (f.vertical ? c.verticals.includes(f.vertical) : true) &&
      (opts.ignoreHub || !f.hub ? true : c.hub === f.hub) &&
      (f.year ? String(c.cohort_year) === f.year : true) &&
      (f.funded ? c.nsf_total > 0 || c.edgar_formD > 0 : true) &&
      (q
        ? c.name.toLowerCase().includes(q) ||
          c.one_liner.toLowerCase().includes(q) ||
          c.fellows.some((x) => x.toLowerCase().includes(q))
        : true)
  );
}

export function kpis(cos: Company[]) {
  return {
    count: cos.length,
    nsf: cos.reduce((s, c) => s + c.nsf_total, 0),
    funded: cos.filter((c) => c.nsf_total > 0 || c.edgar_formD > 0).length,
    fellows: new Set(cos.flatMap((c) => c.fellows)).size,
    profiled: cos.filter((c) => (c.founders ?? []).some((x) => x.resolved)).length,
  };
}

export function verticalsAgg(cos: Company[]): Vertical[] {
  const m = new Map<string, Vertical>();
  for (const c of cos)
    for (const v of c.verticals) {
      const d = m.get(v) ?? { vertical: v, count: 0, nsf_total: 0, nsf_cos: 0, formd_cos: 0, hubs: {} };
      d.count++;
      d.nsf_total += c.nsf_total;
      if (c.nsf_total) d.nsf_cos++;
      if (c.edgar_formD) d.formd_cos++;
      m.set(v, d);
    }
  return [...m.values()].sort((a, b) => b.count - a.count);
}

// Radar: field momentum is an external constant; recompute Activate presence
// as the filtered set's share in each vertical.
export function radarRows(cos: Company[], base: RadarRow[]): RadarRow[] {
  const n = cos.length || 1;
  const share: Record<string, number> = {};
  for (const c of cos) for (const v of c.verticals) share[v] = (share[v] || 0) + 1;
  return base.map((r) => ({ ...r, activate_presence_recent: (share[r.vertical] || 0) / n }));
}

export function convergence(cos: Company[]): Convergence {
  const nodes = verticalsAgg(cos).map((v) => ({ vertical: v.vertical, count: v.count }));
  const pair = new Map<string, number>();
  for (const c of cos) {
    const vs = [...new Set(c.verticals)].sort();
    for (let i = 0; i < vs.length; i++)
      for (let j = i + 1; j < vs.length; j++) {
        const k = `${vs[i]}|${vs[j]}`;
        pair.set(k, (pair.get(k) || 0) + 1);
      }
  }
  const min = Math.max(2, Math.round(cos.length / 55));
  const links = [...pair.entries()]
    .map(([k, count]) => {
      const [a, b] = k.split("|");
      return { a, b, count };
    })
    .filter((l) => l.count >= min)
    .sort((a, b) => b.count - a.count);
  return { nodes, links };
}

export function years(cos: Company[]): YearRow[] {
  const m = new Map<number, YearRow>();
  for (const c of cos) {
    if (!c.cohort_year) continue;
    const d = m.get(c.cohort_year) ?? { year: c.cohort_year, count: 0, verticals: {} };
    d.count++;
    for (const v of c.verticals) d.verticals[v] = (d.verticals[v] || 0) + 1;
    m.set(c.cohort_year, d);
  }
  return [...m.values()].sort((a, b) => a.year - b.year);
}

export function hubAtlas(cos: Company[], hubs: string[]): HubAtlas {
  const vertOrder = verticalsAgg(cos).map((v) => v.vertical);
  const n = cos.length || 1;
  const global: Record<string, number> = {};
  for (const v of vertOrder) global[v] = cos.filter((c) => c.verticals.includes(v)).length / n;
  const cells: HubAtlas["cells"] = {};
  for (const h of hubs) {
    const rows = cos.filter((c) => c.hub === h);
    const rn = rows.length || 1;
    cells[h] = {
      n: rows.length,
      verticals: Object.fromEntries(
        vertOrder.map((v) => {
          const cnt = rows.filter((c) => c.verticals.includes(v)).length;
          return [v, { count: cnt, share: cnt / rn, over: cnt / rn - global[v] }];
        })
      ),
    };
  }
  return { hubs, verticals: vertOrder, global_share: global, cells };
}

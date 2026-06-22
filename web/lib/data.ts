import dataset from "@/data/dataset.json";

export type NsfAward = { source: string; awardee: string; amount: number; title: string; date?: string };

export type Company = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  one_liner: string;
  potential_impact: string;
  cohort_year: number | null;
  hub: string;
  verticals: string[];
  fellows: string[];
  website: string;
  activate_url: string;
  nsf_total: number;
  nsf_count: number;
  edgar_formD: number;
  nsf_awards: NsfAward[];
};

export type Vertical = {
  vertical: string;
  count: number;
  nsf_total: number;
  nsf_cos: number;
  formd_cos: number;
  hubs: Record<string, number>;
};

export type YearRow = { year: number; count: number; verticals: Record<string, number> };

export type RadarRow = {
  vertical: string;
  field_share_recent: number;
  field_momentum: number;
  activate_presence_recent: number;
  activate_trajectory: number | null;
};

export type Headline = {
  companies: number;
  cohorts: string;
  nsf_total: number;
  nsf_funded: number;
  formd: number;
  verticals: number;
  hubs: number;
  fellows: number;
};

export type Dataset = {
  headline: Headline;
  companies: Company[];
  years: YearRow[];
  verticals: Vertical[];
  hubs: [string, number][];
  radar: RadarRow[];
};

export const data = dataset as unknown as Dataset;

export function fmtUSD(n: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact) {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
    return `$${n}`;
  }
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// A stable color per Activate vertical.
const VERTICAL_COLORS: Record<string, string> = {
  "Chemistry & Materials": "#5eead4",
  "Climate": "#86efac",
  "Advanced Manufacturing & Robotics": "#fbbf24",
  "Industrial Biotechnology": "#c4b5fd",
  "Electronics & Connectivity": "#7dd3fc",
  "Computing": "#f0abfc",
  "Food & Agriculture": "#bef264",
  "Carbon Management / CO2e": "#34d399",
  "Life Science": "#fda4af",
  "Energy Storage & Batteries": "#fcd34d",
  "Built Environment": "#a8a29e",
  "Energy Generation & Delivery": "#fdba74",
  "Earth Resources": "#d6d3d1",
  "Water": "#67e8f9",
  "Transportation & Mobility": "#93c5fd",
  "Space & Aeronautics": "#cbd5e1",
};

export function verticalColor(v: string): string {
  return VERTICAL_COLORS[v] ?? "#9ca3af";
}

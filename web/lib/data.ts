import dataset from "@/data/dataset.json";

export type NsfAward = { source: string; awardee: string; amount: number; title: string; date?: string };

export type Founder = {
  name: string;
  resolved: boolean;
  display_name?: string;
  institution?: string | null;
  training_institution?: string | null;
  affiliations?: { name: string; type: string; country: string; since: number | null }[];
  field?: string | null;
  works_count?: number;
  cited_by_count?: number;
  h_index?: number;
  pre_founding_topics?: string[];
  first_pub_year?: number | null;
  years_to_founding?: number | null;
};

export type Company = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  one_liner: string;
  critical_need: string;
  technology_vision: string;
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
  founders: Founder[];
  federal_total: number;
  federal_count: number;
  federal_agencies: { name: string; amount: number }[];
  fellow_profiles: { name: string; degree: string | null; universities: string[]; linkedin: string; bio: string }[];
};

export type FellowBackground = {
  total: number;
  degree_mix: Record<string, number>;
  degree_unknown: number;
  phd_pct: number;
  top_universities: [string, number][];
  with_university: number;
  with_linkedin: number;
};

export function topCitations(c: Company): number {
  return Math.max(0, ...(c.founders ?? []).map((f) => f.cited_by_count ?? 0));
}

export type Vertical = {
  vertical: string;
  count: number;
  nsf_total: number;
  nsf_cos: number;
  federal_total: number;
  federal_cos: number;
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
  federal_momentum?: number | null;
};

export type FunderModel = {
  ein: string;
  name: string;
  financials: { year: number; revenue: number; expenses: number; net_assets: number }[];
  revenue_latest: number;
  revenue_cagr: number;
  years: string;
  source: string;
};

export type Headline = {
  companies: number;
  cohorts: string;
  nsf_total: number;
  nsf_funded: number;
  federal_total: number;
  federal_funded: number;
  formd: number;
  verticals: number;
  hubs: number;
  fellows: number;
};

export type HubCell = { count: number; share: number; over: number };
export type HubAtlas = {
  hubs: string[];
  verticals: string[];
  global_share: Record<string, number>;
  cells: Record<string, { n: number; verticals: Record<string, HubCell> }>;
};

export type Convergence = {
  nodes: { vertical: string; count: number }[];
  links: { a: string; b: string; count: number }[];
};

export type SpaceSignal = {
  vertical: string;
  federal_total: number;
  federal_by_year: Record<string, number>;
  federal_momentum: number;
  top_agencies: { name: string; amount: number }[];
  research_momentum: number | null;
  activate_presence: number | null;
};

export type SpaceSignals = {
  spaces: SpaceSignal[];
  agency_matrix: Record<string, Record<string, number>>;
};

export type PeerFunder = {
  name: string;
  total: number;
  vertical_count: Record<string, number>;
  vertical_share: Record<string, number>;
};

export type Dataset = {
  headline: Headline;
  companies: Company[];
  years: YearRow[];
  verticals: Vertical[];
  hubs: [string, number][];
  radar: RadarRow[];
  hub_atlas: HubAtlas;
  convergence: Convergence;
  space_signals: SpaceSignals;
  funder_model: FunderModel | null;
  peer_funders: { funders: PeerFunder[] };
  fellow_background: FellowBackground;
};

// Short agency labels for dense displays.
export function shortAgency(name: string): string {
  const map: Record<string, string> = {
    "Department of Energy": "DOE",
    "Department of Defense": "DOD",
    "Department of Health and Human Services": "HHS",
    "National Science Foundation": "NSF",
    "National Aeronautics and Space Administration": "NASA",
    "Department of Agriculture": "USDA",
    "Environmental Protection Agency": "EPA",
    "Department of Homeland Security": "DHS",
    "Department of Commerce": "DOC",
    "Department of Housing and Urban Development": "HUD",
    "Department of Transportation": "DOT",
    "Department of the Interior": "DOI",
    "National Institutes of Health": "NIH",
  };
  return map[name] ?? name.replace("Department of ", "");
}

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
// Tuned for a dark background and maximal mutual contrast. The eight highest-
// count verticals (which stack together in the cohort chart) get the most
// separated hues so green/blue families don't blur together.
const VERTICAL_COLORS: Record<string, string> = {
  "Chemistry & Materials": "#5eead4", // teal
  "Climate": "#a3e635", // lime
  "Advanced Manufacturing & Robotics": "#f59e0b", // orange
  "Industrial Biotechnology": "#c084fc", // purple
  "Electronics & Connectivity": "#38bdf8", // sky blue
  "Computing": "#f472b6", // magenta
  "Food & Agriculture": "#fde047", // yellow
  "Carbon Management / CO2e": "#fb7185", // coral
  "Life Science": "#818cf8", // indigo
  "Energy Storage & Batteries": "#fbbf24", // amber
  "Built Environment": "#a8a29e", // warm gray
  "Energy Generation & Delivery": "#fca5a5", // soft red
  "Earth Resources": "#d6d3d1", // light gray
  "Water": "#22d3ee", // cyan
  "Transportation & Mobility": "#93c5fd", // periwinkle
  "Space & Aeronautics": "#94a3b8", // slate
};

export function verticalColor(v: string): string {
  return VERTICAL_COLORS[v] ?? "#9ca3af";
}

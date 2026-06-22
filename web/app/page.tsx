import { data, fmtUSD } from "@/lib/data";
import FrontierRadar from "./components/FrontierRadar";
import Directory from "./components/Directory";
import OutcomesBars from "./components/OutcomesBars";
import CohortDrift from "./components/CohortDrift";

function Stat({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return (
    <div>
      <div className={`text-3xl md:text-4xl font-semibold tracking-tight ${accent ?? "text-zinc-100"}`}>
        {value}
      </div>
      <div className="text-[12.5px] text-zinc-500 mt-1">{label}</div>
    </div>
  );
}

function SectionLabel({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[11px] font-mono text-teal-400/80">{n}</span>
      <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{children}</span>
    </div>
  );
}

export default function Page() {
  const h = data.headline;
  const verticalNames = data.verticals.map((v) => v.vertical);
  const hubNames = data.hubs.map(([name]) => name).filter((n) => n && !n.includes(","));

  const dirCompanies = data.companies.map((c) => ({
    id: c.id, name: c.name, one_liner: c.one_liner, verticals: c.verticals,
    cohort_year: c.cohort_year, hub: c.hub, website: c.website,
    nsf_total: c.nsf_total, edgar_formD: c.edgar_formD, fellows: c.fellows,
  })) as unknown as import("@/lib/data").Company[];

  const radarSorted = [...data.radar].sort((a, b) => b.field_momentum - a.field_momentum);
  const medMom = [...data.radar].map((r) => r.field_momentum).sort((a, b) => a - b)[Math.floor(data.radar.length / 2)];
  const medPres = [...data.radar].map((r) => r.activate_presence_recent).sort((a, b) => a - b)[Math.floor(data.radar.length / 2)];
  const whitespace = radarSorted.filter((r) => r.field_momentum >= medMom && r.activate_presence_recent < medPres);

  return (
    <main className="min-h-screen">
      {/* ===== Hero ===== */}
      <header className="relative border-b border-[#15181e] bg-grid">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#08090b]" />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-14">
          <div className="flex items-center gap-2 text-[12px] text-teal-300/90 font-medium mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            FELLOW SIGNAL
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-zinc-50 max-w-3xl leading-[1.05]">
            The frontier Activate&apos;s scientists are building.
          </h1>
          <p className="mt-5 text-lg text-zinc-400 max-w-2xl leading-relaxed">
            An intelligence layer on the Activate fellowship — every venture mapped by
            science, industry, and impact, then read against where research and funding
            are actually moving.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12">
            <Stat value={String(h.companies)} label={`hard-tech ventures · ${h.cohorts}`} />
            <Stat value={fmtUSD(h.nsf_total, { compact: true })} label="NSF non-dilutive captured" accent="text-teal-300" />
            <Stat value={`${Math.round((h.nsf_funded / h.companies) * 100)}%`} label="won federal grants" />
            <Stat value={String(h.fellows)} label={`scientist-founders · ${h.hubs - 1} hubs`} />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6">
        {/* ===== Frontier Radar ===== */}
        <section className="py-16 border-b border-[#15181e]">
          <SectionLabel n="01">Frontier Radar</SectionLabel>
          <h2 className="text-2xl md:text-3xl font-semibold text-zinc-100 max-w-3xl">
            Where the science is accelerating — and whether Activate is there.
          </h2>
          <p className="mt-3 text-zinc-400 max-w-2xl">
            Each field&apos;s research momentum (its growing share of global publications)
            plotted against Activate&apos;s presence in recent cohorts. The bottom-right is
            the signal that matters: fields heating up where Activate is light.
          </p>
          <div className="panel mt-8 p-4 md:p-6">
            <FrontierRadar rows={data.radar} />
          </div>
          <div className="mt-5 text-sm text-zinc-400">
            <span className="text-amber-300 font-medium">Whitespace candidates:</span>{" "}
            {whitespace.map((w) => w.vertical.replace(" / CO2e", "")).join(" · ")}.{" "}
            <span className="text-zinc-500">
              Low presence can mean off-thesis rather than missed — these are questions to investigate, not directives.
            </span>
          </div>
        </section>

        {/* ===== Outcomes ===== */}
        <section className="py-16 border-b border-[#15181e]">
          <SectionLabel n="02">Outcomes ledger</SectionLabel>
          <h2 className="text-2xl md:text-3xl font-semibold text-zinc-100 max-w-3xl">
            Did the focus pay off? {fmtUSD(h.nsf_total, { compact: true })} in non-dilutive funding, traced.
          </h2>
          <p className="mt-3 text-zinc-400 max-w-2xl">
            Independently matched against public records — {h.nsf_funded} of {h.companies} ventures
            won NSF grants and {h.formd} have filed SEC Form D raises. NSF alone is a floor;
            DOE/DOD/NASA via SBIR layer in next.
          </p>
          <div className="panel mt-8 p-6">
            <div className="text-[12px] uppercase tracking-wider text-zinc-500 mb-5">
              NSF non-dilutive funding by vertical
            </div>
            <OutcomesBars verticals={data.verticals} />
          </div>
        </section>

        {/* ===== Cohort drift ===== */}
        <section className="py-16 border-b border-[#15181e]">
          <SectionLabel n="03">Cohort drift</SectionLabel>
          <h2 className="text-2xl md:text-3xl font-semibold text-zinc-100 max-w-3xl">
            How the portfolio&apos;s mix shifted, 2015 → 2025.
          </h2>
          <div className="panel mt-8 p-6">
            <CohortDrift years={data.years} topVerticals={verticalNames} />
          </div>
        </section>

        {/* ===== Directory ===== */}
        <section className="py-16">
          <SectionLabel n="04">Portfolio</SectionLabel>
          <h2 className="text-2xl md:text-3xl font-semibold text-zinc-100 max-w-3xl mb-8">
            Every venture, searchable.
          </h2>
          <Directory companies={dirCompanies} verticals={verticalNames} hubs={hubNames} />
        </section>
      </div>

      {/* ===== Footer ===== */}
      <footer className="border-t border-[#15181e] py-10">
        <div className="max-w-6xl mx-auto px-6 text-[12.5px] text-zinc-500 space-y-2">
          <p>
            <span className="text-zinc-300">Fellow Signal</span> — a working prototype.
            Data: Activate&apos;s public companies directory, NSF Awards API, SEC EDGAR, and OpenAlex.
          </p>
          <p className="text-zinc-600">
            Built as an independent analysis. Whitespace and momentum figures are directional —
            field momentum uses keyword-relevance search; trust the ranking over exact magnitudes.
          </p>
        </div>
      </footer>
    </main>
  );
}

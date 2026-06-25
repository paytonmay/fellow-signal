import Link from "next/link";
import { data, fmtUSD } from "@/lib/data";

export const metadata = {
  title: "Fellow Signal, Data, Methods & Sources",
  description: "Every source, how each metric is computed, what's verified vs directional, and the limitations.",
};

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl md:text-2xl font-semibold text-zinc-100 mt-12 mb-3">{children}</h2>;
}
function Row({ a, b, c }: { a: React.ReactNode; b: React.ReactNode; c: React.ReactNode }) {
  return (
    <div className="grid grid-cols-12 gap-3 py-2.5 border-t border-[#15181e] text-[13px]">
      <div className="col-span-3 text-zinc-200 font-medium">{a}</div>
      <div className="col-span-5 text-zinc-400">{b}</div>
      <div className="col-span-4 text-zinc-500">{c}</div>
    </div>
  );
}

export default function Methods() {
  const h = data.headline;
  return (
    <main className="min-h-screen">
      <header className="border-b border-[#15181e] bg-grid">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-[13px] text-zinc-400 hover:text-zinc-100">← Fellow Signal dashboard</Link>
          <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-600">Data, Methods &amp; Sources</span>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-12 text-[14.5px] leading-relaxed text-zinc-300">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-50">Data, methods &amp; sources</h1>
        <p className="mt-4 text-zinc-400">
          Everything here is built from public data with an open, reproducible pipeline. This page documents
          every source, how each figure is computed, what has been verified exactly versus what is directional,
          and the honest limitations. The whole pipeline is on{" "}
          <a href="https://github.com/paytonmay/fellow-signal" className="text-teal-300 hover:text-teal-200">GitHub</a>{" "}
          and refreshes monthly.
        </p>

        <H>Sources</H>
        <div className="mt-1">
          <div className="grid grid-cols-12 gap-3 pb-1 text-[10.5px] uppercase tracking-wider text-zinc-600">
            <div className="col-span-3">Source</div><div className="col-span-5">What it provides</div><div className="col-span-4">Access &amp; caveats</div>
          </div>
          <Row a="Activate companies directory" b="224 ventures from this harvest: name, cohort year, hub, verticals, fellows, websites, and the human-written Critical Need / Technology Vision / Potential Impact." c="Softr app over an Airtable base; harvested via headless browser (JS-rendered). The public directory at harvest time; Activate's current published portfolio is larger (~235), so read this as a directory snapshot, not the full roster." />
          <Row a="Activate fellows directory" b="292 fellows from this harvest: biography, cohort, hub, company, LinkedIn. The bios state degree + university for ~92%." c="Separate Softr/Airtable table, same harvest. A snapshot; Activate currently lists ~294." />
          <Row a="USAspending.gov" b="Federal awards, per-company non-dilutive outcomes, per-space ecosystem funding, and agency breakdowns." c="Public API. Recipient exact-match + $25M/award cap to exclude institutional name collisions." />
          <Row a="OpenAlex" b="Founder research footprints (works, citations, h-index, pre-founding topics, affiliations) and field publication velocity." c="Public API (large open scholarly index). Name disambiguation is field/domain-aware; 100 of 224 companies resolved, 112 founders." />
          <Row a="SEC EDGAR" b="Form D filings as a private-capital-raised signal." c="Full-text search API. Presence/absence only." />
          <Row a="IRS Form 990 (ProPublica)" b="Activate's own revenue, expenses, and net assets by year." c="Public nonprofit filings. EIN 47-5502184." />
          <Row a="The Engine (engine.xyz)" b="MIT's 'Tough Tech' venture firm (founded 2016, invests for equity). Its 57 public portfolio companies, mapped onto Activate's verticals for a model-vs-model comparison." c="Harvested via headless browser; their taxonomy is coarser, so the comparison is directional positioning." />
        </div>

        <H>How each figure is computed</H>
        <ul className="space-y-4 mt-2">
          {[
            ["Federal non-dilutive funding", `${fmtUSD(h.federal_total, { compact: true })} across ${h.federal_funded} companies. USAspending assistance awards (grants + cooperative agreements) whose recipient name exactly matches the company, summed, with a $25M/award cap to drop institutional collisions. DOD SBIR contracts are a known gap.`],
            ["Research momentum (radar x-axis)", "Each field's share of all global publications (OpenAlex) in 2021–24 vs its 2013–16 baseline. Normalized to share so it isn't fooled by the index growing. Fields are keyword-defined, so the ranking is the signal, not the exact multiple."],
            ["Federal funding momentum (radar bubble / Space Forecast)", "USAspending obligations matching a per-space keyword, recent (FY22–25) vs prior (FY16–19) windows. Keyword-matched against award text; directional."],
            ["Activate presence (radar y-axis)", "Share of the in-view ventures in each vertical (cross-filters with the dashboard)."],
            ["Whitespace / sourcing opportunity", "Research momentum × federal-funding momentum, discounted by Activate's existing presence. A prompt to investigate, not a directive."],
            ["Founder research profile", "OpenAlex author match with field/domain-aware disambiguation and a senior-namesake guard (reject h-index > 60, no recent founder is a 100-h-index professor). Unresolved founders are non-academic or genuinely absent from OpenAlex."],
            ["Typical-founder profile", "Median + interquartile range of citations, h-index, and years from first paper to founding across the 112 resolved founders. Descriptive baseline, not a model."],
            ["Selection loop closure", "The 89 companies with a cited founder, split at the median citation count, compared on the rate of winning federal funding. At this N the rates are within a couple of points, reported as the honest null it is."],
            ["Fellow background", "Degree level and universities parsed from the bios with regex heuristics (88% PhD; 92% name a university). The top-school ranking is robust; individual parses can miss."],
            ["Discipline → space", "Field of study parsed from each bio, mapped to the fellow's company verticals."],
            ["Emerging Science (bottom-up topics)", "Growth in each OpenAlex topic's share of publications (2016–17 vs 2023–24) across the deep-tech domains, crossed with federal funding momentum (USAspending, curated keywords, only counted when current funding ≥$20M so tiny-base ratios can't dominate) and against the topics Activate fellows publish in. Ranked by opportunity = research × funding. Share-normalized; growth above ~8x dropped as a coverage artifact; some tagging noise remains, so it is a candidate surface, not a ranking."],
            ["Hub specialization", "A hub's share of a vertical minus the portfolio-wide share (over/under-index in percentage points)."],
            ["Model & finances", "Revenue, expenses, net assets straight from the Form 990s; the 7.2× is FY2019 → FY2023 revenue."],
          ].map(([t, d]) => (
            <li key={t}>
              <div className="text-[14px] font-medium text-zinc-100">{t}</div>
              <p className="text-[13.5px] text-zinc-400 mt-0.5">{d}</p>
            </li>
          ))}
        </ul>

        <H>Verified exactly vs. directional</H>
        <p>
          <span className="text-teal-300">Verified to the number</span> (recomputed from the source records): company
          and fellow counts, 88% PhD, the 7.2× revenue growth from the 990s, the cohort-shift percentages, the
          convergence pair counts, and the hub over-index figures.
        </p>
        <p className="mt-3">
          <span className="text-sky-300">Entity-matched public-record estimate</span>: the {fmtUSD(h.federal_total, { compact: true })}{" "}
          federal total is summed from USAspending assistance awards matched to each company by exact recipient name, with
          a $25M/award cap to drop institutional collisions. The top recipients are confirmed real Activate companies with
          real DOE grants, but exact-name matching is conservative, it can miss awards (11 companies show NSF-API awards not
          captured in the all-agency total, and DOD SBIR contracts are excluded). Treat it as a careful lower-bound estimate,
          not an exact figure.
        </p>
        <p className="mt-3">
          <span className="text-amber-300">Directional</span> (trust the ranking, not the magnitude): all keyword-based
          momentum, research velocity, federal funding by space, and the peer-funder comparison, where the other
          funder&apos;s taxonomy differs from Activate&apos;s. These are labeled as such in the interface.
        </p>
        <p className="mt-3">
          <span className="text-zinc-200">Reported as null:</span> the selection loop closure. The hypothesis that
          founder research depth predicts funding outcomes does not hold at the current sample, and the dashboard says so
          rather than dressing up an outlier-driven average.
        </p>

        <H>Limitations</H>
        <ul className="list-disc pl-5 space-y-2 text-zinc-400 text-[14px]">
          <li>Fields are defined by keyword queries, not clean discipline boundaries, magnitudes are approximate.</li>
          <li>Name-matching (founders to OpenAlex, companies to federal recipients) has finite precision; guards reduce but don&apos;t eliminate error.</li>
          <li>Bio parsing is heuristic; aggregate distributions are reliable, individual rows can be wrong.</li>
          <li>Founder-level analyses run on 112 resolved founders across 100 companies (89 in the citation-depth split), descriptive and hypothesis-generating, not predictive.</li>
          <li>Identity demographics (gender, race, age) are deliberately not inferred, the signal here is scientific and career depth, used to widen discovery, not to gate it.</li>
          <li>It is a point-in-time snapshot, refreshed monthly; not a live feed.</li>
        </ul>

        <p className="mt-10 text-zinc-500 text-[13px]">
          Read the synthesis in the <Link href="/brief" className="text-teal-300 hover:text-teal-200">Point of View</Link>,
          or explore the live data in the <Link href="/" className="text-teal-300 hover:text-teal-200">dashboard</Link>.
        </p>
      </article>
    </main>
  );
}

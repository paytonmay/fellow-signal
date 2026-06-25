import Link from "next/link";
import { data, fmtUSD } from "@/lib/data";

export const metadata = {
  title: "Fellow Signal, Point of View",
  description: "A data-backed read on Activate's frontier, and how I'd run the talent engine.",
};

function H({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 mt-12 mb-3">
      <span className="text-[12px] font-mono text-teal-400/80">{n}</span>
      <h2 className="text-xl md:text-2xl font-semibold text-zinc-100">{children}</h2>
    </div>
  );
}

export default function Brief() {
  const h = data.headline;
  const bg = data.fellow_background;
  const fin = data.funder_model?.financials ?? [];
  const y19 = fin.find((f) => f.year === 2019);
  const last = fin[fin.length - 1];
  const mult = y19 && last ? (last.revenue / y19.revenue).toFixed(1) : "7";

  return (
    <main className="min-h-screen">
      <header className="border-b border-[#15181e] bg-grid">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-[13px] text-zinc-400 hover:text-zinc-100">← Fellow Signal dashboard</Link>
          <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-600">Point of View</span>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-12 text-[15px] leading-relaxed text-zinc-300">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-50 leading-tight">
          Activate&apos;s real advantage is finding exceptional scientific founders early.
          Here&apos;s what the data says about that frontier, and how I&apos;d turn it into a system.
        </h1>
        <p className="mt-5 text-zinc-400">
          Built independently from public data: Activate&apos;s own companies and fellows directories,
          USAspending, OpenAlex, SEC EDGAR, and IRS 990s. {h.companies} ventures and {bg.total} fellows,
          cohorts {h.cohorts}. Figures are directional where noted; the rankings are the signal.
        </p>

        <H n="01">The frontier is moving, and the cohorts show it first</H>
        <p>
          The portfolio is not static, and that&apos;s the point. Between the 2024 and 2025 cohorts the mix
          swung hard toward <span className="text-zinc-100">climate (2% → 32% of the cohort)</span> and
          <span className="text-zinc-100"> electronics &amp; connectivity (8% → 24%)</span>. Zoom out and the
          decade tells a clearer story: chemistry and materials remain the backbone, but the action is at the
          <span className="text-zinc-100"> intersections</span>, chemistry × climate, carbon × climate,
          computing × electronics. New fields are forming between disciplines, not inside them. A talent engine
          that reads last cohort&apos;s mix is already a year behind; the job is to read the acceleration.
        </p>

        <H n="02">The sharpest opportunities are where the science and the money are racing ahead of Activate</H>
        <p>
          Cross each field&apos;s research momentum (its growing share of global publications) and federal
          funding momentum against Activate&apos;s own presence, and a short list of
          <span className="text-amber-300"> whitespace</span> falls out: <span className="text-zinc-100">energy
          storage</span> and <span className="text-zinc-100">transportation &amp; mobility</span> are both
          research-hot and funding-hot, yet sit in the single digits of recent cohorts. Some of that is
          deliberate (thesis fit), but it&apos;s exactly the list a discovery function should be interrogating
          every quarter, not as a target, but as a question: <em>are we early, or are we missing it?</em>
        </p>

        <H n="03">The selection edge is real, and it&apos;s measurable</H>
        <p>
          Activate&apos;s picks win money on their own. Matched against federal records, the portfolio has
          captured <span className="text-teal-300">{fmtUSD(h.federal_total, { compact: true })} in non-dilutive
          funding</span> across {Math.round((h.federal_funded / h.companies) * 100)}% of ventures, DOE-led,
          before a dollar of equity. That is an independent, public validation of pick quality, and it&apos;s
          the kind of outcome signal a selection system should be tracking on every cohort, not discovering
          years later in a press release.
        </p>
        <p className="mt-3">
          The founders themselves have a clear shape: <span className="text-zinc-100">{Math.round(bg.phd_pct * 100)}%
          hold PhDs</span>, concentrated at MIT, Berkeley, and Stanford, with deep, cited research that visibly
          precedes the venture, and the discipline maps onto the space (electronics ← electrical engineering,
          energy storage ← chemistry and materials). That&apos;s not a pedigree filter to enforce; it&apos;s a
          baseline that tells you what a strong candidate <em>looks like</em>, and, more usefully, helps spot
          the exceptional scientist who doesn&apos;t fit the usual mold.
        </p>

        <H n="04">A different model, and the moat it implies</H>
        <p>
          Activate is an equity-free nonprofit that has grown revenue from {fmtUSD(y19?.revenue ?? 0, { compact: true })}
          to {fmtUSD(last?.revenue ?? 0, { compact: true })} since 2019, roughly {mult}×, funded by philanthropy
          and government, not venture capital. The model only works if the science selection is exceptional, because
          there&apos;s no portfolio markup to hide behind. That makes founder discovery and selection the literal
          engine of the institution, and it makes a continuously-improving, data-driven version of it a genuine moat.
        </p>

        <H n="05">What I&apos;d build in the first 90 days</H>
        <ol className="mt-2 space-y-3 list-none">
          {[
            ["Instrument the engine", "Stand up exactly this pipeline as the internal source of truth: every applicant and fellow with their research footprint, and every cohort tracked against real outcomes (non-dilutive funding, raises, exits). Make the loop visible."],
            ["Source the whitespace", "Run the frontier radar quarterly and pair it with the discipline → space key, so sourcing is pointed at accelerating fields and the scientist profiles that succeed there, with hubs treated as the distinct theses they already are."],
            ["Close the selection loop", "Correlate selection-time signals with outcomes to learn what actually predicts a strong fellow, then feed that back into reviewer rubrics, carefully, with the bias guardrails the mission demands. The goal is a system that gets better every cohort, not a fixed scorecard."],
            ["Productize the intelligence", "Package the frontier read as an offering, internal decision support for selection and sponsor cultivation, and an external Frontier Report that makes Activate the authority on where hard tech is heading."],
          ].map(([t, d], i) => (
            <li key={i} className="panel p-4">
              <div className="text-[13px] font-semibold text-teal-300">{i + 1}. {t}</div>
              <p className="text-[14px] text-zinc-400 mt-1">{d}</p>
            </li>
          ))}
        </ol>

        <H n="n/a">The honest part</H>
        <p>
          None of this is a black box. The momentum figures use keyword-relevance search, so trust the ranking
          over the exact multiple; the founder sample is 112 resolved profiles across 100 companies and the data is descriptive, not a predictive model;
          and I&apos;ve deliberately avoided inferring identity demographics, the right signal is scientific and
          career depth, used to <em>widen</em> discovery, not to gate it. The credibility is in the sourcing and
          the caveats, not in pretending the data is cleaner than it is.
        </p>
        <p className="mt-6 text-zinc-500 text-[13px]">
          Explore the live data behind every claim in the <Link href="/" className="text-teal-300 hover:text-teal-200">dashboard</Link>,
          or see exactly how each figure is computed in <Link href="/methods" className="text-teal-300 hover:text-teal-200">Data, methods &amp; sources</Link>.
        </p>
      </article>
    </main>
  );
}

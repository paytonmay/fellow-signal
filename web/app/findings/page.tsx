import Link from "next/link";
import { data, fmtUSD } from "@/lib/data";

export const metadata = {
  title: "Fellow Signal, Findings",
  description: "An analytical write-up of what the data reveals about scientific founder discovery and the emerging frontier.",
};

function H({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 mt-12 mb-3">
      <span className="text-[12px] font-mono text-teal-400/80">{n}</span>
      <h2 className="text-xl md:text-2xl font-semibold text-zinc-100">{children}</h2>
    </div>
  );
}
function Take({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel p-4 mt-4 border-l-2 border-l-teal-500/50">
      <span className="text-[11px] uppercase tracking-wider text-teal-400/80">Finding</span>
      <p className="text-[14px] text-zinc-200 mt-1">{children}</p>
    </div>
  );
}

export default function Findings() {
  const h = data.headline;
  const bg = data.fellow_background;
  const fin = data.funder_model?.financials ?? [];
  const y19 = fin.find((f) => f.year === 2019);
  const last = fin[fin.length - 1];
  const em = data.emerging_science?.topics ?? [];
  const white = em
    .filter((t) => !t.activate_present && t.federal_matched && (t.federal_momentum > 0 || t.federal_new))
    .slice(0, 3)
    .map((t) => t.topic.replace(" Methods", "").replace(" Research", "").replace(" Techniques", "").replace(" and Diagnostics", ""));

  return (
    <main className="min-h-screen">
      <header className="border-b border-[#15181e] bg-grid">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-[13px] text-zinc-400 hover:text-zinc-100">← Fellow Signal dashboard</Link>
          <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-600">Findings</span>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-12 text-[15px] leading-relaxed text-zinc-300">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-50 leading-tight">
          What the data says about scientific founder discovery, and the emerging frontier.
        </h1>
        <p className="mt-5 text-zinc-400">
          An analysis of {h.companies} Activate ventures and {bg.total} fellows ({h.cohorts}), built from public
          data. The aim isn&apos;t to flatter the program; it&apos;s to find the signal that&apos;s actually there,
          report the parts that aren&apos;t, and draw the operational implications. Methods and every source are in{" "}
          <Link href="/methods" className="text-teal-300 hover:text-teal-200">Data, methods &amp; sources</Link>.
        </p>

        <H n="01">Who Activate funds is remarkably consistent</H>
        <p>
          From their own bios, <span className="text-zinc-100">{Math.round(bg.phd_pct * 100)}% of fellows hold a PhD</span>,
          and the training pipeline is concentrated: MIT, Berkeley, and Stanford together account for nearly a third of all
          university mentions. The discipline a founder trained in maps cleanly onto the space they build in, electronics
          ventures come from electrical engineering, energy storage from chemistry and materials, industrial biotech from
          biology. This isn&apos;t a pedigree rule to enforce; it&apos;s a baseline that tells you what a strong candidate
          looks like, and a sourcing key, to find founders for a space, look where its science is done.
        </p>
        <Take>
          There is a clear, data-derived &quot;typical founder&quot; profile (doctoral scientist, deep cited research,
          a specific discipline per space). It works as a screening filter, not an arbitrary bar.
        </Take>

        <H n="02">The most important finding: discovery works, selection doesn&apos;t (yet)</H>
        <p>
          The single most useful result is a dissociation between two things people usually conflate. A founder&apos;s
          <span className="text-zinc-100"> research footprint is a strong discovery signal</span>: their pre-founding
          publications visibly foreshadow the venture, often two to four years early (Ryan DuChanois&apos;s membrane and
          separation work preceding Solidec&apos;s electrochemical chemical manufacturing; Bilen Akuzum&apos;s battery-materials
          research preceding Aepnus&apos;s battery-production process). That means you can find these scientists before
          they&apos;ve incorporated, the earliest possible point of contact.
        </p>
        <p className="mt-3">
          But that same footprint is <span className="text-zinc-100">not a selection signal</span>. Splitting the
          portfolio at the median founder-citation count, the two halves win federal non-dilutive funding at
          essentially the same rate (about 38% vs 36%); the dollar gap that looks larger is driven by a handful of
          outsized DOE awards, not a broad effect. At this sample, research depth does not separate the outcomes.
        </p>
        <Take>
          Use research footprint to <span className="text-teal-300">find</span> founders, not to <span className="text-teal-300">rank</span> them.
          It&apos;s an excellent radar and a poor scoreboard, and conflating the two would quietly bias selection toward
          citation counts that don&apos;t actually predict success.
        </Take>

        <H n="03">The outcomes validate the picks, independently</H>
        <p>
          Whatever selects these founders is working at the portfolio level. Matched against federal records, the
          ventures have captured <span className="text-teal-300">{fmtUSD(h.federal_total, { compact: true })} in
          non-dilutive funding</span> across {Math.round((h.federal_funded / h.companies) * 100)}% of companies, led by
          the Department of Energy, before any equity round. For an equity-free nonprofit that has grown revenue from
          {" "}{fmtUSD(y19?.revenue ?? 0, { compact: true })} to {fmtUSD(last?.revenue ?? 0, { compact: true })} since
          2019, that external validation of pick quality is the whole ballgame, there&apos;s no markup to hide behind.
        </p>

        <H n="04">The frontier is detectable bottom-up, and there&apos;s science-level whitespace</H>
        <p>
          Rather than measuring Activate&apos;s 16 pre-defined sectors, you can let the literature surface what&apos;s
          accelerating. Ranking ~4,500 fine-grained research topics (including arXiv and bioRxiv preprints) by growth in
          publication share, the fastest-rising deep-tech areas include perovskite materials, advanced batteries,
          electrocatalysts, and energy-harvesting materials, and Activate already has fellows publishing in all of them.
          That&apos;s a good sign: the program is tracking the real frontier, not last decade&apos;s.
        </p>
        <p className="mt-3">
          More interesting are the rising areas where <span className="text-amber-300">no Activate fellow publishes
          yet</span>{white.length ? <>, currently {white.map((w, i) => <span key={w}><span className="text-zinc-100">{w}</span>{i < white.length - 1 ? ", " : ""}</span>)}</> : ""}.
          These are the earliest sourcing leads a discovery function can act on, emerging science before it&apos;s a named
          category, surfaced by the data rather than chosen in advance.
        </p>
        <Take>
          Founder discovery should run two clocks: the slow one (who&apos;s succeeding in our existing spaces) and the
          fast one (what science is emerging that we have nobody in yet). The second is where being early pays.
        </Take>

        <H n="05">Two more structural reads</H>
        <p>
          <span className="text-zinc-100">Hubs are distinct theses, not branches.</span> New York over-indexes on carbon
          management (+33 points vs the portfolio) and climate; the communities specialize, so sourcing and sponsor
          cultivation should be hub-specific. And <span className="text-zinc-100">new fields form at intersections</span>:
          the densest pair in the portfolio is chemistry × climate, a reminder that the next venture often sits between
          two disciplines, not inside one.
        </p>

        <H n="06">What I&apos;m not claiming</H>
        <p>
          The momentum figures are keyword-based, so the rankings are sound but the exact multiples aren&apos;t; the
          founder analyses run on ~90 resolved profiles and are descriptive, not predictive; the emerging-topic list is a
          candidate surface with real tagging noise, not a ranking to act on blindly; and I&apos;ve deliberately not
          inferred any identity demographics, the signal here is scientific and career depth, used to widen discovery
          rather than narrow it. The credibility is in stating that plainly.
        </p>

        <p className="mt-10 text-zinc-500 text-[13px]">
          The strategic version of this is the <Link href="/brief" className="text-teal-300 hover:text-teal-200">Point of View</Link>;
          the live evidence is the <Link href="/" className="text-teal-300 hover:text-teal-200">dashboard</Link>.
        </p>
      </article>
    </main>
  );
}

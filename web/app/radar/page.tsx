import Link from "next/link";
import { data } from "@/lib/data";
import SourcingRadar from "@/app/components/SourcingRadar";

export const metadata = {
  title: "Fellow Signal, Sourcing Radar",
  description: "Per research area: where to look, why now, what is technically hard, and how under-covered Activate is.",
};

export default function RadarPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-[#15181e] bg-grid">
        <div className="max-w-[1100px] mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-[13px] text-zinc-400 hover:text-zinc-100">← Fellow Signal dashboard</Link>
          <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-600">Sourcing Radar</span>
        </div>
      </header>
      <div className="max-w-[1100px] mx-auto px-6 py-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-50">Sourcing Radar</h1>
        <p className="mt-3 text-[14px] text-zinc-400 max-w-3xl leading-relaxed">
          The rest of the site answers what is happening at the frontier. This answers who to call. Pick an emerging research
          area and get a sourcing packet: where the US research is concentrated and rising, why now, what is technically hard
          (the company-thesis territory), and how present Activate already is. Built from OpenAlex; institutions and areas only,
          deliberately not individuals.
        </p>
        <div className="mt-7">
          <SourcingRadar data={data} />
        </div>
        <p className="mt-8 text-[12px] text-zinc-600">
          Phase 1. The roadmap, including coauthor-network scouting and citation-velocity rising-author detection (gated on
          disambiguation rigor), is in{" "}
          <a href="https://github.com/paytonmay/fellow-signal/blob/main/docs/sourcing-radar-proposal.md" className="text-teal-300 hover:text-teal-200">the proposal</a>.{" "}
          See the live data in the <Link href="/" className="text-teal-300 hover:text-teal-200">dashboard</Link>.
        </p>
      </div>
    </main>
  );
}

import Link from "next/link";
import { data } from "@/lib/data";
import SelectionSimulator from "@/app/components/SelectionSimulator";

export const metadata = {
  title: "Fellow Signal, Selection Simulator",
  description: "Picking 50 from 1,000: an illustrative model of how a selection strategy shapes a cohort.",
};

export default function SimulatorPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-[#15181e] bg-grid">
        <div className="max-w-[1100px] mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-[13px] text-zinc-400 hover:text-zinc-100">← Fellow Signal dashboard</Link>
          <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-600">Selection Simulator</span>
        </div>
      </header>
      <div className="max-w-[1100px] mx-auto px-6 py-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-50">Picking 50 from 1,000</h1>
        <p className="mt-3 text-[14px] text-zinc-400 max-w-3xl leading-relaxed">
          Activate draws roughly a thousand applications per cohort and accepts about fifty (~5%). This is the core of
          the role, and the one thing a dataset of accepted fellows can&apos;t show you. So here is an illustrative
          model of the decision: a thousand candidates, four levers, one cohort. Drag the levers and watch the portfolio
          you&apos;d be building change.
        </p>
        <div className="mt-7">
          <SelectionSimulator data={data} />
        </div>
        <p className="mt-8 text-[12px] text-zinc-600">
          Phase 1. The design, including strategy dials, auditable manual overrides, and a stakeholder-vote layer, is in{" "}
          <a href="https://github.com/paytonmay/fellow-signal/blob/main/docs/selection-simulator-proposal.md" className="text-teal-300 hover:text-teal-200">the proposal</a>.{" "}
          See the live data in the <Link href="/" className="text-teal-300 hover:text-teal-200">dashboard</Link>.
        </p>
      </div>
    </main>
  );
}

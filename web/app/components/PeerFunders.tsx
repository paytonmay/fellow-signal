"use client";

import { PeerFunder, Vertical, verticalColor } from "@/lib/data";

const PEER_COLOR = "#c084fc";

export default function PeerFunders({
  peer,
  activateVerticals,
  activateTotal,
  activeVertical,
  onSelect,
}: {
  peer: PeerFunder;
  activateVerticals: Vertical[];
  activateTotal: number;
  activeVertical?: string;
  onSelect?: (v: string) => void;
}) {
  const order = activateVerticals.map((v) => v.vertical);
  const aShare = Object.fromEntries(activateVerticals.map((v) => [v.vertical, v.count / activateTotal]));
  const rows = order
    .map((v) => ({ v, a: aShare[v] ?? 0, p: peer.vertical_share[v] ?? 0 }))
    .sort((x, y) => Math.max(y.a, y.p) - Math.max(x.a, x.p));
  const max = Math.max(...rows.map((r) => Math.max(r.a, r.p)), 0.1);

  const Bar = ({ pct, color }: { pct: number; color: string }) => (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2.5 bg-[#0e1014] rounded">
        <div className="h-full rounded" style={{ width: `${(pct / max) * 100}%`, background: color }} />
      </div>
      <span className="w-9 text-[10.5px] text-zinc-500 text-right">{Math.round(pct * 100)}%</span>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-5 mb-4 text-[11.5px]">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#5eead4]" />Activate ({activateTotal})</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: PEER_COLOR }} />{peer.name} ({peer.total})</span>
        <span className="text-zinc-600">share of each funder&apos;s portfolio by space</span>
      </div>

      <div className="space-y-2.5">
        {rows.map((r) => (
          <button key={r.v} onClick={() => onSelect?.(r.v)}
            className={`w-full grid items-center gap-3 px-2 py-1.5 rounded-lg text-left transition ${activeVertical === r.v ? "bg-teal-400/10" : "hover:bg-white/[0.02]"}`}
            style={{ gridTemplateColumns: "168px 1fr" }}>
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: verticalColor(r.v) }} />
              <span className="text-[12px] text-zinc-300 truncate">{r.v.replace(" / CO2e", "")}</span>
            </span>
            <div className="space-y-1">
              <Bar pct={r.a} color="#5eead4" />
              <Bar pct={r.p} color={PEER_COLOR} />
            </div>
          </button>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-zinc-600 max-w-3xl">
        Two leading equity-light deep-tech funders, side by side. {peer.name}&apos;s taxonomy is coarser
        (its catch-all &quot;advanced engineering&quot; tag inflates Manufacturing &amp; Robotics), so read this as
        directional positioning, not a precise overlap. Source: {peer.name} portfolio page.
      </p>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { Company, Founder, fmtUSD, verticalColor } from "@/lib/data";

export default function CompanyDrawer({
  company,
  onClose,
}: {
  company: Company | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!company) return null;
  const c = company;
  const resolved = (c.founders ?? []).filter((f) => f.resolved);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative w-full max-w-lg h-full overflow-y-auto scroll-thin bg-[#0b0d11] border-l border-[#1d2128] shadow-2xl">
        <div className="p-6">
          <button onClick={onClose}
            className="absolute top-5 right-5 text-zinc-500 hover:text-zinc-200 text-sm">
            close ✕
          </button>

          {/* header */}
          <div className="text-[11px] text-zinc-500 mb-1">
            {c.cohort_year ?? "year n/a"}{c.hub ? ` · ${c.hub}` : ""}
          </div>
          <h2 className="text-2xl font-semibold text-zinc-50 pr-16">{c.name}</h2>
          {c.tagline && <p className="text-zinc-400 mt-1.5">{c.tagline}</p>}

          <div className="flex flex-wrap gap-1.5 mt-4">
            {c.verticals.map((v) => (
              <span key={v} className="inline-flex items-center gap-1.5 text-[11px] text-zinc-300 bg-[#14171d] border border-[#1d2128] rounded-full px-2.5 py-1">
                <span className="w-2 h-2 rounded-full" style={{ background: verticalColor(v) }} />
                {v}
              </span>
            ))}
          </div>

          <div className="flex gap-3 mt-4 text-[12px]">
            {c.website && (
              <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-teal-300 hover:text-teal-200">website ↗</a>
            )}
            {c.activate_url && (
              <a href={c.activate_url} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-200">activate.org ↗</a>
            )}
          </div>

          {/* outcomes */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="panel p-3">
              <div className="text-lg font-semibold text-teal-300">{fmtUSD(c.federal_total, { compact: true })}</div>
              <div className="text-[10.5px] text-zinc-500 mt-0.5">federal non-dilutive</div>
            </div>
            <div className="panel p-3">
              <div className="text-lg font-semibold text-zinc-100">{c.federal_count}</div>
              <div className="text-[10.5px] text-zinc-500 mt-0.5">federal awards</div>
            </div>
            <div className="panel p-3">
              <div className="text-lg font-semibold text-zinc-100">{c.edgar_formD > 0 ? "Yes" : "No"}</div>
              <div className="text-[10.5px] text-zinc-500 mt-0.5">SEC Form D</div>
            </div>
          </div>

          {/* narrative */}
          {[
            ["The critical need", c.critical_need],
            ["Technology vision", c.technology_vision],
            ["Potential impact", c.potential_impact],
          ]
            .filter(([, t]) => t)
            .map(([h, t]) => (
              <div key={h} className="mt-6">
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1.5">{h}</div>
                <p className="text-[13.5px] text-zinc-300 leading-relaxed">{t}</p>
              </div>
            ))}

          {/* funding detail: by agency */}
          {c.federal_agencies?.length > 0 && (
            <div className="mt-6">
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Federal funding by agency</div>
              <div className="space-y-2">
                {c.federal_agencies.map((a, i) => (
                  <div key={i} className="panel p-3 flex items-center justify-between gap-3">
                    <span className="text-[12.5px] text-zinc-300">{a.name}</span>
                    <span className="text-[12px] text-teal-300 font-medium whitespace-nowrap">{fmtUSD(a.amount, { compact: true })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* founders: authoritative bio (degree/field/university) + research footprint */}
          {(() => {
            const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
            const profiles = c.fellow_profiles?.length
              ? c.fellow_profiles
              : c.fellows.map((n) => ({ name: n, degree: null, universities: [] as string[], field_of_study: null, linkedin: "", bio: "" }));
            return (
              <div className="mt-6">
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
                  Founding scientist{profiles.length > 1 ? "s" : ""}
                </div>
                <div className="space-y-3">
                  {profiles.map((fp, i) => {
                    const r = (c.founders ?? []).find((f) => f.resolved && norm(f.name) === norm(fp.name));
                    const meta = [fp.degree, fp.field_of_study, fp.universities?.[0]].filter(Boolean).join(" · ");
                    return (
                      <div key={i} className="panel p-3.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-medium text-zinc-100 text-[14px]">{fp.name}</span>
                          {fp.linkedin && (
                            <a href={fp.linkedin} target="_blank" rel="noopener noreferrer" className="text-[11px] text-zinc-500 hover:text-teal-300">LinkedIn ↗</a>
                          )}
                        </div>
                        {meta && <div className="text-[11.5px] text-teal-300/80 mt-0.5">{meta}</div>}
                        {r && (r.cited_by_count != null || r.h_index != null) && (
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            {r.cited_by_count != null && <>{r.cited_by_count.toLocaleString()} citations</>}
                            {r.h_index != null && <> · h-index {r.h_index}</>}
                          </div>
                        )}
                        {r?.pre_founding_topics && r.pre_founding_topics.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {r.pre_founding_topics.slice(0, 4).map((t) => (
                              <span key={t} className="text-[10.5px] text-zinc-300 bg-[#14171d] border border-[#1d2128] rounded px-2 py-0.5">{t}</span>
                            ))}
                          </div>
                        )}
                        {fp.bio && <p className="text-[12px] text-zinc-400 mt-2 leading-relaxed line-clamp-4">{fp.bio}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </aside>
    </div>
  );
}

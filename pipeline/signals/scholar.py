"""
Founder research footprint via OpenAlex (free, no key).

Resolves a fellow -> their actual body of work, with FIELD-AWARE
disambiguation: a bare name search returns the most-cited namesake (a
child-psychology "Margaret Lumley" outranks the chemist who founded Roca
Water), so we score each candidate author's research topics against the
company's vertical + description and reject candidates that don't align.

Powers two things:
  - founder footprint  : works, citations, h-index, field, institution
  - pre-founding trend : the topics a fellow worked on BEFORE founding —
                         a leading indicator of where the frontier is heading.

OpenAlex double-duty: the same source gives field-level publication velocity
(the "analyze the field" layer) and the per-founder footprint here, plus the
field baselines needed to normalize founder metrics. See [[fellow-signal-project]].
"""
from __future__ import annotations

import re
import time

import requests

UA = {"User-Agent": "FellowSignal/0.1 (mailto:may.payton@bitsourceky.com)"}
MAILTO = "may.payton@bitsourceky.com"  # OpenAlex polite pool
AUTHORS = "https://api.openalex.org/authors"
WORKS = "https://api.openalex.org/works"

_session = requests.Session()
_session.headers.update(UA)


class RateLimited(Exception):
    """Raised when OpenAlex keeps throttling — lets callers distinguish a
    throttle from a genuine no-match (so we don't record real founders as
    unresolved)."""


def _get(url: str, params: dict, *, timeout: int = 25, retries: int = 5) -> dict | None:
    params = {**params, "mailto": MAILTO}
    for attempt in range(retries):
        try:
            r = _session.get(url, params=params, timeout=timeout)
        except requests.RequestException:
            time.sleep(1.5 * (attempt + 1))
            continue
        if r.status_code == 200:
            try:
                return r.json()
            except ValueError:
                return None
        if r.status_code in (429, 500, 502, 503):
            wait = float(r.headers.get("Retry-After", 2 * (attempt + 1)))
            time.sleep(min(wait, 10))
            continue
        return None
    raise RateLimited(url)

STOP = set("the a an and or of to for with from into using that this their our we are "
           "is be as on in by at it its inc llc labs technology technologies company "
           "next generation high low cost new novel platform system systems based "
           "solutions energy".split())


def tokens(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z][a-z\-]{3,}", (text or "").lower()) if w not in STOP}


def company_bag(company: dict) -> set[str]:
    """Salient tokens describing the company's scientific space.

    Use ALL narrative fields — marketing one-liners use different vocabulary
    than academic paper topics, so the richer the bag the better the match.
    """
    parts = [company.get("name", ""), company.get("one_liner", ""),
             company.get("technology_vision", ""), company.get("critical_need", ""),
             company.get("potential_impact", ""), company.get("elevator_pitch", ""),
             " ".join(company.get("verticals", []))]
    return tokens(" ".join(parts))


def _author_topics(author: dict) -> list[str]:
    return [t["display_name"] for t in (author.get("topics") or [])]


# OpenAlex top-level domains that count as scientific/technical. A founder whose
# research lives in Social Sciences for a hard-tech company is the wrong namesake.
STEM_DOMAINS = {"Physical Sciences", "Life Sciences", "Health Sciences"}


def _author_field_tokens(author: dict) -> set[str]:
    """Tokens from the author's topic hierarchy (topic + subfield + field)."""
    bag: set[str] = set()
    for t in (author.get("topics") or []):
        for key in ("display_name",):
            bag |= tokens(t.get(key, ""))
        bag |= tokens((t.get("subfield") or {}).get("display_name", ""))
        bag |= tokens((t.get("field") or {}).get("display_name", ""))
    return bag


def _author_domain(author: dict) -> str | None:
    for t in (author.get("topics") or []):
        d = (t.get("domain") or {}).get("display_name")
        if d:
            return d
    return None


def _affiliations(author: dict) -> list[dict]:
    """Institutions the author has been affiliated with, earliest first."""
    out = []
    for af in (author.get("affiliations") or []):
        inst = af.get("institution") or {}
        yrs = af.get("years") or []
        out.append({
            "name": inst.get("display_name"),
            "type": inst.get("type"),          # education / funder / facility / company ...
            "country": inst.get("country_code"),
            "since": min(yrs) if yrs else None,
        })
    return sorted(out, key=lambda a: (a["since"] is None, a["since"] or 9999))


def _training_institution(affils: list[dict]) -> str | None:
    """Earliest education-type affiliation ~ where they trained (PhD)."""
    for a in affils:
        if a["type"] == "education":
            return a["name"]
    return affils[0]["name"] if affils else None


def _field(author: dict) -> str | None:
    for t in (author.get("topics") or []):
        f = (t.get("field") or {}).get("display_name")
        if f:
            return f
    return None


def resolve_fellow(name: str, company: dict, *, min_score: int = 2,
                   timeout: int = 25) -> dict | None:
    """Best-matching OpenAlex author for `name` given the company's field.

    Returns None when no candidate's research aligns with the company (the
    fellow may be non-academic, or every namesake is the wrong person).
    """
    data = _get(AUTHORS, {"search": name, "per-page": 5}, timeout=timeout)
    candidates = (data or {}).get("results", [])

    bag = company_bag(company)
    # Most Activate ventures are hard tech → a STEM-domain founder is expected.
    company_is_stem = any(v not in {"", None} for v in company.get("verticals", []))
    best, best_score = None, -1
    for a in candidates:
        domain = _author_domain(a)
        # Hard domain gate: reject obviously-unrelated namesakes (e.g. a
        # psychologist for a battery company) regardless of token overlap.
        if company_is_stem and domain and domain not in STEM_DOMAINS:
            continue
        score = len(bag & _author_field_tokens(a))
        # A STEM-domain match with weak token overlap still beats no match.
        if domain in STEM_DOMAINS:
            score += 1
        if score > best_score:
            best, best_score = a, score
    if not best or best_score < min_score:
        return None

    inst = best.get("last_known_institutions") or []
    stats = best.get("summary_stats") or {}
    # Precision guard: a recent-cohort startup founder is early/mid-career. An
    # h-index in the 60s+ or 150+ works means we matched a prolific senior
    # namesake (common with names like "Bing Li") — reject rather than pollute.
    if (stats.get("h_index") or 0) > 60 or (best.get("works_count") or 0) > 150:
        return None
    affils = _affiliations(best)
    return {
        "name": name,
        "openalex_id": best["id"].split("/")[-1],
        "display_name": best.get("display_name"),
        "match_score": best_score,
        "works_count": best.get("works_count"),
        "cited_by_count": best.get("cited_by_count"),
        "h_index": stats.get("h_index"),
        "i10_index": stats.get("i10_index"),
        "two_yr_mean_citedness": stats.get("2yr_mean_citedness"),
        "institution": inst[0].get("display_name") if inst else None,
        "training_institution": _training_institution(affils),
        "affiliations": affils[:6],
        "field": _field(best),
        "topics": _author_topics(best)[:6],
    }


def works_timeline(openalex_id: str, *, timeout: int = 25) -> list[dict]:
    """Chronological works: (year, title, primary topic) — for trend analysis."""
    data = _get(WORKS, {
        "filter": f"author.id:{openalex_id}",
        "sort": "publication_date:asc", "per-page": 100,
        "select": "title,publication_year,primary_topic,cited_by_count",
    }, timeout=timeout)
    works = (data or {}).get("results", [])
    out = []
    for w in works:
        pt = w.get("primary_topic") or {}
        out.append({
            "year": w.get("publication_year"),
            "title": w.get("title", ""),
            "topic": pt.get("display_name"),
            "subfield": (pt.get("subfield") or {}).get("display_name"),
            "field": (pt.get("field") or {}).get("display_name"),
            "citations": w.get("cited_by_count"),
        })
    return out


def pre_founding_topics(timeline: list[dict], cohort_year: int | None) -> list[str]:
    """Topics the fellow published on BEFORE founding (the leading signal)."""
    if not cohort_year:
        return []
    pre = [w["topic"] for w in timeline if w["year"] and w["year"] <= cohort_year and w["topic"]]
    # de-dupe preserving order
    seen, out = set(), []
    for t in pre:
        if t not in seen:
            seen.add(t); out.append(t)
    return out

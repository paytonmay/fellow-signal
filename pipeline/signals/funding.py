"""
External funding signal — public data sources.

Two query modes power the two analyses Payton wants:

  by_company()  -> ACTIVATE RETROSPECTIVE: did a fellow venture win non-dilutive
                   grants / raise capital? (outcome ledger)
  by_topic()    -> ECOSYSTEM INTELLIGENCE: who else is funded in a given space?
                   (all recipients in a vertical/keyword -> Activate's share)

Sources (all free / public):
  - NSF Awards API        WORKING. Grants + STTR/SBIR-via-NSF, awardee + amount.
  - SEC EDGAR full-text   WORKING. Form D = private capital raised.
  - SBIR.gov public API   VALID endpoint, currently rate-limited (429). All
                          agencies (DOE/DOD/NASA/NIH) — the bulk of deep-tech
                          non-dilutive funding. Use with backoff.
  - USAspending.gov       (future) every federal award, by recipient/space.

This module ships the NSF path (proven) and thin stubs for the others.
"""
from __future__ import annotations

import re
import time

import requests

UA = {"User-Agent": "FellowSignal/0.1 (research; may.payton@bitsourceky.com)"}
NSF = "https://www.research.gov/awardapi-service/v1/awards.json"
EDGAR_FTS = "https://efts.sec.gov/LATEST/search-index"


def norm(s: str) -> str:
    """Normalize a company name for fuzzy entity matching."""
    s = re.sub(r"\(.*?\)", "", s or "").upper()
    s = re.sub(r"\b(INC|LLC|LTD|CORP|CO|COMPANY|TECHNOLOGIES|TECHNOLOGY|LABS|"
               r"INCORPORATED|THE)\b", "", s)
    return re.sub(r"[^A-Z0-9]", "", s)


def nsf_by_company(name: str, *, timeout: int = 25) -> list[dict]:
    """NSF awards whose awardee entity matches `name`."""
    try:
        r = requests.get(NSF, params={
            "keyword": f'"{name}"',
            "printFields": "awardeeName,fundsObligatedAmt,title,date,agency,startDate",
        }, headers=UA, timeout=timeout)
        awards = r.json().get("response", {}).get("award", [])
    except (requests.RequestException, ValueError):
        return []
    cn = norm(name)
    out = []
    for a in awards:
        if cn and cn in norm(a.get("awardeeName", "")):
            out.append({
                "source": "NSF",
                "awardee": a.get("awardeeName"),
                "amount": int(float(a.get("fundsObligatedAmt") or 0)),
                "title": a.get("title", ""),
                "date": a.get("startDate") or a.get("date"),
            })
    return out


def nsf_by_topic(keyword: str, *, timeout: int = 25) -> list[dict]:
    """All NSF awards mentioning `keyword` — the ecosystem/landscape view."""
    try:
        r = requests.get(NSF, params={
            "keyword": f'"{keyword}"',
            "printFields": "awardeeName,fundsObligatedAmt,title,startDate",
        }, headers=UA, timeout=timeout)
        return r.json().get("response", {}).get("award", [])
    except (requests.RequestException, ValueError):
        return []


def edgar_mentions(name: str, *, form: str | None = "D", timeout: int = 25) -> int:
    """Count SEC EDGAR filings mentioning `name` (Form D = capital raised)."""
    params = {"q": f'"{name}"'}
    if form:
        params["forms"] = form
    try:
        r = requests.get(EDGAR_FTS, params=params, headers=UA, timeout=timeout)
        return r.json().get("hits", {}).get("total", {}).get("value", 0)
    except (requests.RequestException, ValueError):
        return 0


def collect_company(name: str) -> dict:
    """Outcome ledger for one company across available sources."""
    nsf = nsf_by_company(name)
    time.sleep(0.3)
    return {
        "company": name,
        "nsf_awards": nsf,
        "nsf_total": sum(a["amount"] for a in nsf),
        "edgar_formD_filings": edgar_mentions(name),
    }

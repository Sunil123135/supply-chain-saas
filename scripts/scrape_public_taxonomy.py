#!/usr/bin/env python3
"""
Fetch public FMCG / MedTech category pages and refresh taxonomy JSON files.
Does NOT scrape proprietary SKU catalogs, prices, or inventory.
"""

from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "taxonomy"

URLS = {
    "fmcg_categories": "https://rateomatic.in/blog/what-are-fmcg-products-complete-list-and-categories",
}


def fetch_text(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "YugamTaxonomyBot/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="ignore")


def extract_headings(html: str) -> list[str]:
    headings = re.findall(r"<h[234][^>]*>([^<]+)</h[234]>", html, re.I)
    list_items = re.findall(r"<li[^>]*>([^<]{4,80})</li>", html, re.I)
    cleaned: list[str] = []
    for raw in headings + list_items:
        t = re.sub(r"\s+", " ", raw).strip(" .-")
        if len(t) < 4 or len(t) > 80:
            continue
        if t.lower() in {"table of contents", "share", "related posts"}:
            continue
        if t not in cleaned:
            cleaned.append(t)
    return cleaned[:50]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    headings: list[str] = []
    try:
        html = fetch_text(URLS["fmcg_categories"])
        headings = extract_headings(html)
    except Exception as e:
        print(f"Scrape skipped: {e}")

    fallback = OUT / "india-fmcg-public.json"
    if fallback.exists() and len(headings) < 5:
        meta = json.loads(fallback.read_text(encoding="utf-8"))
        for seg in meta.get("segments", {}).values():
            headings.extend(seg.get("subcategories", []))
        headings.extend(meta.get("india_companies_public", [])[:10])

    payload = {
        "source_url": URLS["fmcg_categories"],
        "scraped_headings": headings[:50],
        "note": "Category labels only — transactional CSVs are synthetic starter packs",
    }
    (OUT / "scraped-fmcg-headings.json").write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )
    print(f"Wrote {len(headings)} headings to scraped-fmcg-headings.json")


if __name__ == "__main__":
    main()

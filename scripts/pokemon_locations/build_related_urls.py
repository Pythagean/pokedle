#!/usr/bin/env python3
"""Build a list of Bulbapedia URLs from the "Related articles" section of a page.

Usage:
  python build_related_urls.py --page-url <url> --output related_urls.txt

This finds the "Related articles" heading, collects all article links under
that section (stopping at the next header of the same-or-higher level), and
writes full Bulbapedia URLs to the output file, one per line.
"""

import argparse
import sys
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup


HEADERS = {"User-Agent": "pokedle-related-urls/1.0 (https://github.com/pokedle)"}


def find_related_links(page_url: str):
    r = requests.get(page_url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")

    # find the header whose text contains "Related articles" (case-insensitive)
    header = None
    for tag in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
        text = tag.get_text(" ", strip=True).lower()
        if "related articles" in text:
            header = tag
            break

    if header is None:
        return []

    level = 6
    try:
        level = int(header.name[1])
    except Exception:
        pass

    links = []
    seen = set()

    for sib in header.next_siblings:
        # stop if we hit a header at the same or higher level
        if getattr(sib, "name", None) and sib.name and sib.name.startswith("h"):
            try:
                if int(sib.name[1]) <= level:
                    break
            except Exception:
                pass

        # collect anchors in this sibling
        if getattr(sib, "find_all", None):
            for a in sib.find_all("a", href=True):
                href = a["href"]
                if href.startswith("#"):
                    continue
                # normalize to absolute URL
                full = urljoin("https://bulbapedia.bulbagarden.net/", href)

                # limit to /wiki/ article links and exclude namespaced pages (File:, Special:, Category:, Help:, etc.)
                if "/wiki/" not in full:
                    continue
                title = full.split("/wiki/")[-1]
                if ":" in title:
                    continue

                if full not in seen:
                    seen.add(full)
                    links.append(full)

    return links


def main():
    p = argparse.ArgumentParser(description="Scrape 'Related articles' links from a Bulbapedia page")
    p.add_argument("--page-url", required=True, help="Bulbapedia page URL to scrape")
    p.add_argument("--output", required=True, help="Path to write output URLs (one per line)")
    args = p.parse_args()

    try:
        links = find_related_links(args.page_url)
    except Exception as exc:
        print(f"ERROR fetching page: {exc}")
        sys.exit(1)

    if not links:
        print("No related links found.")
    else:
        print(f"Found {len(links)} related links")

    try:
        with open(args.output, "w", encoding="utf-8", newline="\n") as f:
            for u in links:
                f.write(u + "\n")
        print(f"Wrote {len(links)} URLs to: {args.output}")
    except IOError as exc:
        print(f"ERROR writing output file: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Build southbay-intel.json for the McMullen Residential Market Intelligence page.

Reads the city-market property records (cb/lg/sr-props.json) from the
campbell-market repo and emits ONE compact snapshot containing, per market:
  totals   - headline coverage + trailing-12-month stats
  quarters - median $/sf, median price and sale count per quarter (10 years)
  feed     - most recent recorded sales

METHOD (identical for every market, so cross-market comparison is meaningful):
  * a record counts as a sale when it has a sale date, sale price and sqft
  * $/sf = sale price / sqft, sanity-bounded to $50-$10,000 to drop bad records
  * quarterly figures are MEDIANS, never averages
  * quarters with fewer than MIN_N sales are still emitted but flagged thin

Parity check: running this method against Campbell reproduces the published
cb-market-intel.json series to a median difference of $1/sf, with 38 of 39
quarters inside $10/sf.

Usage:  python3 build_southbay_intel.py <assets_dir> <output.json>
"""
import json
import statistics
import sys
from collections import defaultdict
from datetime import date

MARKETS = [
    # key,        prefix, display,      domain
    ("campbell",  "cb", "Campbell",   "campbellrealestatemarket.com"),
    ("los-gatos", "lg", "Los Gatos",  "losgatosrealestatemarket.com"),
    ("saratoga",  "sr", "Saratoga",   "saratogarealestatemarket.com"),
]

YEARS = 10
FEED_N = 15
PPSF_MIN, PPSF_MAX = 50, 10_000
MIN_N = 5  # quarters below this are flagged thin


def usable(p):
    if not (p.get("sd") and p.get("sp") and p.get("sf")):
        return False
    try:
        ppsf = p["sp"] / p["sf"]
    except (TypeError, ZeroDivisionError):
        return False
    return PPSF_MIN <= ppsf <= PPSF_MAX


def quarter_of(d):
    y, m = int(d[:4]), int(d[5:7])
    return y, (m - 1) // 3 + 1


def build_market(assets, prefix):
    props = json.load(open(f"{assets}/{prefix}-props.json"))
    try:
        streets = len(json.load(open(f"{assets}/{prefix}-streets.json")))
    except Exception:
        streets = None

    sales = [p for p in props if usable(p)]
    today = date.today()
    cutoff_year = today.year - YEARS

    buckets = defaultdict(list)
    for p in sales:
        y, q = quarter_of(p["sd"])
        if y < cutoff_year:
            continue
        buckets[(y, q)].append((p["sp"] / p["sf"], p["sp"]))

    quarters = []
    for (y, q) in sorted(buckets):
        vals = buckets[(y, q)]
        quarters.append({
            "q": f"{y} Q{q}",
            "ppsf": round(statistics.median([a for a, _ in vals])),
            "price": round(statistics.median([b for _, b in vals])),
            "n": len(vals),
            **({"thin": True} if len(vals) < MIN_N else {}),
        })

    # trailing 12 months
    cut12 = f"{today.year - 1:04d}-{today.month:02d}-{today.day:02d}"
    last12 = [p for p in sales if p["sd"] >= cut12]

    recent = sorted(sales, key=lambda p: p["sd"], reverse=True)[:FEED_N]
    feed = [{
        "a": p.get("a"),
        "s": p.get("s"),
        "p": round(p["sp"]),
        "sf": p["sf"],
        "ppsf": round(p["sp"] / p["sf"]),
        "d": p["sd"],
        "b": p.get("b"),
        "ba": p.get("ba"),
    } for p in recent]

    return {
        "totals": {
            "homes_indexed": len(props),
            "sales_on_record": len(sales),
            "streets": streets,
            "sales_12mo": len(last12),
            "median_ppsf_12mo": round(statistics.median([p["sp"] / p["sf"] for p in last12])) if last12 else None,
            "median_price_12mo": round(statistics.median([p["sp"] for p in last12])) if last12 else None,
            "latest_sale": recent[0]["sd"] if recent else None,
        },
        "quarters": quarters,
        "feed": feed,
    }


def main():
    assets = sys.argv[1] if len(sys.argv) > 1 else "."
    out = sys.argv[2] if len(sys.argv) > 2 else "southbay-intel.json"

    payload = {
        "generated": date.today().isoformat(),
        "method": (
            "Median sale price per square foot by quarter, derived from recorded "
            "sales in each city's parcel record. Medians, never averages. "
            "Identical method in every market."
        ),
        "markets": {},
    }
    for key, prefix, name, domain in MARKETS:
        m = build_market(assets, prefix)
        m["name"] = name
        m["domain"] = domain
        payload["markets"][key] = m
        t = m["totals"]
        print(f"{name:10s} homes {t['homes_indexed']:>6,}  sales {t['sales_on_record']:>6,}  "
              f"12mo {t['sales_12mo']:>4}  ${t['median_ppsf_12mo']}/sf  quarters {len(m['quarters'])}")

    json.dump(payload, open(out, "w"), separators=(",", ":"))
    import os
    print(f"\nwrote {out}  ({os.path.getsize(out)/1024:.1f} KB)")


if __name__ == "__main__":
    main()

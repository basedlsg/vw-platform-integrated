"""
Ingest Runner — orchestrates all live data fetchers and posts to the Next.js event store.
Designed to run on a schedule (GitHub Actions cron, Vercel cron, or locally).

Schedule recommendations:
  - Stock prices: daily at 18:00 UTC (after Frankfurt market close)
  - GDELT risk signals: every 6 hours
  - RSS news proposals: every 6 hours
  - BEV share: monthly (manual or 1st of each month)

Usage:
  python ingest_runner.py --all          # Run all fetchers
  python ingest_runner.py --stock        # Stock prices only
  python ingest_runner.py --news         # GDELT + RSS only
  python ingest_runner.py --bev          # ACEA BEV share only
"""

import os
import sys
import argparse
import requests
from dotenv import load_dotenv

load_dotenv()

INGEST_URL = os.environ.get("INGEST_URL", "http://localhost:3000/api/ingest/events")
INGEST_KEY = os.environ.get("INGEST_API_KEY", "")


def post_events(events: list[dict], source_name: str) -> None:
    if not events:
        print(f"[{source_name}] No events to post")
        return

    headers = {"Content-Type": "application/json"}
    if INGEST_KEY:
        headers["x-ingest-key"] = INGEST_KEY

    batch_size = 50
    total_inserted = 0

    for i in range(0, len(events), batch_size):
        batch = events[i:i + batch_size]
        try:
            resp = requests.post(INGEST_URL, json=batch, headers=headers, timeout=30)
            result = resp.json()
            inserted = result.get("inserted", 0)
            skipped = result.get("skipped", 0)
            total_inserted += inserted
            errors = result.get("errors", [])
            print(f"[{source_name}] Batch {i // batch_size + 1}: +{inserted} inserted, {skipped} skipped", end="")
            if errors:
                print(f", errors: {errors[:2]}")
            else:
                print()
        except Exception as e:
            print(f"[{source_name}] POST failed: {e}")

    print(f"[{source_name}] Done — {total_inserted} total inserted")


def run_stock(days_back: int = 2) -> None:
    print("\n=== Stock Fetcher ===")
    from fetchers.stock_fetcher import fetch_stock_events, fetch_52w_risk_signal
    events = fetch_stock_events(days_back=days_back)
    risk = fetch_52w_risk_signal()
    if risk:
        events.append(risk)
    post_events(events, "STOCK")


def run_gdelt() -> None:
    print("\n=== GDELT Risk Signals ===")
    from fetchers.gdelt_fetcher import fetch_risk_signals
    events = fetch_risk_signals()
    post_events(events, "GDELT")


def run_rss() -> None:
    print("\n=== RSS News Proposals ===")
    from fetchers.rss_fetcher import fetch_news_proposals
    events = fetch_news_proposals()
    post_events(events, "RSS")


def run_bev() -> None:
    print("\n=== ACEA BEV Share ===")
    from fetchers.acea_fetcher import get_bev_share_events
    import datetime
    # Only fetch current month's data
    now = datetime.date.today()
    from_month = f"{now.year}-{now.month:02d}"
    events = get_bev_share_events(from_month=from_month)
    post_events(events, "ACEA")


def main() -> None:
    parser = argparse.ArgumentParser(description="VW Control Tower ingest runner")
    parser.add_argument("--all", action="store_true", help="Run all fetchers")
    parser.add_argument("--stock", action="store_true", help="Stock prices only")
    parser.add_argument("--news", action="store_true", help="GDELT + RSS news only")
    parser.add_argument("--bev", action="store_true", help="ACEA BEV share only")
    parser.add_argument("--days", type=int, default=2, help="Days back for stock data (default: 2)")
    args = parser.parse_args()

    if not any([args.all, args.stock, args.news, args.bev]):
        parser.print_help()
        sys.exit(1)

    print(f"Ingest target: {INGEST_URL}")

    if args.all or args.stock:
        run_stock(days_back=args.days)

    if args.all or args.news:
        run_gdelt()
        run_rss()

    if args.all or args.bev:
        run_bev()

    print("\nIngest run complete.")


if __name__ == "__main__":
    main()

"""
Stock Fetcher — daily VOW3.DE (VW AG) price data as a financial health proxy.
Uses yfinance — no API key required.
"""

import datetime
import yfinance as yf
from typing import Any


TICKER = "VOW3.DE"
KPI_ID = "KPI_STOCK_PRICE"


def fetch_stock_events(days_back: int = 30) -> list[dict[str, Any]]:
    """
    Fetch recent daily closing prices for VOW3.DE.
    Each day's close becomes a KpiValueUpdatedEvent.

    Args:
        days_back: How many calendar days of history to fetch.

    Returns:
        List of ingest-ready KpiValueUpdatedEvent dicts.
    """
    events: list[dict[str, Any]] = []

    try:
        ticker = yf.Ticker(TICKER)
        end = datetime.date.today()
        start = end - datetime.timedelta(days=days_back)

        hist = ticker.history(start=start.isoformat(), end=end.isoformat())

        if hist.empty:
            print(f"[STOCK] No data returned for {TICKER}")
            return []

        print(f"[STOCK] {TICKER}: fetched {len(hist)} trading days")

        for date_index, row in hist.iterrows():
            close_price = float(row["Close"])
            timestamp = datetime.datetime.combine(
                date_index.date() if hasattr(date_index, 'date') else datetime.date.fromisoformat(str(date_index)[:10]),
                datetime.time(17, 30),  # Frankfurt close
                tzinfo=datetime.timezone.utc,
            ).isoformat()

            events.append({
                "entityId": KPI_ID,
                "entityType": "KPI",
                "type": "KpiValueUpdatedEvent",
                "timestamp": timestamp,
                "payload": {
                    "kpiId": KPI_ID,
                    "newValue": round(close_price, 2),
                    "reason": f"VOW3.DE daily close {str(date_index)[:10]} (EUR)",
                },
            })

    except Exception as e:
        print(f"[STOCK] Error fetching {TICKER}: {e}")

    return events


def fetch_52w_risk_signal() -> dict[str, Any] | None:
    """
    Check if VOW3.DE is near its 52-week low — a risk signal.
    Returns a RiskThresholdSetEvent if within 10% of 52w low.
    """
    try:
        ticker = yf.Ticker(TICKER)
        info = ticker.info
        current = info.get("currentPrice") or info.get("regularMarketPrice")
        low_52w = info.get("fiftyTwoWeekLow")

        if not current or not low_52w:
            return None

        pct_above_low = ((current - low_52w) / low_52w) * 100
        print(f"[STOCK] {TICKER} current: €{current:.2f}, 52w low: €{low_52w:.2f}, {pct_above_low:.1f}% above low")

        impact = "HIGH" if pct_above_low < 5 else "MEDIUM" if pct_above_low < 15 else "LOW"

        return {
            "entityId": "RISK_STOCK_PRESSURE",
            "entityType": "RISK",
            "type": "RiskThresholdSetEvent",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "payload": {
                "riskId": "RISK_STOCK_PRESSURE",
                "newThreshold": round(low_52w, 2),
                "impactLevel": impact,
                "description": (
                    f"VOW3.DE at €{current:.2f} — {pct_above_low:.1f}% above 52w low of €{low_52w:.2f}"
                ),
            },
        }

    except Exception as e:
        print(f"[STOCK] Error fetching risk signal: {e}")
        return None


if __name__ == "__main__":
    events = fetch_stock_events(days_back=7)
    print(f"[STOCK] Generated {len(events)} price events")
    risk = fetch_52w_risk_signal()
    if risk:
        print(f"[STOCK] Risk signal: {risk['payload']['description']}")

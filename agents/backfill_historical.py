"""
Historical Backfill Script — seeds 3 years of VW Group KPI data into the event store.

Data sources:
  - VW Group Annual Reports 2022, 2023, 2024 (ir.volkswagen-group.com)
  - VW Group Interim Reports Q1/H1/Q3 2022–2024
  - VW Group Monthly Deliveries Press Releases

Run once: python backfill_historical.py
Idempotent: duplicate timestamps are skipped gracefully.
"""

import os
import datetime
import requests
from dotenv import load_dotenv

load_dotenv()

INGEST_URL = os.environ.get("INGEST_URL", "http://localhost:3000/api/ingest/events")
INGEST_KEY = os.environ.get("INGEST_API_KEY", "")


# ---------------------------------------------------------------------------
# Operating Margin History
# Source: VW Group Quarterly/Annual Reports
# Unit: % (operating result / revenue)
# ---------------------------------------------------------------------------
OP_MARGIN_HISTORY = [
    # 2022
    {"period": "Q1 2022", "date": "2022-04-28", "value": 8.5, "source": "VW Group Q1 2022 Interim Report"},
    {"period": "H1 2022", "date": "2022-07-28", "value": 8.4, "source": "VW Group H1 2022 Half-Year Report"},
    {"period": "Q3 2022", "date": "2022-11-03", "value": 8.2, "source": "VW Group Q3 2022 Interim Report"},
    {"period": "FY 2022", "date": "2023-03-14", "value": 8.1, "source": "VW Group Annual Report 2022"},
    # 2023
    {"period": "Q1 2023", "date": "2023-04-27", "value": 7.2, "source": "VW Group Q1 2023 Interim Report"},
    {"period": "H1 2023", "date": "2023-07-27", "value": 7.4, "source": "VW Group H1 2023 Half-Year Report"},
    {"period": "Q3 2023", "date": "2023-11-02", "value": 7.1, "source": "VW Group Q3 2023 Interim Report"},
    {"period": "FY 2023", "date": "2024-03-12", "value": 6.4, "source": "VW Group Annual Report 2023"},
    # 2024 (profit warning year)
    {"period": "Q1 2024", "date": "2024-04-25", "value": 3.8, "source": "VW Group Q1 2024 Interim Report"},
    {"period": "H1 2024", "date": "2024-08-01", "value": 2.3, "source": "VW Group H1 2024 Half-Year Report"},
    {"period": "Q3 2024", "date": "2024-10-30", "value": 2.8, "source": "VW Group Q3 2024 Interim Report"},
    {"period": "FY 2024", "date": "2025-03-18", "value": 3.1, "source": "VW Group Annual Report 2024 (estimate)"},
]

# ---------------------------------------------------------------------------
# Cash Conversion Rate History
# Source: VW Group Automotive Division Cash Flow / Operating Result
# Unit: % (net cash flow automotive / operating result)
# ---------------------------------------------------------------------------
CASH_CONV_HISTORY = [
    {"period": "H1 2022", "date": "2022-07-28", "value": 72.0, "source": "VW Group H1 2022 Half-Year Report"},
    {"period": "FY 2022", "date": "2023-03-14", "value": 68.5, "source": "VW Group Annual Report 2022"},
    {"period": "H1 2023", "date": "2023-07-27", "value": 65.0, "source": "VW Group H1 2023 Half-Year Report"},
    {"period": "FY 2023", "date": "2024-03-12", "value": 63.2, "source": "VW Group Annual Report 2023"},
    {"period": "H1 2024", "date": "2024-08-01", "value": 58.0, "source": "VW Group H1 2024 Half-Year Report"},
    {"period": "FY 2024", "date": "2025-03-18", "value": 56.5, "source": "VW Group Annual Report 2024 (estimate)"},
]

# ---------------------------------------------------------------------------
# Risk Events — major risk threshold changes over 3 years
# ---------------------------------------------------------------------------
RISK_HISTORY = [
    {
        "entityId": "RISK_TARIFF_001",
        "date": "2024-01-15",
        "threshold": 0.5,
        "impact": "LOW",
        "description": "Initial US tariff monitoring — baseline",
    },
    {
        "entityId": "RISK_TARIFF_001",
        "date": "2024-04-01",
        "threshold": 1.5,
        "impact": "MEDIUM",
        "description": "US tariff risk escalated — Section 232 steel/aluminium extension",
    },
    {
        "entityId": "RISK_TARIFF_001",
        "date": "2024-11-06",
        "threshold": 2.9,
        "impact": "HIGH",
        "description": "Post-US election tariff exposure elevated to €2.9B — 25% tariff on imported vehicles",
    },
    {
        "entityId": "RISK_NEV_001",
        "date": "2022-06-01",
        "threshold": 15.0,
        "impact": "LOW",
        "description": "China NEV competition monitoring — BYD at 15% market share",
    },
    {
        "entityId": "RISK_NEV_001",
        "date": "2023-06-01",
        "threshold": 25.0,
        "impact": "MEDIUM",
        "description": "NEV competition escalated — BYD overtook VW in China Q1 2023",
    },
    {
        "entityId": "RISK_NEV_001",
        "date": "2024-06-01",
        "threshold": 35.0,
        "impact": "HIGH",
        "description": "NEV pressure HIGH — Chinese brands at 35%+ China EV market share",
    },
]


def _build_kpi_event(entity_id: str, date_str: str, value: float, source: str) -> dict:
    timestamp = datetime.datetime.fromisoformat(f"{date_str}T09:00:00+00:00").isoformat()
    kpi_id = entity_id
    return {
        "entityId": entity_id,
        "entityType": "KPI",
        "type": "KpiValueUpdatedEvent",
        "timestamp": timestamp,
        "payload": {
            "kpiId": kpi_id,
            "newValue": value,
            "reason": source,
        },
    }


def _build_risk_event(risk: dict) -> dict:
    timestamp = datetime.datetime.fromisoformat(f"{risk['date']}T09:00:00+00:00").isoformat()
    return {
        "entityId": risk["entityId"],
        "entityType": "RISK",
        "type": "RiskThresholdSetEvent",
        "timestamp": timestamp,
        "payload": {
            "riskId": risk["entityId"],
            "newThreshold": risk["threshold"],
            "impactLevel": risk["impact"],
            "description": risk["description"],
        },
    }


def build_all_events() -> list[dict]:
    """Build the complete historical event list in chronological order."""
    events = []

    for row in OP_MARGIN_HISTORY:
        events.append(_build_kpi_event("KPI_OP_MARGIN", row["date"], row["value"], row["source"]))

    for row in CASH_CONV_HISTORY:
        events.append(_build_kpi_event("KPI_CASH_CONV", row["date"], row["value"], row["source"]))

    # BEV share — import from acea_fetcher
    from fetchers.acea_fetcher import get_bev_share_events
    events.extend(get_bev_share_events(from_month="2022-01"))

    for risk in RISK_HISTORY:
        events.append(_build_risk_event(risk))

    # Sort chronologically
    events.sort(key=lambda e: e["timestamp"])
    return events


def post_events(events: list[dict]) -> None:
    """POST events to the Next.js ingest endpoint in batches of 50."""
    batch_size = 50
    total_inserted = 0
    total_skipped = 0

    for i in range(0, len(events), batch_size):
        batch = events[i:i + batch_size]
        headers = {"Content-Type": "application/json"}
        if INGEST_KEY:
            headers["x-ingest-key"] = INGEST_KEY

        try:
            resp = requests.post(INGEST_URL, json=batch, headers=headers, timeout=30)
            result = resp.json()
            inserted = result.get("inserted", 0)
            skipped = result.get("skipped", 0)
            errors = result.get("errors", [])
            total_inserted += inserted
            total_skipped += skipped

            print(f"  Batch {i // batch_size + 1}: +{inserted} inserted, {skipped} skipped", end="")
            if errors:
                print(f", {len(errors)} errors: {errors[:2]}")
            else:
                print()

        except Exception as e:
            print(f"  Batch {i // batch_size + 1}: ERROR — {e}")

    print(f"\nBackfill complete: {total_inserted} inserted, {total_skipped} skipped (duplicates)")


if __name__ == "__main__":
    print("Building historical VW Group event set...")
    events = build_all_events()
    print(f"Total events to insert: {len(events)}")
    print(f"Date range: {events[0]['timestamp'][:10]} → {events[-1]['timestamp'][:10]}\n")

    print(f"Posting to {INGEST_URL}...")
    post_events(events)

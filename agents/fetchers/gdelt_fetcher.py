"""
GDELT Fetcher — monitors VW-relevant risk signals (tariffs, EV competition, recalls).
Free, no API key required. Rate limit: 1 request per 5 seconds.
API docs: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
"""

import time
import datetime
import requests
from typing import Any

GDELT_API = "https://api.gdeltproject.org/api/v2/doc/doc"

QUERIES = [
    {
        "query": "Volkswagen tariff trade",
        "risk_id": "RISK_TARIFF_001",
        "label": "US Tariff Exposure",
    },
    {
        "query": "Volkswagen BEV EV competition China",
        "risk_id": "RISK_NEV_001",
        "label": "NEV/BEV Competition",
    },
    {
        "query": "Volkswagen recall safety",
        "risk_id": "RISK_RECALL_001",
        "label": "Product Recall Risk",
    },
]


def _fetch_gdelt(query: str, max_records: int = 10) -> list[dict[str, Any]]:
    """Fetch article list from GDELT for a given query. Returns list of article dicts."""
    params = {
        "query": query,
        "mode": "artlist",
        "format": "json",
        "maxrecords": max_records,
        "timespan": "7d",  # last 7 days only
    }
    try:
        resp = requests.get(GDELT_API, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        return data.get("articles", [])
    except Exception as e:
        print(f"[GDELT] Error fetching '{query}': {e}")
        return []


def _score_to_impact(article_count: int) -> str:
    """Translate article volume to impact level for risk signals."""
    if article_count >= 8:
        return "HIGH"
    if article_count >= 3:
        return "MEDIUM"
    return "LOW"


def fetch_risk_signals() -> list[dict[str, Any]]:
    """
    For each query, fetch recent GDELT article volume and produce a
    RiskThresholdSetEvent payload if the volume is notable.

    Returns list of ingest-ready event dicts.
    """
    events: list[dict[str, Any]] = []

    for i, q in enumerate(QUERIES):
        if i > 0:
            time.sleep(6)  # GDELT rate limit: 1 req/5s

        articles = _fetch_gdelt(q["query"])
        count = len(articles)
        impact = _score_to_impact(count)

        print(f"[GDELT] '{q['query']}' → {count} articles → impact: {impact}")

        # Only emit an event if there is any signal at all
        if count > 0:
            events.append({
                "entityId": q["risk_id"],
                "entityType": "RISK",
                "type": "RiskThresholdSetEvent",
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "payload": {
                    "riskId": q["risk_id"],
                    "newThreshold": float(count),  # article count as threshold proxy
                    "impactLevel": impact,
                    "description": q["label"],
                    "sourceNote": f"GDELT: {count} articles in last 7 days for '{q['query']}'",
                },
            })

        # Also surface top articles as proposals for agent review
        for article in articles[:2]:
            title = article.get("title", "")
            url = article.get("url", "")
            if title:
                prop_id = f"PROP_NEWS_{q['risk_id']}_{int(time.time())}"
                events.append({
                    "entityId": prop_id,
                    "entityType": "PROPOSAL",
                    "type": "AgentProposalCreatedEvent",
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "payload": {
                        "proposalId": prop_id,
                        "title": f"[News Signal] {title[:100]}",
                        "description": f"GDELT article detected for risk '{q['label']}'. Source: {url}",
                        "suggestedAction": f"Review {impact.lower()} impact signal and update risk threshold if warranted.",
                        "proposedStateChange": {
                            "riskId": q["risk_id"],
                            "suggestedImpact": impact,
                            "articleCount": count,
                        },
                    },
                })

    return events


if __name__ == "__main__":
    signals = fetch_risk_signals()
    print(f"\n[GDELT] Generated {len(signals)} events")
    for ev in signals:
        print(f"  → {ev['type']} for {ev['entityId']}")

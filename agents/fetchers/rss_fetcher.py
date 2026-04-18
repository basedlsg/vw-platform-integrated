"""
RSS Fetcher — pulls VW-relevant news from multiple RSS sources.
Zero cost, no API key. Uses feedparser.

Sources:
- Reuters Business (filters for VW/Volkswagen)
- VW Group Newsroom (official press releases)
- Financial Times (public RSS, filtered)
"""

import datetime
import time
import feedparser
from typing import Any

RSS_SOURCES = [
    {
        "url": "https://feeds.reuters.com/reuters/businessNews",
        "name": "Reuters Business",
        "keywords": ["volkswagen", "vw group", "audi", "porsche ag", "skoda", "seat"],
    },
    {
        "url": "https://www.volkswagen-newsroom.com/en/press-releases.rss",
        "name": "VW Newsroom",
        "keywords": [],  # All entries are VW-relevant
    },
    {
        "url": "https://www.autonews.com/rss.xml",
        "name": "Automotive News",
        "keywords": ["volkswagen", "vw", "audi", "porsche"],
    },
    {
        "url": "https://electrek.co/feed/",
        "name": "Electrek (EV news)",
        "keywords": ["volkswagen", "vw", "id.4", "id.3", "audi ev", "porsche ev"],
    },
]

# Risk keywords to surface as proposals
RISK_KEYWORDS = {
    "tariff": "RISK_TARIFF_001",
    "trade war": "RISK_TARIFF_001",
    "import duty": "RISK_TARIFF_001",
    "bev competition": "RISK_NEV_001",
    "ev competition": "RISK_NEV_001",
    "china ev": "RISK_NEV_001",
    "byd": "RISK_NEV_001",
    "recall": "RISK_RECALL_001",
    "profit warning": "RISK_MARGIN_001",
    "margin": "RISK_MARGIN_001",
    "layoff": "RISK_MARGIN_001",
    "restructur": "RISK_MARGIN_001",
}


def _parse_feed(source: dict[str, Any]) -> list[dict[str, Any]]:
    """Parse a single RSS feed and return matching entries."""
    try:
        feed = feedparser.parse(source["url"])
        if feed.bozo and not feed.entries:
            print(f"[RSS] Failed to parse {source['name']}: {feed.bozo_exception}")
            return []

        entries = []
        keywords = [k.lower() for k in source["keywords"]]

        for entry in feed.entries[:20]:  # limit to 20 most recent
            title = entry.get("title", "").lower()
            summary = entry.get("summary", "").lower()
            text = f"{title} {summary}"

            # Filter by source keywords (empty list = accept all)
            if keywords and not any(k in text for k in keywords):
                continue

            entries.append({
                "title": entry.get("title", ""),
                "summary": entry.get("summary", "")[:500],
                "link": entry.get("link", ""),
                "published": entry.get("published", ""),
                "source": source["name"],
            })

        print(f"[RSS] {source['name']}: {len(entries)} relevant articles")
        return entries

    except Exception as e:
        print(f"[RSS] Error fetching {source['name']}: {e}")
        return []


def _detect_risks(text: str) -> list[str]:
    """Return list of risk IDs triggered by text content."""
    text_lower = text.lower()
    triggered = set()
    for keyword, risk_id in RISK_KEYWORDS.items():
        if keyword in text_lower:
            triggered.add(risk_id)
    return list(triggered)


def fetch_news_proposals() -> list[dict[str, Any]]:
    """
    Fetch all RSS sources, filter for VW-relevant articles,
    and produce AgentProposalCreatedEvent payloads for items
    that trigger known risk keywords.

    Returns list of ingest-ready event dicts.
    """
    events: list[dict[str, Any]] = []
    seen_titles: set[str] = set()

    for source in RSS_SOURCES:
        entries = _parse_feed(source)
        time.sleep(1)  # polite crawling

        for entry in entries:
            title = entry["title"]
            if title in seen_titles:
                continue
            seen_titles.add(title)

            combined_text = f"{title} {entry['summary']}"
            triggered_risks = _detect_risks(combined_text)

            if not triggered_risks:
                continue  # Only create proposals for risk-relevant articles

            prop_id = f"PROP_RSS_{abs(hash(title)) % 1_000_000:06d}"
            risk_label = ", ".join(triggered_risks)

            events.append({
                "entityId": prop_id,
                "entityType": "PROPOSAL",
                "type": "AgentProposalCreatedEvent",
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "payload": {
                    "proposalId": prop_id,
                    "title": f"[{entry['source']}] {title[:120]}",
                    "description": (
                        f"{entry['summary'][:300]}\n\n"
                        f"Source: {entry['link']}\n"
                        f"Published: {entry['published']}"
                    ),
                    "suggestedAction": (
                        f"Review article for impact on {risk_label}. "
                        "Consider updating risk threshold if material new information."
                    ),
                    "proposedStateChange": {
                        "triggeredRisks": triggered_risks,
                        "sourceUrl": entry["link"],
                    },
                },
            })

    return events


if __name__ == "__main__":
    proposals = fetch_news_proposals()
    print(f"\n[RSS] Generated {len(proposals)} proposals from news")
    for p in proposals:
        print(f"  → {p['payload']['title'][:80]}")

import os
from typing import Any

from dotenv import load_dotenv
from supabase import create_client, Client
from fastapi import FastAPI
from fastapi.responses import JSONResponse

load_dotenv()

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321")
SUPABASE_KEY = os.environ.get(
    "SUPABASE_SERVICE_ROLE_KEY",
    os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""),
)

supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Core Tool Functions ---


def get_current_kpi_snapshot(kpi_name: str) -> dict[str, Any]:
    """Fetch the latest event for a KPI entity from the events table."""
    response = (
        supabase_client.table("events")
        .select("*")
        .eq("entity_id", kpi_name)
        .eq("entity_type", "KPI")
        .order("sequence", desc=True)
        .limit(1)
        .execute()
    )
    if response.data:
        return response.data[0]
    return {"error": f"KPI '{kpi_name}' not found."}


def get_open_risks() -> list[dict[str, Any]]:
    """Fetch all RISK-type events from the events table."""
    response = (
        supabase_client.table("events")
        .select("*")
        .eq("entity_type", "RISK")
        .order("sequence", desc=True)
        .execute()
    )
    return response.data or []


def get_pending_proposals() -> list[dict[str, Any]]:
    """Fetch all PROPOSAL-type events with PENDING status."""
    response = (
        supabase_client.table("events")
        .select("*")
        .eq("entity_type", "PROPOSAL")
        .eq("type", "AgentProposalCreatedEvent")
        .order("sequence", desc=True)
        .execute()
    )
    return response.data or []


# --- FastAPI HTTP Interface ---

app = FastAPI(title="VW MCP Supabase Server")


@app.get("/kpi/{kpi_name}")
async def kpi_snapshot(kpi_name: str) -> JSONResponse:
    data = get_current_kpi_snapshot(kpi_name)
    return JSONResponse(data)


@app.get("/risks")
async def open_risks() -> JSONResponse:
    data = get_open_risks()
    return JSONResponse(data)


@app.get("/proposals/pending")
async def pending_proposals() -> JSONResponse:
    data = get_pending_proposals()
    return JSONResponse(data)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)

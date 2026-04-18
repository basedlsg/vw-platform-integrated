import os
import uuid
import datetime
from typing import Any

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

_client = create_client(
    os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321"),
    os.environ.get(
        "SUPABASE_SERVICE_ROLE_KEY",
        os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""),
    ),
)


def submit_agent_proposal(
    agent_name: str,
    proposal_details: dict[str, Any],
    status: str = "PENDING",
) -> dict[str, Any]:
    """Insert an AgentProposalCreatedEvent into the events table."""
    proposal_id = proposal_details.get(
        "proposalId", f"PROP_{agent_name.upper()}_{uuid.uuid4().hex[:8]}"
    )

    # Determine next sequence for this entity
    seq_resp = (
        _client.table("events")
        .select("sequence")
        .eq("entity_id", proposal_id)
        .order("sequence", desc=True)
        .limit(1)
        .execute()
    )
    current_seq = seq_resp.data[0]["sequence"] if seq_resp.data else 0
    next_seq = current_seq + 1

    event = {
        "id": str(uuid.uuid4()),
        "entity_id": proposal_id,
        "entity_type": "PROPOSAL",
        "type": "AgentProposalCreatedEvent",
        "sequence": next_seq,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "payload": {
            "proposalId": proposal_id,
            "title": proposal_details.get("title", f"Proposal from {agent_name}"),
            "description": proposal_details.get("description", ""),
            "suggestedAction": proposal_details.get("suggestedAction", "Review required"),
            "proposedStateChange": proposal_details.get("proposedStateChange", {}),
        },
    }

    response = _client.table("events").insert(event).execute()
    if response.data:
        return {
            "success": True,
            "message": f"Proposal {proposal_id} inserted (seq {next_seq}).",
            "id": proposal_id,
        }
    return {"success": False, "message": "Insert failed."}


if __name__ == "__main__":
    result = submit_agent_proposal(
        agent_name="TestAgent",
        proposal_details={
            "title": "Test Proposal",
            "description": "Testing the proposal tool",
            "suggestedAction": "Approve test",
            "proposedStateChange": {},
        },
    )
    print(result)

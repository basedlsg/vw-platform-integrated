import os
import json
from typing import Any

from dotenv import load_dotenv
import google.generativeai as genai

from supabase_mcp_server import (
    get_current_kpi_snapshot,
    get_open_risks,
    get_pending_proposals,
)
from proposal_tool import submit_agent_proposal

load_dotenv()

# Configure Gemini
api_key = os.environ.get("GEMINI_API_KEY", "")
if api_key:
    genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-2.0-flash") if api_key else None


class VWControlTowerAgent:
    """
    Orchestrator agent for the VW Finance Control Tower.
    Monitors pending proposals and evaluates them using Gemini + system context.
    """

    def __init__(self) -> None:
        self.agent_name = "VWControlTowerAgent"
        self.context = self._fetch_initial_context()

    def _fetch_initial_context(self) -> dict[str, Any]:
        context: dict[str, Any] = {}
        try:
            context["kpi_op_margin"] = get_current_kpi_snapshot("KPI_OP_MARGIN")
        except Exception:
            context["kpi_op_margin"] = {"error": "unavailable"}
        try:
            context["open_risks"] = get_open_risks()
        except Exception:
            context["open_risks"] = {"error": "unavailable"}
        return context

    def _get_llm_decision(self, proposal_content: dict[str, Any]) -> str:
        """Use Gemini to evaluate a proposal. Falls back to heuristic if no API key."""
        if model is None:
            # Heuristic fallback when no Gemini API key is configured
            content_str = str(proposal_content)
            if "cost reduction" in content_str.lower() or "margin" in content_str.lower():
                return "APPROVE"
            return "HOLD"

        prompt = f"""You are the VW Finance Control Tower governance agent.
Evaluate this proposal against the current system context and respond with exactly one word: APPROVE, REJECT, or HOLD.

Current context:
- Operating Margin: 2.8% (target 5.5%)
- Cash Conversion: 58% (target >60%)
- BEV Share: 10.2% (target >10%)
- Active Risks: US Tariff Exposure (€2.9B, HIGH), NEV Competition (HIGH)

Proposal:
{json.dumps(proposal_content, indent=2)}

Decision:"""

        try:
            response = model.generate_content(prompt)
            decision = response.text.strip().upper()
            if decision not in ("APPROVE", "REJECT", "HOLD"):
                return "HOLD"
            return decision
        except Exception as e:
            print(f"[{self.agent_name}] Gemini call failed: {e}")
            return "HOLD"

    def process_approval_loop(self) -> None:
        """Execute one cycle of the agentic approval loop."""
        print(f"[{self.agent_name}] Starting Approval Loop Cycle...")

        try:
            pending = get_pending_proposals()
        except Exception as e:
            print(f"[{self.agent_name}] Error fetching proposals: {e}")
            return

        if not pending:
            print(f"[{self.agent_name}] No pending proposals. Cycle complete.")
            return

        print(f"[{self.agent_name}] Found {len(pending)} pending proposal(s).")

        for proposal in pending:
            payload = proposal.get("payload", {})
            proposal_id = payload.get("proposalId", "unknown")
            title = payload.get("title", "untitled")

            print(f"[{self.agent_name}] Evaluating: {proposal_id} — {title}")

            decision = self._get_llm_decision(payload)
            print(f"[{self.agent_name}] Decision: {decision}")

            if decision in ("APPROVE", "REJECT"):
                try:
                    result = submit_agent_proposal(
                        agent_name=self.agent_name,
                        proposal_details={
                            "proposalId": proposal_id,
                            "title": title,
                            "description": payload.get("description", ""),
                            "suggestedAction": payload.get("suggestedAction", ""),
                            "proposedStateChange": payload.get("proposedStateChange", {}),
                        },
                        status=decision,
                    )
                    print(f"[{self.agent_name}] Result: {result.get('message')}")
                except Exception as e:
                    print(f"[{self.agent_name}] Failed to update proposal {proposal_id}: {e}")
            else:
                print(f"[{self.agent_name}] Proposal {proposal_id} held for review.")


def run_approval_agent() -> None:
    print("Initializing VWControlTowerAgent...")
    agent = VWControlTowerAgent()
    agent.process_approval_loop()
    print("VWControlTowerAgent cycle finished.")


if __name__ == "__main__":
    run_approval_agent()

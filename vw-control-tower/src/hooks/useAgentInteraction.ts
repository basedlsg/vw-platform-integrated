import { useCallback, useState } from 'react';

type AgentInteractionStatus = 'idle' | 'loading' | 'success' | 'error';

interface AgentResponse {
  confirmation: string;
  toolUsed: string;
  details: Record<string, unknown>;
}

export function useAgentInteraction() {
  const [status, setStatus] = useState<AgentInteractionStatus>('idle');
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitRequest = useCallback(async (
    agentName: string,
    _interactionType: 'submitProposal',
    payload: { proposal_details: Record<string, unknown>; status: string }
  ) => {
    setStatus('loading');
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/agent/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.proposal_details),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `API error: ${res.status}`);
      }

      const data = (await res.json()) as { success: boolean; sequence: number };
      setResponse({
        toolUsed: 'submit_agent_proposal',
        confirmation: `Proposal submitted by ${agentName}. Sequence: ${data.sequence}`,
        details: data as unknown as Record<string, unknown>,
      });
      setStatus('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setStatus('error');
    }
  }, []);

  const approveProposal = useCallback(async (proposalId: string) => {
    setStatus('loading');
    setError(null);
    setResponse(null);

    try {
      const res = await fetch(`/api/agent/proposals/${proposalId}/approve`, {
        method: 'POST',
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `API error: ${res.status}`);
      }

      const data = (await res.json()) as { success: boolean; proposalId: string; newStatus: string };
      setResponse({
        toolUsed: 'approve_proposal',
        confirmation: `Proposal ${data.proposalId} approved.`,
        details: data as unknown as Record<string, unknown>,
      });
      setStatus('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setStatus('error');
    }
  }, []);

  return {
    status,
    response,
    error,
    submitRequest,
    approveProposal,
  };
}

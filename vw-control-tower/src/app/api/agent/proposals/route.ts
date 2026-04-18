import { NextRequest, NextResponse } from 'next/server';
import { appendEvent, getNextSequence, fetchAllEventsByEntityType } from '@/lib/esaa/event-store';
import { AgentProposalCreatedEventSchema } from '@/lib/esaa/types';
import type { BaseEvent } from '@/lib/esaa/types';
import { materialize } from '@/lib/esaa/materializer';

export async function GET(): Promise<NextResponse> {
  try {
    const events = await fetchAllEventsByEntityType('PROPOSAL');
    const state = materialize(events);
    return NextResponse.json({ proposals: Object.values(state.proposals) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as unknown;
    const parsed = AgentProposalCreatedEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { proposalId, title, description, suggestedAction, proposedStateChange } = parsed.data;
    const sequence = await getNextSequence(proposalId);

    const event: BaseEvent = {
      id: crypto.randomUUID(),
      entityId: proposalId,
      entityType: 'PROPOSAL',
      type: 'AgentProposalCreatedEvent',
      sequence,
      timestamp: new Date().toISOString(),
      payload: { proposalId, title, description, suggestedAction, proposedStateChange },
    };

    const seq = await appendEvent(event);
    return NextResponse.json({ success: true, sequence: seq }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

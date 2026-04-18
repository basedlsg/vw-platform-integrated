import { NextRequest, NextResponse } from 'next/server';
import { appendEvent, getNextSequence } from '@/lib/esaa/event-store';
import type { BaseEvent } from '@/lib/esaa/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  _req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id: proposalId } = await context.params;
    const sequence = await getNextSequence(proposalId);

    const event: BaseEvent = {
      id: crypto.randomUUID(),
      entityId: proposalId,
      entityType: 'PROPOSAL',
      type: 'ProposalStatusChangedEvent',
      sequence,
      timestamp: new Date().toISOString(),
      payload: { proposalId, newStatus: 'APPROVED' },
    };

    await appendEvent(event);
    return NextResponse.json({ success: true, proposalId, newStatus: 'APPROVED' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

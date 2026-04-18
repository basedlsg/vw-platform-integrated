import { NextRequest, NextResponse } from 'next/server';
import { appendEvent, getNextSequence } from '@/lib/esaa/event-store';
import type { BaseEvent } from '@/lib/esaa/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id: proposalId } = await context.params;
    const body = await req.json().catch(() => ({})) as { reviewerNote?: string };
    const sequence = await getNextSequence(proposalId);

    const event: BaseEvent = {
      id: crypto.randomUUID(),
      entityId: proposalId,
      entityType: 'PROPOSAL',
      type: 'ProposalStatusChangedEvent',
      sequence,
      timestamp: new Date().toISOString(),
      payload: {
        proposalId,
        newStatus: 'REJECTED',
        reviewerNote: body.reviewerNote,
      },
    };

    await appendEvent(event);
    return NextResponse.json({ success: true, proposalId, newStatus: 'REJECTED' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

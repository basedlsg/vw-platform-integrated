import { NextRequest, NextResponse } from 'next/server';
import { appendEvent, getNextSequence } from '@/lib/esaa/event-store';
import type { BaseEvent } from '@/lib/esaa/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/agent/proposals/[id]/discuss
 *
 * Body: { direction: 'OUTBOUND'|'INBOUND', participant: string, message: string }
 *
 * Appends a single message to a scenario's discussion thread. The
 * thread is the durable verification record — every back-and-forth
 * gets one event so the Decision Log can replay who said what before
 * the proposal moved up for approval.
 */
export async function POST(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id: proposalId } = await context.params;
    const body = (await req.json().catch(() => ({}))) as {
      direction?: 'OUTBOUND' | 'INBOUND';
      participant?: string;
      message?: string;
    };

    if (!body.direction || !body.participant || !body.message) {
      return NextResponse.json(
        { error: 'Missing required fields: direction, participant, message' },
        { status: 400 }
      );
    }

    const sequence = await getNextSequence(proposalId);
    const event: BaseEvent = {
      id: crypto.randomUUID(),
      entityId: proposalId,
      entityType: 'PROPOSAL',
      type: 'ScenarioVerificationEvent',
      sequence,
      timestamp: new Date().toISOString(),
      payload: {
        proposalId,
        direction: body.direction,
        participant: body.participant,
        message: body.message,
      },
    };
    await appendEvent(event);

    return NextResponse.json({ success: true, eventId: event.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

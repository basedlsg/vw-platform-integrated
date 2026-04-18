import { NextRequest, NextResponse } from 'next/server';
import { appendEvent, getNextSequence } from '@/lib/esaa/event-store';

/**
 * POST /api/kpi/[id]/update
 * Appends a KpiValueUpdatedEvent to the event store.
 * Body: { value: number, reason?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = (await req.json()) as { value: number; reason?: string };

    if (typeof body.value !== 'number' || isNaN(body.value)) {
      return NextResponse.json({ error: 'Invalid value — must be a number' }, { status: 400 });
    }

    const sequence = await getNextSequence(id);

    await appendEvent({
      id: crypto.randomUUID(),
      entityId: id,
      entityType: 'KPI',
      type: 'KpiValueUpdatedEvent',
      sequence,
      timestamp: new Date().toISOString(),
      payload: {
        kpiId: id,
        newValue: body.value,
        reason: body.reason || 'Manual update via Control Tower',
      },
    });

    return NextResponse.json({ success: true, id, newValue: body.value, sequence });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

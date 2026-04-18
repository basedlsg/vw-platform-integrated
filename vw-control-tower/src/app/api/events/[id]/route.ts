import { NextRequest, NextResponse } from 'next/server';
import { fetchAllEventsForEntity } from '@/lib/esaa/event-store';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const events = await fetchAllEventsForEntity(id);

    if (events.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Return the latest event (most recent sequence number)
    const latestEvent = events.sort((a, b) => (b.sequence ?? 0) - (a.sequence ?? 0))[0];

    return NextResponse.json({
      proposedStateChange: latestEvent?.payload as Record<string, unknown>,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

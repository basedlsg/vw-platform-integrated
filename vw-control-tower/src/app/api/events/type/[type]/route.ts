import { NextRequest, NextResponse } from 'next/server';
import { fetchAllEventsByEntityType } from '@/lib/esaa/event-store';

/**
 * GET /api/events/type/[type]
 * Returns all events of a given entity type (KPI, RISK, PROPOSAL).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
): Promise<NextResponse> {
  try {
    const { type } = await params;
    const events = await fetchAllEventsByEntityType(type);
    return NextResponse.json({ events });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

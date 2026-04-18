import { NextRequest, NextResponse } from 'next/server';
import { fetchAllEventsForEntity, fetchAllEventsByEntityType } from '@/lib/esaa/event-store';

/**
 * GET /api/esaa/events
 * Proxy route to fetch events using the service role key (bypassing RLS).
 * Supports ?entityId=... or ?entityType=...
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get('entityId');
    const entityType = searchParams.get('entityType');

    let events;
    if (entityId) {
      events = await fetchAllEventsForEntity(entityId);
    } else if (entityType) {
      events = await fetchAllEventsByEntityType(entityType);
    } else {
      return NextResponse.json({ error: 'Missing entityId or entityType' }, { status: 400 });
    }

    return NextResponse.json(events);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

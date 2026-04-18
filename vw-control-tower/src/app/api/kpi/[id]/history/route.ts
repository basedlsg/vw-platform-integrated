import { NextRequest, NextResponse } from 'next/server';
import { fetchAllEventsForEntity } from '@/lib/esaa/event-store';

/**
 * GET /api/kpi/[id]/history
 * Returns the full history of a KPI as time-series data for charting.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const events = await fetchAllEventsForEntity(id);

    const history = events
      .filter((e) => e.type === 'KpiValueUpdatedEvent')
      .map((e) => {
        const payload = e.payload as { newValue: number; reason?: string; kpiId?: string };
        return {
          date: e.timestamp,
          value: payload.newValue,
          source: payload.reason ?? 'Unknown source',
          sequence: e.sequence,
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({ id, history });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

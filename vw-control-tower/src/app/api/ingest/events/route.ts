import { NextRequest, NextResponse } from 'next/server';
import { appendEvent, getNextSequence } from '@/lib/esaa/event-store';
import { SupportedEventSchema } from '@/lib/esaa/types';
import type { BaseEvent } from '@/lib/esaa/types';
import { z } from 'zod';

const IngestPayloadSchema = z.array(z.object({
  entityId: z.string(),
  entityType: z.enum(['KPI', 'RISK', 'PROPOSAL']),
  type: z.string(),
  timestamp: z.string().optional(),
  payload: z.record(z.string(), z.unknown()),
}));

/**
 * POST /api/ingest/events
 * Accepts an array of events from external ingestion pipelines (Python fetchers, cron jobs).
 * Validates each event, auto-assigns sequence numbers, and appends to the event store.
 *
 * Body: Array of { entityId, entityType, type, timestamp?, payload }
 * Returns: { inserted, skipped, errors }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiKey = req.headers.get('x-ingest-key');
  const expectedKey = process.env.INGEST_API_KEY;
  if (expectedKey && apiKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = IngestPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const results = { inserted: 0, skipped: 0, errors: [] as string[] };

  for (const item of parsed.data) {
    try {
      const sequence = await getNextSequence(item.entityId);
      const event: BaseEvent = {
        id: crypto.randomUUID(),
        entityId: item.entityId,
        entityType: item.entityType,
        type: item.type,
        sequence,
        timestamp: item.timestamp ?? new Date().toISOString(),
        payload: item.payload,
      };

      // Validate the full event before inserting
      const validation = SupportedEventSchema.safeParse(event);
      if (!validation.success) {
        results.errors.push(`${item.entityId}/${item.type}: ${validation.error.message}`);
        results.skipped++;
        continue;
      }

      await appendEvent(event);
      results.inserted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Silently skip duplicate sequence errors (idempotent ingestion)
      if (msg.includes('duplicate') || msg.includes('unique')) {
        results.skipped++;
      } else {
        results.errors.push(`${item.entityId}: ${msg}`);
        results.skipped++;
      }
    }
  }

  return NextResponse.json(results, { status: results.inserted > 0 ? 201 : 200 });
}

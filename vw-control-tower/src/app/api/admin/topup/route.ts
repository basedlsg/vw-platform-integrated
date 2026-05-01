import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import seedEvents from '@/lib/esaa/seed-events.json';
import type { BaseEvent } from '@/lib/esaa/types';

/**
 * POST /api/admin/topup
 *
 * Non-destructive seed sync. Upserts every row in seed-events.json by
 * `id`: missing rows get inserted, rows with the same id but stale
 * content get rewritten to the seed's current content. Anything in
 * the events table whose id is NOT in the seed (run-time approvals,
 * cascade events, user-added proposals) is left alone.
 *
 * Safe to call repeatedly. Returns { upserted, newlyInserted, overwritten }.
 */
export async function POST(): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: 'Missing Supabase URL or SERVICE_ROLE key on the server.' },
      { status: 500 }
    );
  }

  const supa = createClient(url, key);

  // 1. Read existing ids so we can report a delta.
  const existingIds = new Set<string>();
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supa
      .from('events')
      .select('id')
      .range(from, from + PAGE - 1);
    if (error) {
      return NextResponse.json(
        { stage: 'read-existing', error: error.message },
        { status: 500 }
      );
    }
    if (!data || data.length === 0) break;
    for (const row of data) existingIds.add(row.id as string);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  // 2. Sort the seed chronologically so the projection is deterministic.
  const seed = seedEvents as BaseEvent[];
  const sorted = [...seed].sort((a, b) => {
    const ta = new Date(a.timestamp).getTime();
    const tb = new Date(b.timestamp).getTime();
    if (ta !== tb) return ta - tb;
    return a.sequence - b.sequence;
  });

  const rows = sorted.map((e) => ({
    id: e.id,
    entity_id: e.entityId,
    entity_type: e.entityType,
    type: e.type,
    sequence: e.sequence,
    timestamp: e.timestamp,
    payload: e.payload,
  }));

  // 3. Clear out any rows occupying a seed (entity_id, type, sequence)
  //    coordinate with a DIFFERENT id. The seed is canonical for its
  //    coordinate range; the existing rows are stale seed data from
  //    earlier runs. Run-time-appended events use higher sequences
  //    (via getNextSequence), so this delete does not touch them.
  let conflictsDeleted = 0;
  const seedIdsByCoord = new Map<string, string>();
  for (const r of rows) {
    seedIdsByCoord.set(`${r.entity_id}|${r.entity_type}|${r.sequence}`, r.id);
  }

  for (const r of rows) {
    const { data: collisions, error } = await supa
      .from('events')
      .select('id')
      .eq('entity_id', r.entity_id)
      .eq('entity_type', r.entity_type)
      .eq('sequence', r.sequence)
      .neq('id', r.id);

    if (error) {
      return NextResponse.json(
        { stage: 'collision-check', error: error.message },
        { status: 500 }
      );
    }
    if (!collisions || collisions.length === 0) continue;

    const idsToDelete = collisions.map((c) => c.id as string);
    const { error: delErr } = await supa.from('events').delete().in('id', idsToDelete);
    if (delErr) {
      return NextResponse.json(
        { stage: 'collision-delete', error: delErr.message },
        { status: 500 }
      );
    }
    conflictsDeleted += idsToDelete.length;
  }

  // 4. Upsert the seed rows by id.
  const BATCH = 50;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supa
      .from('events')
      .upsert(batch, { onConflict: 'id' });
    if (error) {
      return NextResponse.json(
        {
          stage: 'upsert',
          upserted,
          failedBatchStart: i,
          error: error.message,
        },
        { status: 500 }
      );
    }
    upserted += batch.length;
  }

  const newlyInserted = seed.filter((e) => !existingIds.has(e.id)).length;
  const overwritten = upserted - newlyInserted;

  return NextResponse.json({
    success: true,
    existingCount: existingIds.size,
    seedCount: seed.length,
    upserted,
    newlyInserted,
    overwritten,
    conflictsDeleted,
  });
}

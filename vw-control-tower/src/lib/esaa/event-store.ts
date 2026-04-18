import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  BaseEvent,
  SupportedEventSchema,
} from './types';

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    // Prefer Service Role Key for administrative tasks (like seeding) if available
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      throw new Error('Missing Supabase URL or Key (NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY)');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

/**
 * Returns the next sequence number for a given entity.
 */
export async function getNextSequence(entityId: string): Promise<number> {
  const { data, error } = await getSupabase()
    .from('events')
    .select('sequence')
    .eq('entity_id', entityId)
    .order('sequence', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to get sequence for ${entityId}: ${error.message}`);
  }

  const current = (data?.[0] as { sequence?: number } | undefined)?.sequence ?? 0;
  return current + 1;
}

/**
 * Appends a new event to the event store.
 * Concurrency is enforced by the UNIQUE INDEX on (entity_id, entity_type, sequence).
 */
export async function appendEvent(event: BaseEvent): Promise<number> {
  const validationResult = SupportedEventSchema.safeParse(event);
  if (!validationResult.success) {
    throw new Error(`Event validation failed for ${event.type}: ${validationResult.error.message}`);
  }

  const { error } = await getSupabase().from('events').insert({
    id: event.id,
    entity_id: event.entityId,
    entity_type: event.entityType,
    type: event.type,
    sequence: event.sequence,
    timestamp: event.timestamp,
    payload: event.payload,
  });

  if (error) {
    throw new Error(`Supabase insert failed: ${error.message}`);
  }

  return event.sequence;
}

/**
 * Fetches all events of a given entity type (e.g., all PROPOSALs), ordered by timestamp.
 */
export async function fetchAllEventsByEntityType(entityType: string): Promise<BaseEvent[]> {
  const { data, error } = await getSupabase()
    .from('events')
    .select('*')
    .eq('entity_type', entityType)
    .order('timestamp', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch events for type ${entityType}: ${error.message}`);
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const mapped = rows.map((row) => ({
    id: row.id,
    entityId: row.entity_id,
    entityType: row.entity_type,
    type: row.type,
    sequence: row.sequence,
    timestamp: row.timestamp,
    payload: row.payload,
  }));

  return mapped
    .map((e) => SupportedEventSchema.safeParse(e))
    .filter((r): r is Extract<typeof r, { success: true }> => r.success)
    .map((r) => r.data as unknown as BaseEvent);
}

/**
 * Fetches all events for a specific entity, ordered by sequence.
 */
export async function fetchAllEventsForEntity(entityId: string): Promise<BaseEvent[]> {
  const { data, error } = await getSupabase()
    .from('events')
    .select('*')
    .eq('entity_id', entityId)
    .order('sequence', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch events for ${entityId}: ${error.message}`);
  }

  const rows = (data ?? []) as Record<string, unknown>[];

  // Map DB column names back to BaseEvent field names
  const mapped = rows.map((row) => ({
    id: row.id,
    entityId: row.entity_id,
    entityType: row.entity_type,
    type: row.type,
    sequence: row.sequence,
    timestamp: row.timestamp,
    payload: row.payload,
  }));

  return mapped
    .map((e) => SupportedEventSchema.safeParse(e))
    .filter((r): r is Extract<typeof r, { success: true }> => r.success)
    .map((r) => r.data as unknown as BaseEvent);
}

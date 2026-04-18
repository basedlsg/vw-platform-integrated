import { SupabaseClient } from '@supabase/supabase-js';
import { appendEvent } from '../src/lib/esaa/event-store';
import { BaseEvent } from '../src/lib/esaa/types';
import seedEvents from '../src/lib/esaa/seed-events.json'; // Import the generated seed events

// --- Configuration ---
// Assumes Supabase is running locally and uses default ports/settings if possible.
// Since we cannot guarantee environment variables are set, we use a placeholder Supabase client stub
// as used in event-store.ts for initial testing, but for actual seeding, a real client is needed.
// For this exercise, we will use the stub behavior for appendEvent() to satisfy the dependency,
// but for a real local setup, the user would need to configure this.

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'; // Placeholder URL based on config.toml
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'dummy_anon_key'; // Placeholder Key

// Since event-store.ts uses a stubbed client, we must ensure the `appendEvent` function
// behaves as expected (i.e., it doesn't fail due to missing real DB connection).
// The stub in event-store.ts handles the logging/simulated insertion.

// We will use a dummy client initialization here just to satisfy type checking if needed,
// but rely on the stub behavior in event-store.ts.
const supabase = {} as unknown as SupabaseClient; 

console.log('Starting VW Seed Data process...');

/**
 * Runs the seeding process.
 * 1. Sorts events (though the file should be ordered, this ensures correctness).
 * 2. Iteratively appends each event using the logic from event-store.ts.
 */
async function runSeed() {
  // The seedEvents array is the content of src/lib/esaa/seed-events.json
  const eventsToSeed: BaseEvent[] = seedEvents as BaseEvent[];

  if (eventsToSeed.length === 0) {
    console.log('No seed events found in src/lib/esaa/seed-events.json. Exiting.');
    return;
  }

  console.log(`Found ${eventsToSeed.length} events to seed.`);

  // Ensure events are sorted by timestamp, then sequence for safety, although they should be pre-sorted.
  const sortedEvents = [...eventsToSeed].sort((a, b) => {
    if (a.timestamp < b.timestamp) return -1;
    if (a.timestamp > b.timestamp) return 1;
    return a.sequence - b.sequence;
  });

  let successfulCount = 0;
  let failedCount = 0;

  for (const event of sortedEvents) {
    try {
      // appendEvent handles validation and concurrency check logic internally (stubbed for now)
      const newSequence = await appendEvent(event);
      console.log(`SUCCESS: Appended event ${event.id} (${event.type}) for ${event.entityType}:${event.entityId}. New Sequence: ${newSequence}`);
      successfulCount++;
    } catch (error) {
      console.error(`FAILURE: Failed to append event ${event.id} (${event.type}) for ${event.entityType}:${event.entityId}. Error:`, (error as Error).message);
      failedCount++;
      // Depending on requirements, we might break here, but for seed data, we log and continue if possible.
    }
  }

  console.log('--- Seeding Summary ---');
  console.log(`Total Events Processed: ${eventsToSeed.length}`);
  console.log(`Successfully Seeded: ${successfulCount}`);
  console.log(`Failed to Seed: ${failedCount}`);
  console.log('VW Seed Data process complete.');
}

runSeed().catch(err => {
    console.error('Fatal error during seed execution:', err);
    process.exit(1);
});

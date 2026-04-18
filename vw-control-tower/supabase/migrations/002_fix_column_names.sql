-- Fix column names to match TypeScript ESAA types
ALTER TABLE events RENAME COLUMN aggregate_id TO entity_id;
ALTER TABLE events RENAME COLUMN aggregate_type TO entity_type;
ALTER TABLE events RENAME COLUMN event_type TO type;
ALTER TABLE events RENAME COLUMN version TO sequence;
ALTER TABLE events RENAME COLUMN created_at TO timestamp;

-- Recreate indexes with corrected column names
DROP INDEX IF EXISTS idx_events_entity_version;
DROP INDEX IF EXISTS idx_events_entity_id;
CREATE UNIQUE INDEX idx_events_entity_sequence ON events (entity_id, entity_type, sequence);
CREATE INDEX idx_events_entity_id ON events (entity_id);

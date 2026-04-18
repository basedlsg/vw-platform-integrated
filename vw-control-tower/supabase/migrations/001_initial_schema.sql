-- Table: events (Event Store)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    version INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient event retrieval by entity/version
CREATE UNIQUE INDEX idx_events_entity_version ON events (aggregate_id, aggregate_type, version);
CREATE INDEX idx_events_entity_id ON events (aggregate_id);

-- Table: kpi_snapshots (Materialized View of KPIs)
CREATE TABLE kpi_snapshots (
    kpi_name VARCHAR(255) PRIMARY KEY,
    value NUMERIC NOT NULL,
    target NUMERIC,
    unit VARCHAR(50),
    status VARCHAR(50),
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_event_id UUID REFERENCES events(id)
);

-- Table: risks
CREATE TABLE risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    probability NUMERIC NOT NULL CHECK (probability >= 0 AND probability <= 1),
    impact NUMERIC NOT NULL CHECK (impact >= 0 AND impact <= 1),
    status VARCHAR(50) NOT NULL, -- e.g., 'Open', 'Mitigating', 'Closed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_event_id UUID REFERENCES events(id)
);

CREATE INDEX idx_risks_status ON risks (status);

-- Table: agent_proposals
CREATE TABLE agent_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(255) NOT NULL,
    proposal_jsonb JSONB NOT NULL, -- Contains full proposal details
    status VARCHAR(50) NOT NULL, -- e.g., 'Draft', 'Submitted', 'Accepted', 'Rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_event_id UUID REFERENCES events(id)
);

CREATE INDEX idx_agent_proposals_status ON agent_proposals (status);

-- Function to update 'updated_at' column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER trigger_risks_updated_at
    BEFORE UPDATE ON risks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_agent_proposals_updated_at
    BEFORE UPDATE ON agent_proposals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

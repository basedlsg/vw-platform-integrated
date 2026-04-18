-- VW Finance Control Tower seed data
INSERT INTO events (id, entity_id, entity_type, type, sequence, timestamp, payload)
VALUES
  -- KPI: Operating Margin (2.8% actual Q3, 3.1% Q4 partial recovery, target 5.5%)
  ('a0000001-0000-4000-9000-000000000001', 'KPI_OP_MARGIN', 'KPI', 'KpiValueUpdatedEvent', 1,
   '2024-10-01T08:00:00Z',
   '{"kpiId":"KPI_OP_MARGIN","newValue":2.8,"reason":"Q3 2024 actual operating margin"}'::jsonb),

  ('a0000001-0000-4000-9000-000000000002', 'KPI_OP_MARGIN', 'KPI', 'KpiValueUpdatedEvent', 2,
   '2024-12-01T08:00:00Z',
   '{"kpiId":"KPI_OP_MARGIN","newValue":3.1,"reason":"Q4 2024 partial recovery"}'::jsonb),

  -- KPI: Cash Conversion (58% actual, target >60%)
  ('a0000002-0000-4000-9000-000000000001', 'KPI_CASH_CONV', 'KPI', 'KpiValueUpdatedEvent', 1,
   '2024-10-01T08:00:00Z',
   '{"kpiId":"KPI_CASH_CONV","newValue":58.0,"reason":"Q3 2024 cash conversion rate"}'::jsonb),

  -- KPI: BEV Delivery Share (10.2%, target >10%)
  ('a0000003-0000-4000-9000-000000000001', 'KPI_BEV_SHARE', 'KPI', 'KpiValueUpdatedEvent', 1,
   '2024-10-01T08:00:00Z',
   '{"kpiId":"KPI_BEV_SHARE","newValue":10.2,"reason":"FY2024 BEV delivery share"}'::jsonb),

  -- RISK: US Tariff Exposure (€2.9B projected burden, HIGH impact)
  ('b0000001-0000-4000-9000-000000000001', 'RISK_TARIFF_001', 'RISK', 'RiskThresholdSetEvent', 1,
   '2024-10-15T10:30:00Z',
   '{"riskId":"RISK_TARIFF_001","newThreshold":2.9,"impactLevel":"HIGH"}'::jsonb),

  -- RISK: NEV Competition Pressure (BYD/XPENG/NIO market share 35%, HIGH impact)
  ('b0000002-0000-4000-9000-000000000001', 'RISK_NEV_001', 'RISK', 'RiskThresholdSetEvent', 1,
   '2024-10-15T10:30:00Z',
   '{"riskId":"RISK_NEV_001","newThreshold":35.0,"impactLevel":"HIGH"}'::jsonb),

  -- PROPOSAL: Margin Recovery via Cost Reduction
  ('c0000001-0000-4000-9000-000000000001', 'PROP_MARGIN_REC_001', 'PROPOSAL', 'AgentProposalCreatedEvent', 1,
   '2024-11-10T14:00:00Z',
   '{"proposalId":"PROP_MARGIN_REC_001","title":"Margin Recovery via Cost Reduction","description":"Proposed €1.2B fixed-cost reduction targeting 5.5% operating margin by FY2025.","suggestedAction":"Approve OPEX reduction program #2024-Q4-MARGIN","proposedStateChange":{"kpis":{"KPI_OP_MARGIN":{"target":5.5}}}}'::jsonb);

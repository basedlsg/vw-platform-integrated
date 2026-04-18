// ─── Driver Status ────────────────────────────────────────────────────────────
export type DriverStatus = 'Green' | 'Amber' | 'Red';
export type ProgramStatus = 'Green' | 'Amber' | 'Red';

// ─── New Domain Events ────────────────────────────────────────────────────────

export interface SupplierCostDriftEvent {
  eventId: string;
  timestamp: string;
  type: 'SupplierCostDriftEvent';
  supplierId: string;
  supplierNameEn: string;
  supplierNameZh: string;
  componentCategory: 'Battery' | 'CEA' | 'ADAS_SoC' | 'Local_Modules';
  oldCostIndex: number;
  newCostIndex: number;
  costDeltaPct: number;      // positive = cost increase (bad), negative = reduction (good)
  reasonCode: string;        // e.g. 'raw-material-inflation', 'volume-discount-claw-back'
  reasonEn: string;
  reasonZh: string;
  effectiveDate: string;
  program: string;
  contractRef?: string;
  inputLanguage: 'EN' | 'ZH';
}

export interface CompetitorPricingEvent {
  eventId: string;
  timestamp: string;
  type: 'CompetitorPricingEvent';
  competitor: string;
  competitorNameEn: string;
  competitorNameZh: string;
  model: string;
  modelNameEn: string;
  modelNameZh: string;
  priceChangePct: number;    // negative = price cut (bad for VW incentives)
  affectedVwModels: string[];
  estimatedIncentiveImplicationPct: number;  // how much this forces VW incentive increase
  effectiveDate: string;
  source: string;
  sourceZh?: string;
}

export interface NevIncentiveUpdatedEvent {
  eventId: string;
  timestamp: string;
  type: 'NevIncentiveUpdatedEvent';
  model: string;
  modelNameEn: string;
  modelNameZh: string;
  oldIncentiveLevelPct: number;
  newIncentiveLevelPct: number;
  reasonCode: string;
  reasonEn: string;
  reasonZh: string;
  effectiveDate: string;
  approvedBy: string;
  notes?: string;
}

export interface ProgramMilestoneEvent {
  eventId: string;
  timestamp: string;
  type: 'ProgramMilestoneEvent';
  program: string;
  milestone: string;
  milestoneNameEn: string;
  milestoneNameZh: string;
  scheduledDate: string;
  actualDate: string | null;
  slipDays: number;          // 0 = on time, positive = delayed
  estimatedCostImpactPct: number;  // cost increase from delay
  status: 'On_Track' | 'At_Risk' | 'Delayed' | 'Complete';
}

export type ChinaCmpEvent =
  | SupplierCostDriftEvent
  | CompetitorPricingEvent
  | NevIncentiveUpdatedEvent
  | ProgramMilestoneEvent;

// ─── Cost Driver Breakdown ────────────────────────────────────────────────────

export interface CostDriver {
  achieved: number;    // negative = cost reduction achieved (e.g. -8)
  needed: number;      // negative = reduction needed (e.g. -12)
  status: DriverStatus;
  recentEvents: ChinaCmpEvent[];
}

export interface CostDriverBreakdown {
  battery: CostDriver;
  cea: CostDriver;
  adas_soc: CostDriver;
  localModules: CostDriver;
  incentiveHeadwind: number;  // positive = headwind cost (e.g. +3)
  timingHeadwind: number;     // positive = headwind cost (e.g. +2)
}

// ─── Recommended Action ───────────────────────────────────────────────────────

export interface RecommendedAction {
  actionId: string;
  titleEn: string;
  titleZh: string;
  descriptionEn: string;
  descriptionZh: string;
  impactPct: number;          // percentage points of gap this closes
  impactEurM: number;         // EUR impact in millions (impactPct * ~20M)
  leadTimeWeeks: number;
  feasibilityScore: number;   // 1-5 (5 = easiest)
  riskScore: number;          // 1-5 (5 = riskiest)
  dependencies: string[];
  dependenciesZh: string[];
  riskFlags: string[];
  riskFlagsZh: string[];
  marginAtRiskIfSkipped: number;
  status: 'pending' | 'approved' | 'deferred' | 'rejected';
}

// ─── 90-Day Countdown Milestones ─────────────────────────────────────────────

export interface CountdownMilestone {
  id: string;
  titleEn: string;
  titleZh: string;
  targetDate: string;
  impactPct: number;       // pp this unlocks if hit
  impactEurM: number;
  status: 'on_track' | 'at_risk' | 'overdue' | 'complete';
  ownerEn: string;
  ownerZh: string;
  driverKey: 'battery' | 'cea' | 'adas_soc' | 'localModules';
}

// ─── Program Snapshot (materialized read model) ───────────────────────────────

export interface ChinaCmpProgramSnapshot {
  program: string;
  programNameEn: string;
  programNameZh: string;
  targetCostReductionPct: number;   // always 40
  currentCostReductionPct: number;  // e.g. 28
  gapPct: number;                   // target - current
  gapEurM: number;                  // EUR gap (gapPct * ~20M)
  status: ProgramStatus;
  varianceLast30Days: number;       // positive = improving, negative = deteriorating
  costDriverBreakdown: CostDriverBreakdown;
  recentEvents: ChinaCmpEvent[];
  recommendedActions: RecommendedAction[];
  marginAtRisk90Days: number;
  marginAtRiskEurM: number;         // EUR margin risk
  countdownMilestones: CountdownMilestone[];
  sopDate: string;                  // Start of Production target date
  biggestLeverEn: string;           // single biggest lever description
  biggestLeverZh: string;
  lastUpdated: string;
}

// ─── Chat Types ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  context?: string;  // element context if user selected something
}

// ─── Active Tab ──────────────────────────────────────────────────────────────

export type CmpTab = 'programs' | 'global' | 'drivers';

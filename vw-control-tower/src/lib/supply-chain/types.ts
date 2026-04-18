// ─── Supplier Status ──────────────────────────────────────────────────────────
export type SRating = 'A' | 'B' | 'C' | 'D' | 'Not Assessed';
export type AwardStatus = 'Award Ready' | 'Conditional' | 'Not Ready' | 'Blocked';
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type CorrecctiveActionStatus = 'Open' | 'In Progress' | 'Closed' | 'Overdue';
export type SupplierTier = 'Tier 1' | 'Tier 2' | 'Upstream';
export type SupplyChainTab = 'overview' | 'traceability' | 'sustainability' | 'risk' | 'actions';

// ─── Events ───────────────────────────────────────────────────────────────────
export interface SupplierSustainabilityRatingUpdatedEvent {
  eventId: string;
  timestamp: string;
  type: 'SupplierSustainabilityRatingUpdatedEvent';
  supplierId: string;
  oldRating: SRating;
  newRating: SRating;
  assessedBy: string;
  notes: string;
}

export interface SupplierCertificationUpdatedEvent {
  eventId: string;
  timestamp: string;
  type: 'SupplierCertificationUpdatedEvent';
  supplierId: string;
  certificationName: string;
  status: 'Achieved' | 'Expired' | 'In Progress' | 'Rejected';
  validUntil?: string;
}

export interface SupplierEmissionReportedEvent {
  eventId: string;
  timestamp: string;
  type: 'SupplierEmissionReportedEvent';
  supplierId: string;
  quarter: string;
  scope1tCO2e: number;
  scope2tCO2e: number;
  scope3tCO2e?: number;
  reportedBy: string;
}

export interface BatteryTraceabilityUpdatedEvent {
  eventId: string;
  timestamp: string;
  type: 'BatteryTraceabilityUpdatedEvent';
  supplierId: string;
  fieldUpdated: string;
  oldCompleteness: number;
  newCompleteness: number;
  notes: string;
}

export interface SupplierRiskDetectedEvent {
  eventId: string;
  timestamp: string;
  type: 'SupplierRiskDetectedEvent';
  supplierId: string;
  riskCategory: 'Human Rights' | 'Environmental' | 'Geopolitical' | 'Single Source' | 'Financial';
  riskLevel: RiskLevel;
  descriptionEn: string;
  descriptionZh: string;
  detectedBy: string;
}

export interface CorrectiveActionInitiatedEvent {
  eventId: string;
  timestamp: string;
  type: 'CorrectiveActionInitiatedEvent';
  supplierId: string;
  actionId: string;
  titleEn: string;
  titleZh: string;
  dueDate: string;
  ownerEn: string;
  ownerZh: string;
}

export interface CorrectiveActionClosedEvent {
  eventId: string;
  timestamp: string;
  type: 'CorrectiveActionClosedEvent';
  supplierId: string;
  actionId: string;
  resolution: string;
}

export type SupplyChainEvent =
  | SupplierSustainabilityRatingUpdatedEvent
  | SupplierCertificationUpdatedEvent
  | SupplierEmissionReportedEvent
  | BatteryTraceabilityUpdatedEvent
  | SupplierRiskDetectedEvent
  | CorrectiveActionInitiatedEvent
  | CorrectiveActionClosedEvent;

// ─── Certification ────────────────────────────────────────────────────────────
export interface Certification {
  name: string;
  status: 'Active' | 'Expired' | 'In Progress' | 'Missing';
  validUntil?: string;
}

// ─── Battery Passport Field ───────────────────────────────────────────────────
export interface BatteryPassportField {
  fieldNameEn: string;
  fieldNameZh: string;
  status: 'Complete' | 'Incomplete' | 'Missing' | 'N/A';
  owner?: string;
  notes?: string;
}

// ─── Battery Passport ─────────────────────────────────────────────────────────
export interface BatteryPassport {
  completenessPercent: number;
  requiredFields: BatteryPassportField[];
  cellSupplier: string;
  packSupplier: string;
  chemistry: string;
  plantCountry: string;
  upstreamCoveragePercent: number;
  carbonFootprintComplete: boolean;
  recycledContentEvidenced: boolean;
  euPassportReady: boolean;
}

// ─── Active Risk ──────────────────────────────────────────────────────────────
export interface SupplierRisk {
  id: string;
  category: 'Human Rights' | 'Environmental' | 'Geopolitical' | 'Single Source' | 'Financial';
  level: RiskLevel;
  titleEn: string;
  titleZh: string;
  descriptionEn: string;
  descriptionZh: string;
  detectedDate: string;
  programs: string[];
}

// ─── Corrective Action ────────────────────────────────────────────────────────
export interface CorrectiveAction {
  actionId: string;
  titleEn: string;
  titleZh: string;
  descriptionEn: string;
  descriptionZh: string;
  status: CorrecctiveActionStatus;
  dueDate: string;
  ownerEn: string;
  ownerZh: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  blocksAward: boolean;
}

// ─── Recommended Action (Gemini output) ──────────────────────────────────────
export interface SCRecommendedAction {
  actionId: string;
  titleEn: string;
  titleZh: string;
  issueEn: string;
  issueZh: string;
  whyMattersEn: string;
  whyMattersZh: string;
  nextActionEn: string;
  nextActionZh: string;
  priority: 'Critical' | 'High' | 'Medium';
  supplierId: string;
  blocksAward: boolean;
  daysToResolve: number;
  status: 'pending' | 'approved' | 'deferred';
}

// ─── Supplier Snapshot ────────────────────────────────────────────────────────
export interface SupplierSnapshot {
  supplierId: string;
  nameEn: string;
  nameZh: string;
  tier: SupplierTier;
  country: string;
  countryZh: string;
  component: string;
  componentZh: string;
  programs: string[];
  sRating: SRating;
  awardStatus: AwardStatus;
  certifications: Certification[];
  latestEmissionQ: string;
  latestScope1: number;
  latestScope2: number;
  emissionTrend: 'Improving' | 'Stable' | 'Worsening' | 'Not Reported';
  batteryPassport?: BatteryPassport;
  activeRisks: SupplierRisk[];
  correctiveActions: CorrectiveAction[];
  recentEvents: SupplyChainEvent[];
  lastUpdated: string;
}

// ─── Portfolio Snapshot (materialized store) ──────────────────────────────────
export interface SupplyChainSnapshot {
  suppliers: SupplierSnapshot[];
  selectedSupplierId: string;
  activeTab: SupplyChainTab;
  recommendedActions: SCRecommendedAction[];
  actionsLoading: boolean;
  actionsError: string | null;
}

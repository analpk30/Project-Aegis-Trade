import { z } from 'zod';

export type PersonaRole =
  | 'Trader'
  | 'Salesperson'
  | 'Desk Head'
  | 'Compliance (1st Line)'
  | 'Central Compliance'
  | 'Risk Officer'
  | 'IT/Ops'
  | 'Auditor'
  | 'Wealth/Relationship Manager'
  | 'Executive';

export interface PersonaInfo {
  role: PersonaRole;
  name: string;
  defaultRoute: string;
  allowedRoutes: string[];
  description: string;
  avatar: string;
}

export type AssetClass = 'FX' | 'Rates' | 'Credit' | 'Equities' | 'Commodities';

export type OrderStatus =
  | 'Pending'
  | 'Approved'
  | 'Review Required'
  | 'Blocked'
  | 'Executed';

export interface GuardianScoreBreakdown {
  executabilityScore: number; // 0 - 100
  violationRiskScore: number; // 0 - 100
  consentScore: number; // 0 - 100
  regulatoryCapitalImpact: number; // 0 - 100
}

export interface PreCrimeMatch {
  caseId: string;
  caseName: string;
  caseYear: number;
  regulator: string;
  similarityScore: number; // Computed vector cosine similarity (e.g., 0.874)
  category: string;
  matchedPattern: string;
  recommendedAction: string;
  fineAmount: string;
}

export interface Order {
  id: string;
  traderId: string;
  traderName: string;
  clientId: string;
  clientName: string;
  instrument: string;
  assetClass: AssetClass;
  sizeEur: number;
  direction: 'BUY' | 'SELL';
  venue: string;
  status: OrderStatus;
  guardianScore: number; // 0 - 100
  scoreBreakdown: GuardianScoreBreakdown;
  mifidJustification?: string;
  precrimeMatch?: PreCrimeMatch | null;
  workflowStep?: 'DRAFT' | 'PRE_CRIME_CHECK' | 'COMPLIANCE_REVIEW' | 'DESK_HEAD_SIGN_OFF' | 'APPROVED';
  createdAt: string;
  updatedAt: string;
}

export interface ClientPassport {
  id: string;
  name: string;
  entityType: 'Institutional' | 'Corporate' | 'HNW' | 'Sovereign';
  kycStatus: 'VERIFIED' | 'EXPIRED' | 'PENDING';
  amlRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suitabilityCategory: 'RETAIL' | 'PROFESSIONAL' | 'ELIGIBLE_COUNTERPARTY';
  divisionClearance: {
    investmentBanking: boolean;
    wealthManagement: boolean;
    corporateTreasury: boolean;
  };
  gdprConsentMap: Record<string, boolean>;
  versionHistory: Array<{
    version: string;
    timestamp: string;
    modifiedBy: string;
    changes: string;
  }>;
}

export interface FineCase {
  id: string;
  caseName: string;
  caseYear: number;
  category: string;
  regulator: string;
  fineAmount: string;
  description: string;
  keyPattern: string;
  mitigationStrategy: string;
  vector: number[];
}

export interface BaFinAnnouncement {
  id: string;
  title: string;
  date: string;
  category: string;
  assetClasses: AssetClass[];
  summary: string;
  text: string;
  dos: string[];
  donts: string[];
}

export interface GuardianIdea {
  id: string;
  title: string;
  assetClass: AssetClass;
  clientName: string;
  clientId: string;
  expectedAlphaBps: number;
  riskAdjustedReturn: number;
  prescreenedPassed: boolean;
  justification: string;
  orderDraft: {
    instrument: string;
    direction: 'BUY' | 'SELL';
    sizeEur: number;
    venue: string;
  };
}

export interface MarketAnomaly {
  id: string;
  timestamp: string;
  assetClass: AssetClass;
  metric: string;
  deviationSigma: number;
  affectedClients: string[];
  alertLevel: 'GREEN' | 'AMBER' | 'RED';
  description: string;
  recommendedAction: string;
  // Optional quant fields from the live cross-market anomaly engine.
  mahalanobisDistance?: number;
  contributingMarkets?: string[];
  contagionProbability?: number;
  forecastHorizonMins?: number;
  exposedNotionalEur?: number;
  sigmaHistory?: number[];
  contagionHistory?: number[];
}

export interface HedgeOption {
  id: string;
  positionId: string;
  positionName: string;
  assetClass: AssetClass;
  hedgeInstrument: string;
  hedgeCostBps: number;
  regCapitalImpactPct: number;
  combinedEfficiencyScore: number;
  recommendationRationale: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  module: string;
  persona: PersonaRole;
  user: string;
  action: string;
  reasoningPayload: string;
  guardianScoreAtTime: number;
  modelUsed: string;
  latencyMs: number;
  fallbackUsed: boolean;
}

export interface WorkflowState {
  id: string;
  orderId: string;
  currentStep: 'DRAFT' | 'PRE_CRIME_CHECK' | 'COMPLIANCE_REVIEW' | 'DESK_HEAD_SIGN_OFF' | 'APPROVED';
  approvers: Array<{
    role: PersonaRole;
    name: string;
    signedOff: boolean;
    timestamp?: string;
    comment?: string;
  }>;
  evidenceRecords: string[];
}

export interface ExecutiveMetrics {
  hoursSavedTotal: number;
  approvalTimeReductionPct: number;
  finesAvoidedEur: number;
  roiPercentage: number;
  monthlyTrends: Array<{
    month: string;
    hoursSaved: number;
    riskScoreAvg: number;
    orderVolume: number;
  }>;
}

// Zod schemas for API payload validation
export const PersonaSwitchSchema = z.object({
  role: z.enum([
    'Trader',
    'Salesperson',
    'Desk Head',
    'Compliance (1st Line)',
    'Central Compliance',
    'Risk Officer',
    'IT/Ops',
    'Auditor',
    'Wealth/Relationship Manager',
    'Executive',
  ]),
});

export const AutopilotRequestSchema = z.object({
  orderId: z.string().min(1),
  userComment: z.string().optional(),
});

export const ApproveOrderSchema = z.object({
  orderId: z.string().min(1),
  comment: z.string().optional(),
});

export const PrecrimeScoreRequestSchema = z.object({
  instrument: z.string(),
  assetClass: z.string(),
  sizeEur: z.number(),
  clientId: z.string(),
  commsText: z.string().optional(),
});

export const BafinInterpretRequestSchema = z.object({
  query: z.string().min(1),
  assetClass: z.string().optional(),
});

export const SendToBlotterSchema = z.object({
  ideaId: z.string().min(1),
  traderId: z.string().default('TRD-8821'),
  traderName: z.string().default('Alex Vance'),
});

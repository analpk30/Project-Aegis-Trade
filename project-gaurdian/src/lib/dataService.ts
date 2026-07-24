import { globalStore } from '../backend/dataStore';
import {
  AuditEntry,
  BaFinAnnouncement,
  ClientPassport,
  ExecutiveMetrics,
  GuardianIdea,
  HedgeOption,
  MarketAnomaly,
  Order,
  PersonaRole,
} from '../types';

export interface PersonaConfig {
  name: string;
  defaultRoute: string;
  allowedRoutes: string[];
  description: string;
}

export const PERSONA_CONFIG_MAP: Record<PersonaRole, PersonaConfig> = {
  'Trader': {
    name: 'Alex Vance',
    defaultRoute: '/trade',
    allowedRoutes: ['/home', '/trade', '/clients', '/ideas', '/audit'],
    description: 'Front-office execution & algorithmic order blotter',
  },
  'Salesperson': {
    name: 'Sarah Wagner',
    defaultRoute: '/clients',
    allowedRoutes: ['/home', '/clients', '/ideas', '/trade', '/audit'],
    description: 'Client coverage, suitability passports & trade ideas',
  },
  'Desk Head': {
    name: 'Marcus Sterling',
    defaultRoute: '/home',
    allowedRoutes: ['/home', '/trade', '/clients', '/ideas', '/bafin', '/risk', '/audit'],
    description: 'Desk oversight, sign-offs & aggregated blotter',
  },
  'Compliance (1st Line)': {
    name: 'Klaus Meier',
    defaultRoute: '/audit',
    allowedRoutes: ['/home', '/trade', '/clients', '/bafin', '/risk', '/audit'],
    description: 'Pre-Crime interrupts, trade exceptions & 1st line review',
  },
  'Central Compliance': {
    name: 'Dr. Hannah Weber',
    defaultRoute: '/bafin',
    allowedRoutes: ['/home', '/bafin', '/audit', '/clients', '/risk'],
    description: 'BaFin rulebook interpretation, RAG & regulatory policy',
  },
  'Risk Officer': {
    name: 'David Chen',
    defaultRoute: '/risk',
    allowedRoutes: ['/home', '/risk', '/trade', '/audit'],
    description: 'Cross-market anomaly detection & capital hedging',
  },
  'IT/Ops': {
    name: 'Michael Schmidt',
    defaultRoute: '/clients',
    allowedRoutes: ['/home', '/clients', '/audit', '/trade'],
    description: 'Reconciliation, data integrity & system health',
  },
  'Auditor': {
    name: 'Evelyn Reed (External)',
    defaultRoute: '/audit',
    allowedRoutes: ['/home', '/audit', '/bafin', '/clients', '/trade', '/risk', '/executive'],
    description: 'Full immutable XAI audit trail inspection & PDF export',
  },
  'Wealth/Relationship Manager': {
    name: 'Julia Hoffmann',
    defaultRoute: '/clients',
    allowedRoutes: ['/home', '/clients', '/ideas', '/audit'],
    description: 'HNW Client passports, GDPR consent & wealth ideas',
  },
  'Executive': {
    name: 'Christian Lindner (Board)',
    defaultRoute: '/executive',
    allowedRoutes: ['/home', '/executive', '/trade', '/clients', '/ideas', '/bafin', '/risk', '/audit'],
    description: 'Executive ROI KPIs, hours saved & regulatory impact',
  },
};

export async function fetchOrders(): Promise<Order[]> {
  try {
    const res = await fetch('/api/orders');
    if (res.ok) {
      const data = await res.json();
      if (data.orders && data.orders.length > 0) return data.orders;
    }
  } catch (e) {
    console.warn('[DataService] API offline or unavailable, using local store for orders');
  }
  return globalStore.orders;
}

export async function fetchClients(): Promise<ClientPassport[]> {
  try {
    const res = await fetch('/api/clients');
    if (res.ok) {
      const data = await res.json();
      if (data.clients && data.clients.length > 0) return data.clients;
    }
  } catch (e) {
    console.warn('[DataService] API offline or unavailable, using local store for clients');
  }
  return globalStore.clients;
}

export async function fetchIdeas(): Promise<GuardianIdea[]> {
  try {
    const res = await fetch('/api/ideas');
    if (res.ok) {
      const data = await res.json();
      if (data.ideas && data.ideas.length > 0) return data.ideas;
    }
  } catch (e) {
    console.warn('[DataService] API offline or unavailable, using local store for ideas');
  }
  return globalStore.ideas;
}

export async function generateAIIdeasFromHistory(): Promise<{ ideas: GuardianIdea[]; modelUsed: string; fallbackUsed: boolean; latencyMs: number }> {
  try {
    const res = await fetch('/api/ideas/generate', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      return {
        ideas: data.ideas || [],
        modelUsed: data.modelUsed || 'Primary AI Engine',
        fallbackUsed: Boolean(data.fallbackUsed),
        latencyMs: data.latencyMs || 120
      };
    }
  } catch (e) {
    console.warn('[DataService] API offline, cannot trigger live AI generation');
  }
  return {
    ideas: globalStore.ideas,
    modelUsed: 'Local Fallback Engine',
    fallbackUsed: true,
    latencyMs: 15
  };
}

export async function fetchBafinAnnouncements(): Promise<BaFinAnnouncement[]> {
  try {
    const res = await fetch('/api/bafin');
    if (res.ok) {
      const data = await res.json();
      if (data.announcements && data.announcements.length > 0) return data.announcements;
    }
  } catch (e) {
    console.warn('[DataService] API offline or unavailable, using local store for bafin');
  }
  return globalStore.bafinAnnouncements;
}

export async function fetchAnomalies(): Promise<MarketAnomaly[]> {
  try {
    const res = await fetch('/api/risk/anomalies');
    if (res.ok) {
      const data = await res.json();
      if (data.anomalies && data.anomalies.length > 0) return data.anomalies;
    }
  } catch (e) {
    console.warn('[DataService] API offline or unavailable, using local store for anomalies');
  }
  return globalStore.anomalies;
}

export async function fetchHedges(): Promise<HedgeOption[]> {
  try {
    const res = await fetch('/api/risk/hedges/POS-RATES-50M');
    if (res.ok) {
      const data = await res.json();
      if (data.hedges && data.hedges.length > 0) return data.hedges;
    }
  } catch (e) {
    console.warn('[DataService] API offline or unavailable, using local store for hedges');
  }
  return globalStore.hedges;
}

export async function fetchExecutiveMetrics(): Promise<ExecutiveMetrics> {
  try {
    const res = await fetch('/api/executive/kpis');
    if (res.ok) {
      const data = await res.json();
      if (data.metrics) return data.metrics;
    }
  } catch (e) {
    console.warn('[DataService] API offline or unavailable, using local store for executive metrics');
  }
  return globalStore.executiveMetrics;
}

export async function fetchEngineStatus(): Promise<any> {
  try {
    const res = await fetch('/api/engine/status');
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('[DataService] API offline, returning mock dual-engine status');
  }
  return {
    mode: 'auto',
    primaryEngine: {
      name: 'Gemini 2.5 Flash / 1.5 Pro AI',
      status: 'ONLINE',
      apiKeyConfigured: true,
      avgLatencyMs: 320,
    },
    fallbackEngine: {
      name: 'Local Statistical & Vector Model (Cosine Distance + Rule Matrix)',
      status: 'READY_STANDBY',
      avgLatencyMs: 12,
      confidenceScore: 0.984,
      algorithm: 'Cosine Vector Similarity + BaFin Decision Tree'
    },
    telemetry: {
      totalRequests: 42,
      geminiSuccesses: 38,
      fallbackTriggers: 4,
      lastLatencyMs: 14
    }
  };
}

export async function setEngineMode(mode: 'auto' | 'force_fallback'): Promise<any> {
  try {
    const res = await fetch('/api/engine/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('[DataService] API offline for setEngineMode');
  }
  return { success: true };
}

export async function runEngineBenchmark(orderId?: string): Promise<any> {
  try {
    const res = await fetch('/api/engine/benchmark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('[DataService] API offline for benchmark');
  }
  return null;
}

const DEFAULT_TRADE_HISTORY = [
  {
    tradeId: 'HIST-2026-901',
    timestamp: '2026-07-22T14:15:22Z',
    clientId: 'CL-DE-9081',
    clientName: 'Allianz Global Investors SE',
    instrument: 'Siemens 2.875% 2036 Asset Swap',
    assetClass: 'Rates',
    sizeEur: 15000000,
    direction: 'BUY',
    venue: 'Eurex MTF',
    executedPrice: 99.42,
    benchmarkPrice: 99.45,
    slippageBps: -1.2,
    executionLatencyMs: 12,
    guardianScoreAtTime: 96,
    precrimeSimilarity: 0.08,
    status: 'EXECUTED',
    traderId: 'TRD-8821',
    traderName: 'Alex Vance',
    complianceNote: 'Cleared green-gate automated routing under MiFID II Art. 27.'
  },
  {
    tradeId: 'HIST-2026-902',
    timestamp: '2026-07-21T11:05:10Z',
    clientId: 'CL-DE-4412',
    clientName: 'Siemens Corporate Treasury GmbH',
    instrument: 'EUR/USD Forward 3M',
    assetClass: 'FX',
    sizeEur: 20000000,
    direction: 'SELL',
    venue: '360T MTF',
    executedPrice: 1.0885,
    benchmarkPrice: 1.0886,
    slippageBps: -0.8,
    executionLatencyMs: 15,
    guardianScoreAtTime: 94,
    precrimeSimilarity: 0.05,
    status: 'EXECUTED',
    traderId: 'TRD-8821',
    traderName: 'Alex Vance',
    complianceNote: 'Standard corporate hedging flow. Suitability and GDPR consent verified.'
  },
  {
    tradeId: 'HIST-2026-903',
    timestamp: '2026-07-20T16:30:45Z',
    clientId: 'CL-LU-7719',
    clientName: 'BlackForest Alpha Hedge Fund LP',
    instrument: 'iTraxx Europe Crossover 5Y CDS',
    assetClass: 'Credit',
    sizeEur: 30000000,
    direction: 'BUY',
    venue: 'Tradeweb',
    executedPrice: 312.5,
    benchmarkPrice: 314.0,
    slippageBps: -2.1,
    executionLatencyMs: 18,
    guardianScoreAtTime: 88,
    precrimeSimilarity: 0.14,
    status: 'EXECUTED',
    traderId: 'TRD-9904',
    traderName: 'Elena Rostova',
    complianceNote: 'Pre-screened against high-yield credit mandate.'
  },
  {
    tradeId: 'HIST-2026-904',
    timestamp: '2026-07-19T09:45:12Z',
    clientId: 'CL-IT-3301',
    clientName: 'Banca Monte Subprime SPV',
    instrument: '10Y Italian BTP Sovereign Swap',
    assetClass: 'Rates',
    sizeEur: 50000000,
    direction: 'BUY',
    venue: 'Eurex MTF',
    executedPrice: 3.85,
    benchmarkPrice: 3.70,
    slippageBps: +15.0,
    executionLatencyMs: 1420,
    guardianScoreAtTime: 24,
    precrimeSimilarity: 0.88,
    status: 'REJECTED',
    traderId: 'TRD-8821',
    traderName: 'Alex Vance',
    complianceNote: 'BLOCKED & ESCALATED: PENDING KYC status and match with LIBOR/BTP manipulation vector.'
  },
  {
    tradeId: 'HIST-2026-905',
    timestamp: '2026-07-18T15:20:00Z',
    clientId: 'CL-CH-1092',
    clientName: 'Helvetia Family Office Group',
    instrument: 'Nestlé SA Equity Note',
    assetClass: 'Equities',
    sizeEur: 8500000,
    direction: 'BUY',
    venue: 'Internal OTC',
    executedPrice: 98.50,
    benchmarkPrice: 98.20,
    slippageBps: +3.1,
    executionLatencyMs: 850,
    guardianScoreAtTime: 42,
    precrimeSimilarity: 0.62,
    status: 'HELD_COMPLIANCE',
    traderId: 'TRD-1022',
    traderName: 'Lukas Meyer',
    complianceNote: '1st Line Hold: EXPIRED KYC profile requires renewal before execution.'
  },
  {
    tradeId: 'HIST-2026-906',
    timestamp: '2026-07-17T10:12:00Z',
    clientId: 'CL-DE-9081',
    clientName: 'Allianz Global Investors SE',
    instrument: 'Bund 10Y Future Short Overlay',
    assetClass: 'Rates',
    sizeEur: 25000000,
    direction: 'SELL',
    venue: 'Eurex MTF',
    executedPrice: 132.10,
    benchmarkPrice: 132.12,
    slippageBps: -0.5,
    executionLatencyMs: 11,
    guardianScoreAtTime: 98,
    precrimeSimilarity: 0.04,
    status: 'EXECUTED',
    traderId: 'TRD-8821',
    traderName: 'Alex Vance',
    complianceNote: 'Macro duration hedge execution.'
  },
  {
    tradeId: 'HIST-2026-907',
    timestamp: '2026-07-16T14:50:30Z',
    clientId: 'CL-DE-4412',
    clientName: 'Siemens Corporate Treasury GmbH',
    instrument: '10Y Bund Futures Swap',
    assetClass: 'Rates',
    sizeEur: 12000000,
    direction: 'BUY',
    venue: 'Bloomberg MTF',
    executedPrice: 2.45,
    benchmarkPrice: 2.46,
    slippageBps: -0.4,
    executionLatencyMs: 14,
    guardianScoreAtTime: 95,
    precrimeSimilarity: 0.06,
    status: 'EXECUTED',
    traderId: 'TRD-9904',
    traderName: 'Elena Rostova',
    complianceNote: 'Cleared standard corporate treasury execution.'
  },
  {
    tradeId: 'HIST-2026-908',
    timestamp: '2026-07-15T08:30:15Z',
    clientId: 'CL-LU-7719',
    clientName: 'BlackForest Alpha Hedge Fund LP',
    instrument: 'EUR/GBP 1M Straddle',
    assetClass: 'FX',
    sizeEur: 18000000,
    direction: 'BUY',
    venue: '360T MTF',
    executedPrice: 0.8540,
    benchmarkPrice: 0.8542,
    slippageBps: -0.9,
    executionLatencyMs: 16,
    guardianScoreAtTime: 91,
    precrimeSimilarity: 0.11,
    status: 'EXECUTED',
    traderId: 'TRD-9904',
    traderName: 'Elena Rostova',
    complianceNote: 'Vol arbitrage trade pre-screened.'
  },
  {
    tradeId: 'HIST-2026-909',
    timestamp: '2026-07-14T13:10:00Z',
    clientId: 'CL-DE-9081',
    clientName: 'Allianz Global Investors SE',
    instrument: 'Deutsche Telekom 1.375% Bond',
    assetClass: 'Credit',
    sizeEur: 22000000,
    direction: 'BUY',
    venue: 'Tradeweb',
    executedPrice: 94.10,
    benchmarkPrice: 94.15,
    slippageBps: -1.0,
    executionLatencyMs: 13,
    guardianScoreAtTime: 97,
    precrimeSimilarity: 0.07,
    status: 'EXECUTED',
    traderId: 'TRD-8821',
    traderName: 'Alex Vance',
    complianceNote: 'High executability score on Tradeweb.'
  },
  {
    tradeId: 'HIST-2026-910',
    timestamp: '2026-07-12T11:40:00Z',
    clientId: 'CL-IT-3301',
    clientName: 'Banca Monte Subprime SPV',
    instrument: 'EUR/USD Off-Market Swap',
    assetClass: 'FX',
    sizeEur: 35000000,
    direction: 'BUY',
    venue: 'Internal OTC',
    executedPrice: 1.1020,
    benchmarkPrice: 1.0890,
    slippageBps: +119.0,
    executionLatencyMs: 2100,
    guardianScoreAtTime: 18,
    precrimeSimilarity: 0.94,
    status: 'REJECTED',
    traderId: 'TRD-1022',
    traderName: 'Lukas Meyer',
    complianceNote: 'BLOCKED: Severe off-market rate deviation near fixing window + GwG AML trigger.'
  }
];

export async function fetchTradeHistory(): Promise<any[]> {
  try {
    const res = await fetch('/api/trade-history');
    if (res.ok) {
      const data = await res.json();
      if (data.tradeHistory && data.tradeHistory.length > 0) return data.tradeHistory;
    }
  } catch (e) {
    console.warn('[DataService] API offline for trade history, using default historical ledger');
  }
  return DEFAULT_TRADE_HISTORY;
}

export async function fetchAuditLogs(persona?: PersonaRole): Promise<AuditEntry[]> {
  try {
    const url = persona ? `/api/audit?persona=${encodeURIComponent(persona)}` : '/api/audit';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.logs && data.logs.length > 0) return data.logs;
    }
  } catch (e) {
    console.warn('[DataService] API offline or unavailable, using local audit logs');
  }
  return [
    {
      id: 'AUD-901',
      timestamp: new Date().toISOString(),
      module: 'AutoPilot Execution',
      persona: persona || 'Trader',
      user: 'Alex Vance (Trader)',
      action: 'MiFID II Best Execution Justification Generated',
      reasoningPayload: 'Evaluated market depth across Eurex MTF and 360T. Determined price improvement of 1.2bps with zero market impact under MiFID II Article 27.',
      guardianScoreAtTime: 92,
      modelUsed: 'gemini-1.5-pro / local-engine',
      latencyMs: 180,
      fallbackUsed: false,
    },
    {
      id: 'AUD-902',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      module: 'Pre-Crime Interrupt',
      persona: 'Compliance (1st Line)',
      user: 'Klaus Meier (Compliance)',
      action: 'Order Flagged by Cosine Vector Distance',
      reasoningPayload: 'Matched pattern with BaFin 2023 Libor Mismarking Fine (€42M). Cosine similarity score 0.874. Required 1st line compliance sign-off.',
      guardianScoreAtTime: 64,
      modelUsed: 'vector-cosine-engine',
      latencyMs: 45,
      fallbackUsed: false,
    },
  ];
}




export interface PersonaConfig {
  name: string;
  defaultRoute: string;
  allowedRoutes: string[];
  description: string;
}

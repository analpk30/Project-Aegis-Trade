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

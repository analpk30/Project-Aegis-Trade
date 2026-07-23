import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Zap,
  FileText,
  UserCheck,
  Lock,
  CheckCircle2,
  Users,
  Lightbulb,
  BookOpen,
  History,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuditEntry, Order, PersonaRole } from '../types';
import { fetchOrders, PERSONA_CONFIG_MAP } from '../lib/dataService';

interface HomeProps {
  guardianScore: number;
  activePersona: PersonaRole;
  activeUser: string;
  onPersonaChange: (role: PersonaRole) => void;
  onOpenWhyModal: (entry: AuditEntry) => void;
}

export const Home: React.FC<HomeProps> = ({
  guardianScore,
  activePersona,
  activeUser,
  onPersonaChange,
  onOpenWhyModal,
}) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrders().then((data) => {
      setOrders(data);
      if (data.length > 0) setSelectedOrder(data[0]);
      setIsLoading(false);
    });
  }, []);

  const personaConfig = PERSONA_CONFIG_MAP[activePersona] || PERSONA_CONFIG_MAP['Trader'];
  const allowedRoutes = personaConfig.allowedRoutes;

  const headlineScenarioOrder = orders.find((o) => o.id === 'ORD-2026-001') || orders[0];
  const precrimeScenarioOrder = orders.find((o) => o.id === 'ORD-2026-003');

  const allModules = [
    { path: '/trade', name: 'Trade Blotter', icon: Zap },
    { path: '/clients', name: 'Client Passports', icon: Users },
    { path: '/ideas', name: 'Approved Ideas', icon: Lightbulb },
    { path: '/bafin', name: 'BaFin Rulebook', icon: BookOpen },
    { path: '/risk', name: 'Risk & Anomalies', icon: AlertTriangle },
    { path: '/audit', name: 'XAI Audit Trail', icon: History },
    { path: '/executive', name: 'Executive ROI', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Hero Welcome Banner */}
      <div className="rounded-2xl border border-[#1F2937] bg-[#0F1115] p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-mono font-semibold text-emerald-400 border border-emerald-500/30">
                ACTIVE FRONT-OFFICE GATE
              </span>
              <span className="text-xs text-slate-400">All trade flows monitored by Pre-Crime & BaFin RAG</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
              Predictive Compliance & Front-Office Intelligence
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Execute at market speed without fearing the regulator. Every order is evaluated deterministically and justified by server-side Gemini AI.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/trade')}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Zap className="h-4 w-4" />
              <span>Launch AutoPilot Blotter</span>
            </button>
            <button
              onClick={() => navigate('/audit')}
              className="flex items-center gap-2 rounded-xl border border-[#1F2937] bg-[#090A0C] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-[#1F2937] transition-colors"
            >
              <FileText className="h-4 w-4 text-indigo-400" />
              <span>XAI Audit Trail</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Persona & RBAC Status Widget */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-semibold">Active Persona</span>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                  {activePersona}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100">{activeUser}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{personaConfig.description}</p>
            </div>
          </div>

          {/* Module Lock/Unlock Matrix Widget */}
          <div className="flex flex-wrap items-center gap-2 border-t lg:border-t-0 border-[#1F2937] pt-3 lg:pt-0">
            {allModules.map((mod) => {
              const isUnlocked = allowedRoutes.includes(mod.path);
              const Icon = mod.icon;
              return (
                <button
                  key={mod.path}
                  onClick={() => navigate(mod.path)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    isUnlocked
                      ? 'border-emerald-500/40 bg-[#090A0C] text-slate-200 hover:border-emerald-400 hover:bg-emerald-500/10'
                      : 'border-slate-800 bg-[#090A0C]/50 text-slate-600 cursor-not-allowed opacity-60'
                  }`}
                  title={isUnlocked ? `Open ${mod.name}` : `${mod.name} is locked for persona ${activePersona}`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isUnlocked ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>{mod.name}</span>
                  {isUnlocked ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 ml-1" />
                  ) : (
                    <Lock className="h-3 w-3 text-slate-600 ml-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid: Guardian Gauge + Pre-Crime Alert Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Guardian Score Gauge & Breakdown */}
        <div className="lg:col-span-2 rounded-2xl border border-[#1F2937] bg-[#0F1115] p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Guardian Score Index</h2>
                <p className="text-xs text-slate-400">Deterministic scoring engine (0 - 100)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xl font-black text-emerald-400">{guardianScore}/100</span>
              <span className="rounded bg-emerald-500/20 px-2 py-1 text-xs font-mono font-bold text-emerald-400 border border-emerald-500/30">
                GREEN GATE
              </span>
            </div>
          </div>

          {/* Metric Breakdown Progress Bars */}
          {headlineScenarioOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Selected Order for Inspection:</span>
                <span className="font-mono text-emerald-400 font-bold">{headlineScenarioOrder.id} ({headlineScenarioOrder.instrument})</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Executability */}
                <div className="rounded-xl border border-[#1F2937] bg-[#090A0C] p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">Executability (Market Width)</span>
                    <span className="font-mono font-bold text-emerald-400">{headlineScenarioOrder.scoreBreakdown.executabilityScore}/100</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#1F2937]">
                    <div
                      className="h-2 rounded-full bg-emerald-400 transition-all duration-500"
                      style={{ width: `${headlineScenarioOrder.scoreBreakdown.executabilityScore}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">Order size €{(headlineScenarioOrder.sizeEur / 1e6).toFixed(1)}M benchmarked against venue order depth.</p>
                </div>

                {/* Violation Risk */}
                <div className="rounded-xl border border-[#1F2937] bg-[#090A0C] p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">Violation Risk (Compliance)</span>
                    <span className="font-mono font-bold text-amber-400">{headlineScenarioOrder.scoreBreakdown.violationRiskScore}/100</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#1F2937]">
                    <div
                      className="h-2 rounded-full bg-amber-400 transition-all duration-500"
                      style={{ width: `${headlineScenarioOrder.scoreBreakdown.violationRiskScore}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">Includes AML risk, KYC status, and vector distance to historical fine cases.</p>
                </div>

                {/* Consent Score */}
                <div className="rounded-xl border border-[#1F2937] bg-[#090A0C] p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">GDPR / Client Consent</span>
                    <span className="font-mono font-bold text-emerald-400">{headlineScenarioOrder.scoreBreakdown.consentScore}/100</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#1F2937]">
                    <div
                      className="h-2 rounded-full bg-emerald-400 transition-all duration-500"
                      style={{ width: `${headlineScenarioOrder.scoreBreakdown.consentScore}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">Division clearance & asset class consent taxonomy status.</p>
                </div>

                {/* Regulatory Capital */}
                <div className="rounded-xl border border-[#1F2937] bg-[#090A0C] p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">Reg Capital Impact</span>
                    <span className="font-mono font-bold text-emerald-400">{headlineScenarioOrder.scoreBreakdown.regulatoryCapitalImpact}/100</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#1F2937]">
                    <div
                      className="h-2 rounded-full bg-emerald-400 transition-all duration-500"
                      style={{ width: `${headlineScenarioOrder.scoreBreakdown.regulatoryCapitalImpact}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">RWA impact score evaluated under MaRisk & Basel III rules.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Pre-Crime Real Vector Match Alert Banner */}
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-rose-500/30 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="h-5 w-5" />
                <span>PRE-CRIME VECTOR INTERRUPT</span>
              </div>
              <span className="rounded bg-rose-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-300">
                MATCH DETECTED
              </span>
            </div>

            {precrimeScenarioOrder?.precrimeMatch && (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-[#1F2937] bg-[#090A0C] p-3 text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Order Flagged</span>
                  <p className="font-mono font-bold text-slate-100">{precrimeScenarioOrder.id} — {precrimeScenarioOrder.instrument}</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">Size: €{(precrimeScenarioOrder.sizeEur / 1e6).toFixed(1)}M | Venue: {precrimeScenarioOrder.venue}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Top Match Historical Case:</span>
                    <span className="font-mono font-bold text-rose-400">{precrimeScenarioOrder.precrimeMatch.caseName}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Cosine Similarity Score:</span>
                    <span className="font-mono font-bold text-rose-400">
                      {precrimeScenarioOrder.precrimeMatch.similarityScore} ({(precrimeScenarioOrder.precrimeMatch.similarityScore * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 bg-[#090A0C] p-2 rounded border border-[#1F2937] mt-2">
                    <strong>Matched Pattern:</strong> {precrimeScenarioOrder.precrimeMatch.matchedPattern}
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/trade')}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-rose-400 transition-colors"
          >
            <span>Review Pre-Crime Interrupt in Blotter</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

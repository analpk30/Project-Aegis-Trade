import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Zap,
  FileText,
  UserCheck,
  Lock,
  Users,
  Lightbulb,
  BookOpen,
  History,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuditEntry, Order, PersonaRole } from '../types';
import { fetchOrders, PERSONA_CONFIG_MAP } from '../lib/dataService';

function gateColor(score: number): string {
  if (score >= 78) return '#42be65';
  if (score >= 55) return '#f1c21b';
  return '#fa4d56';
}

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
      <div className="rounded-2xl border border-[#393939] bg-[#28322b] p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#42be65]/20 px-2 py-0.5 text-xs font-semibold text-[#42be65] border border-[#42be65]/30">
                Gate Active
              </span>
              <span className="text-xs text-[#c6c6c6]">Monitored by Pre-Crime & BaFin RAG</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#f4f4f4]">
              Predictive Compliance & Front-Office Intelligence
            </h1>
            <p className="text-sm text-[#c6c6c6] max-w-2xl">
              Every order scored and justified automatically — trade at full speed.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/trade')}
              className="flex items-center gap-2 rounded-xl bg-[#42be65] px-4 py-2.5 text-xs font-bold text-[#161616] hover:bg-[#42be65]/80 transition-colors shadow-lg shadow-[#42be65]/20"
            >
              <Zap className="h-4 w-4" />
              <span>Launch AutoPilot Blotter</span>
            </button>
            <button
              onClick={() => navigate('/audit')}
              className="flex items-center gap-2 rounded-xl border border-[#393939] bg-[#161616] px-4 py-2.5 text-xs font-semibold text-[#c6c6c6] hover:bg-[#353535] transition-colors"
            >
              <FileText className="h-4 w-4 text-[#a56eff]" />
              <span>XAI Audit Trail</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Persona & RBAC Status Widget */}
      <div className="rounded-2xl border border-[#393939] bg-[#2b292f] p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 lg:w-[45%]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#a56eff]/20 text-[#a56eff] border border-[#a56eff]/40">
              <UserCheck className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#a56eff] uppercase tracking-wider font-semibold">Active Persona</span>
                <span className="rounded bg-[#a56eff]/20 px-2 py-0.5 text-[10px] font-bold text-[#a56eff]">
                  {activePersona}
                </span>
              </div>
              <h3 className="text-base font-bold text-[#f4f4f4] truncate">
                {activeUser.replace(` (${activePersona})`, '')}
              </h3>
              <p className="text-xs text-[#c6c6c6] mt-0.5 truncate">{personaConfig.description}</p>
            </div>
          </div>

          {/* Module Lock/Unlock Matrix Widget */}
          <div className="w-full lg:w-[45%] shrink-0 border-t lg:border-t-0 border-[#393939] pt-3 lg:pt-0">
            <div className="flex items-center justify-between lg:justify-end gap-2 mb-2">
              <span className="text-[11px] text-[#8d8d8d]">
                {allModules.filter((mod) => allowedRoutes.includes(mod.path)).length} of {allModules.length} modules unlocked
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {allModules.map((mod) => {
                const isUnlocked = allowedRoutes.includes(mod.path);
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.path}
                    onClick={() => navigate(mod.path)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      isUnlocked
                        ? 'border-[#a56eff]/40 bg-[#161616] text-[#f4f4f4] hover:border-[#a56eff] hover:bg-[#a56eff]/10'
                        : 'border-[#393939] bg-[#161616]/50 text-[#6f6f6f] cursor-not-allowed opacity-60'
                    }`}
                    title={isUnlocked ? `Open ${mod.name}` : `${mod.name} is locked for persona ${activePersona}`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isUnlocked ? 'text-[#a56eff]' : 'text-[#6f6f6f]'}`} />
                    <span>{mod.name}</span>
                    {!isUnlocked && <Lock className="h-3 w-3 text-[#6f6f6f]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Guardian Gauge + Pre-Crime Alert Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Guardian Score Gauge & Breakdown */}
        <div
          className="lg:col-span-2 rounded-2xl border p-6 shadow-xl space-y-6 transition-colors"
          style={{ borderColor: '#42be6540', backgroundColor: '#1a1d22' }}
        >
          <div className="flex items-center justify-between border-b border-[#393939] pb-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl border"
                style={{ backgroundColor: '#42be651A', color: '#42be65', borderColor: '#42be654D' }}
              >
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#f4f4f4]">Guardian Score Index</h2>
                <p className="text-xs text-[#c6c6c6]">Deterministic scoring engine (0 - 100)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xl font-black" style={{ color: '#42be65' }}>
                {guardianScore}/100
              </span>
              <span
                className="rounded px-2 py-1 text-xs font-mono font-bold border"
                style={{ backgroundColor: '#42be6526', color: '#42be65', borderColor: '#42be654D' }}
              >
                GREEN GATE
              </span>
            </div>
          </div>

          {/* Metric Breakdown Progress Bars */}
          {headlineScenarioOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-[#393939] bg-[#161616] px-3.5 py-2.5">
                <span className="text-sm text-[#c6c6c6] font-medium">Selected Order for Inspection</span>
                <span className="font-mono text-sm text-[#f4f4f4] font-bold">
                  {headlineScenarioOrder.id} <span className="text-[#8d8d8d] font-normal">({headlineScenarioOrder.instrument})</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Executability */}
                <div
                  className="rounded-xl border p-4 space-y-2"
                  style={{
                    borderColor: '#393939',
                    backgroundColor: '#42be6514',
                  }}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#c6c6c6] font-semibold">Executability (Market Width)</span>
                    <span className="font-mono font-bold" style={{ color: '#42be65' }}>
                      {headlineScenarioOrder.scoreBreakdown.executabilityScore}/100
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#393939]">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${headlineScenarioOrder.scoreBreakdown.executabilityScore}%`,
                        backgroundColor: '#42be65',
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-[#8d8d8d]">Order size €{(headlineScenarioOrder.sizeEur / 1e6).toFixed(1)}M vs venue depth.</p>
                </div>

                {/* Violation Risk */}
                <div
                  className="rounded-xl border p-4 space-y-2"
                  style={{
                    borderColor: '#393939',
                    backgroundColor: '#42be6514',
                  }}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#c6c6c6] font-semibold">Violation Risk (Compliance)</span>
                    <span className="font-mono font-bold" style={{ color: '#42be65' }}>
                      {headlineScenarioOrder.scoreBreakdown.violationRiskScore}/100
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#393939]">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${headlineScenarioOrder.scoreBreakdown.violationRiskScore}%`,
                        backgroundColor: '#42be65',
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-[#8d8d8d]">AML risk, KYC status & historical fine-case distance.</p>
                </div>

                {/* Consent Score */}
                <div
                  className="rounded-xl border p-4 space-y-2"
                  style={{
                    borderColor: '#393939',
                    backgroundColor: '#42be6514',
                  }}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#c6c6c6] font-semibold">GDPR / Client Consent</span>
                    <span className="font-mono font-bold" style={{ color: '#42be65' }}>
                      {headlineScenarioOrder.scoreBreakdown.consentScore}/100
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#393939]">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${headlineScenarioOrder.scoreBreakdown.consentScore}%`,
                        backgroundColor: '#42be65',
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-[#8d8d8d]">Division clearance & consent taxonomy status.</p>
                </div>

                {/* Regulatory Capital */}
                <div
                  className="rounded-xl border p-4 space-y-2"
                  style={{
                    borderColor: '#393939',
                    backgroundColor: '#42be6514',
                  }}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#c6c6c6] font-semibold">Reg Capital Impact</span>
                    <span className="font-mono font-bold" style={{ color: '#42be65' }}>
                      {headlineScenarioOrder.scoreBreakdown.regulatoryCapitalImpact}/100
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#393939]">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${headlineScenarioOrder.scoreBreakdown.regulatoryCapitalImpact}%`,
                        backgroundColor: '#42be65',
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-[#8d8d8d]">RWA impact under MaRisk & Basel III.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Pre-Crime Real Vector Match Alert Banner */}
        <div className="group rounded-2xl border border-[#fa4d56]/30 bg-[#37292a] p-6 shadow-xl flex flex-col justify-between gap-5 transition-all hover:border-[#fa4d56]/50 hover:-translate-y-0.5">
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fa4d56]/15 text-[#fa4d56] border border-[#fa4d56]/40">
                  <span className="absolute inset-0 rounded-xl bg-[#fa4d56]/30 animate-ping" />
                  <AlertTriangle className="relative h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#f4f4f4] leading-tight">Pre-Crime Interrupt</h2>
                  <p className="text-xs text-[#c6c6c6]">Historical vector pattern match</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 rounded bg-[#fa4d56]/20 px-2 py-0.5 text-[10px] font-bold text-[#fa4d56] border border-[#fa4d56]/30 whitespace-nowrap">
                <span className="h-1.5 w-1.5 rounded-full bg-[#fa4d56] animate-pulse" />
                Live Match
              </span>
            </div>

            {precrimeScenarioOrder?.precrimeMatch && (
              <>
                {/* Flagged Order */}
                <div className="rounded-xl border border-[#393939] bg-[#161616] p-3.5">
                  <span className="text-[10px] uppercase tracking-wide text-[#8d8d8d] block">Order Flagged</span>
                  <p className="font-mono font-bold text-[#f4f4f4] text-sm mt-0.5">
                    {precrimeScenarioOrder.id} — {precrimeScenarioOrder.instrument}
                  </p>
                  <p className="text-[#8d8d8d] text-xs mt-1">
                    €{(precrimeScenarioOrder.sizeEur / 1e6).toFixed(1)}M · {precrimeScenarioOrder.venue}
                  </p>
                </div>

                {/* Similarity Headline Stat */}
                <div className="rounded-xl border border-[#fa4d56]/30 bg-[#fa4d56]/5 p-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wide text-[#8d8d8d] block">Matches historical case</span>
                      <span className="text-sm font-bold text-[#f4f4f4]">{precrimeScenarioOrder.precrimeMatch.caseName}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-3xl font-black text-[#fa4d56] leading-none block">
                        {(precrimeScenarioOrder.precrimeMatch.similarityScore * 100).toFixed(0)}%
                      </span>
                      <span className="text-[10px] font-bold uppercase text-[#fa4d56]/80">
                        {precrimeScenarioOrder.precrimeMatch.similarityScore >= 0.9
                          ? 'Critical'
                          : precrimeScenarioOrder.precrimeMatch.similarityScore >= 0.75
                          ? 'High'
                          : 'Moderate'}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#393939] mt-3 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-[#fa4d56] transition-all duration-1000 ease-out"
                      style={{ width: `${precrimeScenarioOrder.precrimeMatch.similarityScore * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#c6c6c6] mt-3 leading-relaxed">
                    {precrimeScenarioOrder.precrimeMatch.matchedPattern}
                  </p>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => navigate('/trade')}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#fa4d56] py-2.5 text-sm font-bold text-[#161616] hover:bg-[#fa4d56]/85 transition-colors"
          >
            <span>Review in Blotter</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

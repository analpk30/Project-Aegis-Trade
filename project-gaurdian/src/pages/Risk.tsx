import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, ShieldAlert, Sliders, Zap, RotateCcw, Activity, Users, Cpu, Sparkles } from 'lucide-react';
import { HedgeOption, MarketAnomaly, PersonaRole } from '../types';
import { fetchAnomalies, fetchHedges } from '../lib/dataService';
import { AnomalySparkline } from '../components/AnomalySparkline';

interface RiskProps {
  activePersona?: PersonaRole;
}

const SEV = {
  RED: { border: 'border-rose-500/40', bg: 'bg-rose-500/10', text: 'text-rose-400', dot: 'bg-rose-500' },
  AMBER: { border: 'border-amber-500/40', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-500' },
  GREEN: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500' },
} as const;

const fmtEur = (n?: number) =>
  n == null ? '—' : n >= 1e6 ? `€${(n / 1e6).toFixed(1)}M` : `€${n.toLocaleString()}`;

export const Risk: React.FC<RiskProps> = ({ activePersona = 'Risk Officer' }) => {
  const [anomalies, setAnomalies] = useState<MarketAnomaly[]>([]);
  const [hedges, setHedges] = useState<HedgeOption[]>([]);
  const [regime, setRegime] = useState<'normal' | 'stressed' | null>(null);
  const [busy, setBusy] = useState(false);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const sigmaHistory = useRef<number[]>([]);
  const [, forceRender] = useState(0);

  useEffect(() => {
    fetchHedges().then(setHedges);
  }, []);

  // Live polling of the cross-market anomaly engine. Display cadence is 5s to
  // match the backend's decoupled publish rate (compute runs faster underneath).
  useEffect(() => {
    let active = true;
    const poll = async () => {
      const data = await fetchAnomalies();
      if (!active) return;
      setAnomalies(data);
      const composite = data.find((a) => a.id === 'ANOM-XMKT') ?? data[0];
      // Prefer the backend's fine-grained history (2s resolution); fall back to
      // accumulating client-side if the backend doesn't provide it.
      if (composite?.sigmaHistory && composite.sigmaHistory.length) {
        sigmaHistory.current = composite.sigmaHistory;
      } else if (composite) {
        const hist = sigmaHistory.current;
        hist.push(composite.deviationSigma);
        if (hist.length > 60) hist.shift();
      }
      forceRender((n) => n + 1);
    };
    poll();
    const t = setInterval(poll, 500);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  const setShock = async (shock: boolean) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/risk/${shock ? 'simulate-shock' : 'simulate-reset'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json();
      if (data.regime) setRegime(data.regime);
      if (!shock) setBriefing(null);
    } catch {
      /* backend offline — polling will keep showing last state */
    } finally {
      setBusy(false);
    }
  };

  const generateBriefing = async () => {
    setBriefingLoading(true);
    setBriefing(null);
    try {
      const res = await fetch('/api/risk/anomalies/narrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anomalyId: 'ANOM-XMKT' }),
      });
      const data = await res.json();
      setBriefing(data.narrative ?? 'No briefing available.');
    } catch {
      setBriefing('Risk briefing unavailable — backend unreachable.');
    } finally {
      setBriefingLoading(false);
    }
  };

  const composite = anomalies.find((a) => a.id === 'ANOM-XMKT') ?? anomalies[0];
  const activeAlerts = anomalies.filter((a) => a.alertLevel !== 'GREEN');

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
            <span>Modules 8 &amp; 9: Cross-Market Anomaly Detector &amp; Optimal Hedging Recommender</span>
          </h1>
          <p className="text-xs text-slate-400">
            Live multivariate anomaly detection (Mahalanobis distance over a rolling covariance matrix) with a
            Hawkes-process contagion forecast.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShock(true)}
            disabled={busy}
            className="flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-rose-400 transition-colors disabled:opacity-50"
          >
            <Zap className="h-4 w-4" /> Trigger Market Shock
          </button>
          <button
            onClick={() => setShock(false)}
            disabled={busy}
            className="flex items-center gap-2 rounded-xl border border-[#1F2937] bg-[#0F1115] px-3 py-2 text-xs font-bold text-slate-300 hover:text-slate-100 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>

      {/* Module 8: Anomalies */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono uppercase text-slate-400 font-semibold flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            <span>Module 8: Cross-Market Anomaly Detector</span>
          </h2>
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
            <span className={`h-2 w-2 rounded-full ${regime === 'stressed' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
            {activeAlerts.length} active · regime {regime ?? 'nominal'}
          </span>
        </div>

        {/* Live composite monitor + sparkline */}
        {composite && (
          <div className={`rounded-2xl border ${SEV[composite.alertLevel].border} ${SEV[composite.alertLevel].bg} p-5 shadow-xl`}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${SEV[composite.alertLevel].dot} ${composite.alertLevel === 'RED' ? 'animate-pulse' : ''}`} />
                  <span className={`font-mono text-xs font-bold ${SEV[composite.alertLevel].text}`}>
                    [{composite.alertLevel}] {composite.metric}
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className={`text-3xl font-bold ${SEV[composite.alertLevel].text}`}>
                    {composite.deviationSigma.toFixed(1)}σ
                  </span>
                  {composite.mahalanobisDistance != null && (
                    <span className="font-mono text-[10px] text-slate-400">Mahalanobis {composite.mahalanobisDistance.toFixed(1)}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-500 shrink-0" />
                <AnomalySparkline data={sigmaHistory.current} contagion={composite.contagionHistory} />
              </div>
            </div>

            {/* Contagion forecast */}
            {composite.contagionProbability != null && (
              <div className="mt-4 rounded-xl border border-[#1F2937] bg-[#090A0C] p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400">Hawkes contagion forecast ({composite.forecastHorizonMins ?? 15}min)</span>
                  <span className={`font-mono font-bold ${SEV[composite.alertLevel].text}`}>
                    {(composite.contagionProbability * 100).toFixed(0)}% cascade probability
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className={`h-full ${SEV[composite.alertLevel].dot}`} style={{ width: `${composite.contagionProbability * 100}%` }} />
                </div>
              </div>
            )}

            {/* AI briefing */}
            {composite.alertLevel !== 'GREEN' && (
              <div className="mt-3">
                <button
                  onClick={generateBriefing}
                  disabled={briefingLoading}
                  className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                >
                  {briefingLoading ? <Cpu className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  AI Risk Briefing
                </button>
                {briefing && (
                  <p className="mt-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {briefing}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Per-cluster cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeAlerts
            .filter((a) => a.id !== 'ANOM-XMKT')
            .map((anom) => {
              const sev = SEV[anom.alertLevel];
              return (
                <div key={anom.id} className={`rounded-2xl border ${sev.border} ${sev.bg} p-5 shadow-xl space-y-3`}>
                  <div className={`flex items-center justify-between border-b ${sev.border} pb-3`}>
                    <span className={`font-mono text-xs font-bold ${sev.text}`}>[{anom.alertLevel}] {anom.assetClass}</span>
                    <span className={`font-mono text-xs font-bold ${sev.text}`}>{anom.deviationSigma.toFixed(1)} σ</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase">{anom.metric}</span>
                    <p className="text-xs text-slate-200 mt-1 leading-relaxed">{anom.description}</p>
                  </div>

                  {anom.contributingMarkets && anom.contributingMarkets.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {anom.contributingMarkets.map((m) => (
                        <span key={m} className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">{m}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between rounded-xl border border-[#1F2937] bg-[#090A0C] p-3 text-xs">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Users className="h-3.5 w-3.5" />
                      {anom.affectedClients.length} book{anom.affectedClients.length !== 1 ? 's' : ''} exposed
                    </span>
                    <span className={`font-mono font-bold ${sev.text}`}>{fmtEur(anom.exposedNotionalEur)}</span>
                  </div>

                  <div className={`rounded-xl border border-[#1F2937] bg-[#090A0C] p-3 text-xs ${sev.text}`}>
                    <strong>Recommended Action:</strong> {anom.recommendedAction}
                  </div>
                </div>
              );
            })}
        </div>

        {activeAlerts.length === 0 && composite?.alertLevel === 'GREEN' && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-300 font-mono">
            ✓ No active cross-market anomalies — correlation structure nominal.
          </div>
        )}
      </div>

      {/* Module 9: Hedging Recommender */}
      <div className="space-y-4 pt-4 border-t border-[#1F2937]">
        <h2 className="text-sm font-mono uppercase text-slate-400 font-semibold flex items-center gap-2">
          <Sliders className="h-4 w-4 text-emerald-400" />
          <span>Module 9: Optimal Hedging Recommender</span>
        </h2>

        <div className="space-y-4">
          {hedges.map((hdg) => (
            <div key={hdg.id} className="rounded-2xl border border-[#1F2937] bg-[#0F1115] p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#1F2937] pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-emerald-400">{hdg.id}</span>
                  <h3 className="text-base font-bold text-slate-100 mt-0.5">{hdg.positionName}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400 border border-emerald-500/30">
                    Efficiency Score: {hdg.combinedEfficiencyScore}/100
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                <div className="rounded-xl border border-[#1F2937] bg-[#090A0C] p-3">
                  <span className="text-slate-400 text-[10px] block">Hedge Instrument</span>
                  <span className="text-slate-200 font-bold">{hdg.hedgeInstrument}</span>
                </div>

                <div className="rounded-xl border border-[#1F2937] bg-[#090A0C] p-3">
                  <span className="text-slate-400 text-[10px] block">Hedge Cost</span>
                  <span className="text-amber-400 font-bold">{hdg.hedgeCostBps} bps</span>
                </div>

                <div className="rounded-xl border border-[#1F2937] bg-[#090A0C] p-3">
                  <span className="text-slate-400 text-[10px] block">Reg Capital Impact (RWA)</span>
                  <span className="text-emerald-400 font-bold">{hdg.regCapitalImpactPct}% Impact</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-[#090A0C] p-3 rounded-xl border border-[#1F2937]">
                <strong>Rationale:</strong> {hdg.recommendationRationale}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, Sliders, TrendingUp, CheckCircle, ArrowRight } from 'lucide-react';
import { HedgeOption, MarketAnomaly, PersonaRole } from '../types';
import { fetchAnomalies, fetchHedges } from '../lib/dataService';

interface RiskProps {
  activePersona?: PersonaRole;
}

export const Risk: React.FC<RiskProps> = ({ activePersona = 'Risk Officer' }) => {
  const [anomalies, setAnomalies] = useState<MarketAnomaly[]>([]);
  const [hedges, setHedges] = useState<HedgeOption[]>([]);

  useEffect(() => {
    fetchAnomalies().then((data) => setAnomalies(data));
    fetchHedges().then((data) => setHedges(data));
  }, []);

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-rose-400" />
          <span>Modules 8 & 9: Cross-Market Anomaly Detector & Optimal Hedging Recommender</span>
        </h1>
        <p className="text-xs text-slate-400">
          Statistical time-series anomaly monitoring combined with capital-policy hedging optimization.
        </p>
      </div>

      {/* Module 8: Anomalies */}
      <div className="space-y-4">
        <h2 className="text-sm font-mono uppercase text-slate-400 font-semibold flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-rose-400" />
          <span>Module 8: Cross-Market Anomaly Detector</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {anomalies.map((anom) => (
            <div key={anom.id} className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-rose-500/30 pb-3">
                <span className="font-mono text-xs font-bold text-rose-400">[{anom.alertLevel}] {anom.id}</span>
                <span className="font-mono text-xs font-bold text-rose-300">
                  DEVIATION: +{anom.deviationSigma} σ
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-mono uppercase">{anom.assetClass} | {anom.metric}</span>
                <p className="text-xs text-slate-200 mt-1 leading-relaxed">{anom.description}</p>
              </div>

              <div className="rounded-xl border border-[#1F2937] bg-[#090A0C] p-3 text-xs text-rose-300">
                <strong>Recommended Action:</strong> {anom.recommendedAction}
              </div>
            </div>
          ))}
        </div>
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

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Zap,
  ShieldCheck,
  Activity,
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { fetchEngineStatus, setEngineMode, runEngineBenchmark } from '../lib/dataService';

interface DualEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DualEngineModal: React.FC<DualEngineModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modeChanging, setModeChanging] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<any>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    const data = await fetchEngineStatus();
    setStatus(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const handleModeToggle = async (newMode: 'auto' | 'force_fallback') => {
    setModeChanging(true);
    await setEngineMode(newMode);
    await loadStatus();
    setModeChanging(false);
  };

  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    setBenchmarkResult(null);
    const result = await runEngineBenchmark();
    setBenchmarkResult(result);
    setIsBenchmarking(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-4xl rounded-2xl border border-[#1F2937] bg-[#0F1115] p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 font-mono">DUAL-ENGINE FALLBACK ARCHITECTURE</h2>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                  AUTO-FAILOVER ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Primary LLM (Gemini 2.5 Flash) with Local Statistical Vector Engine Fallback
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-[#1F2937] hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-6 pr-1">
          {/* Engine Selector Control */}
          <div className="rounded-xl border border-[#1F2937] bg-[#090A0C] p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono font-semibold uppercase text-slate-400 block">Operation Mode</span>
                <p className="text-xs text-slate-300 mt-0.5">
                  Select whether the system uses automatic failover or forces local deterministic vector reasoning.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-[#0F1115] p-1 rounded-xl border border-[#1F2937]">
                <button
                  onClick={() => handleModeToggle('auto')}
                  disabled={modeChanging}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    status?.mode === 'auto'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>Auto (Gemini → Fallback)</span>
                </button>

                <button
                  onClick={() => handleModeToggle('force_fallback')}
                  disabled={modeChanging}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    status?.mode === 'force_fallback'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Force Local Statistical Engine</span>
                </button>
              </div>
            </div>
          </div>

          {/* Dual Engine Cards Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Engine Card */}
            <div
              className={`rounded-xl border p-4 transition-all ${
                status?.mode === 'auto'
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-[#1F2937] bg-[#090A0C] opacity-75'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase font-mono">PRIMARY ENGINE</span>
                </div>
                <span
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                    status?.primaryEngine?.status === 'ONLINE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {status?.primaryEngine?.status || 'ONLINE'}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Model Architecture</span>
                  <span className="font-mono text-slate-200 font-semibold">{status?.primaryEngine?.name}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="rounded-lg bg-slate-950 p-2 border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px]">Avg Latency</span>
                    <span className="font-mono text-emerald-400 font-bold">{status?.primaryEngine?.avgLatencyMs} ms</span>
                  </div>
                  <div className="rounded-lg bg-slate-950 p-2 border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px]">API Key Status</span>
                    <span className="font-mono text-slate-300 font-semibold">
                      {status?.primaryEngine?.apiKeyConfigured ? 'Configured ✓' : 'Missing'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 pt-1">
                  Generates generative regulatory summaries & compliance arguments using Google Gemini models.
                </p>
              </div>
            </div>

            {/* Local Fallback Engine Card */}
            <div
              className={`rounded-xl border p-4 transition-all ${
                status?.mode === 'force_fallback' || status?.fallbackEngine?.status === 'ACTIVE'
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : 'border-[#1F2937] bg-[#090A0C]'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase font-mono">FALLBACK ENGINE</span>
                </div>
                <span
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                    status?.mode === 'force_fallback'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {status?.mode === 'force_fallback' ? 'FORCED ACTIVE' : 'READY (STANDBY)'}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Statistical Model</span>
                  <span className="font-mono text-slate-200 font-semibold">{status?.fallbackEngine?.name}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="rounded-lg bg-slate-950 p-2 border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px]">Deterministic Latency</span>
                    <span className="font-mono text-amber-400 font-bold">{status?.fallbackEngine?.avgLatencyMs} ms</span>
                  </div>
                  <div className="rounded-lg bg-slate-950 p-2 border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px]">Confidence Rating</span>
                    <span className="font-mono text-slate-300 font-semibold">
                      {(status?.fallbackEngine?.confidenceScore * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 pt-1">
                  Uses Cosine Vector Distance against historical BaFin fine cases + 4-part Guardian Matrix decision tree.
                </p>
              </div>
            </div>
          </div>

          {/* Telemetry Bar */}
          {status?.telemetry && (
            <div className="rounded-xl border border-[#1F2937] bg-[#090A0C] p-4">
              <span className="text-xs font-mono font-semibold uppercase text-slate-400 block mb-2">
                Live Dual-Engine Telemetry
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-lg bg-[#0F1115] p-2.5 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Total Queries</span>
                  <span className="font-mono font-bold text-slate-200 text-sm">{status.telemetry.totalRequests}</span>
                </div>
                <div className="rounded-lg bg-[#0F1115] p-2.5 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Gemini Primary</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">{status.telemetry.geminiSuccesses}</span>
                </div>
                <div className="rounded-lg bg-[#0F1115] p-2.5 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Fallback Triggers</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">{status.telemetry.fallbackTriggers}</span>
                </div>
                <div className="rounded-lg bg-[#0F1115] p-2.5 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Last Query Latency</span>
                  <span className="font-mono font-bold text-sky-400 text-sm">{status.telemetry.lastLatencyMs} ms</span>
                </div>
              </div>
            </div>
          )}

          {/* Parallel Benchmark Test Playground */}
          <div className="rounded-xl border border-slate-800 bg-[#090A0C] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs font-mono font-bold uppercase text-slate-200 block">
                  Parallel Benchmark Comparison
                </span>
                <p className="text-xs text-slate-400">
                  Run a real order simultaneously through both engines to compare reasoning and execution speed.
                </p>
              </div>

              <button
                onClick={handleRunBenchmark}
                disabled={isBenchmarking}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition-colors"
              >
                {isBenchmarking ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                <span>Run Side-by-Side Test</span>
              </button>
            </div>

            {benchmarkResult && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Primary Result Box */}
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <div className="flex items-center justify-between font-mono font-bold text-emerald-400 border-b border-emerald-500/20 pb-1.5 mb-2">
                    <span>Gemini 2.5 Flash</span>
                    <span>{benchmarkResult.primaryResult.latencyMs} ms</span>
                  </div>
                  <p className="text-slate-200 text-[11px] leading-relaxed whitespace-pre-wrap">
                    {benchmarkResult.primaryResult.text}
                  </p>
                </div>

                {/* Fallback Result Box */}
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <div className="flex items-center justify-between font-mono font-bold text-amber-400 border-b border-amber-500/20 pb-1.5 mb-2">
                    <span>Local Statistical Vector Engine</span>
                    <span>{benchmarkResult.fallbackResult.latencyMs} ms</span>
                  </div>
                  <p className="text-slate-200 text-[11px] leading-relaxed whitespace-pre-wrap">
                    {benchmarkResult.fallbackResult.text}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-[#1F2937] pt-4">
          <span className="text-[11px] text-slate-500 font-mono">
            Project Guardian Dual-Engine Safety Compliance Gate v2.0
          </span>
          <button
            onClick={onClose}
            className="rounded-lg bg-[#1F2937] px-4 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};

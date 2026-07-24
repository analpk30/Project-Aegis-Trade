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

  const isAutoMode = status?.mode === 'auto';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-4xl rounded-2xl border border-[#393939] bg-[#161616] p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#393939] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3ddbd9]/10 text-[#3ddbd9] border border-[#3ddbd9]/30">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#f4f4f4]">Dual-Engine Fallback Architecture</h2>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-semibold border ${
                    isAutoMode
                      ? 'bg-[#3ddbd9]/20 text-[#3ddbd9] border-[#3ddbd9]/30'
                      : 'bg-[#ff832b]/20 text-[#ff832b] border-[#ff832b]/30'
                  }`}
                >
                  {isAutoMode ? 'Auto-Failover Active' : 'Forced Fallback Mode'}
                </span>
              </div>
              <p className="text-xs text-[#c6c6c6]">
                Primary LLM (Gemini 2.5 Flash) with a local statistical engine as safety-net fallback
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#c6c6c6] hover:bg-[#353535] hover:text-[#f4f4f4]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-6 pr-1">
          {/* Engine Selector Control */}
          <div className="rounded-xl border border-[#393939] bg-[#262626] p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-sm font-semibold text-[#f4f4f4] block">Operation Mode</span>
                <p className="text-xs text-[#c6c6c6] mt-0.5">
                  Choose automatic failover to Gemini, or force every order through the deterministic local engine.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-[#161616] p-1 rounded-xl border border-[#393939]">
                <button
                  onClick={() => handleModeToggle('auto')}
                  disabled={modeChanging}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isAutoMode
                      ? 'bg-[#3ddbd9] text-[#161616] font-bold shadow-md'
                      : 'text-[#c6c6c6] hover:text-[#f4f4f4]'
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
                      ? 'bg-[#ff832b] text-[#161616] font-bold shadow-md'
                      : 'text-[#c6c6c6] hover:text-[#f4f4f4]'
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
                isAutoMode ? 'border-[#3ddbd9]/40 bg-[#3ddbd9]/5' : 'border-[#393939] bg-[#262626] opacity-75'
              }`}
            >
              <div className="flex items-center justify-between border-b border-[#393939] pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#3ddbd9]" />
                  <span className="text-sm font-semibold text-[#f4f4f4]">Primary Engine</span>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs font-mono font-bold rounded ${
                    status?.primaryEngine?.status === 'ONLINE'
                      ? 'bg-[#3ddbd9]/20 text-[#3ddbd9] border border-[#3ddbd9]/30'
                      : 'bg-[#393939] text-[#c6c6c6]'
                  }`}
                >
                  {status?.primaryEngine?.status || 'ONLINE'}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-sm">
                <div>
                  <span className="text-[#8d8d8d] block text-xs">Model</span>
                  <span className="text-[#f4f4f4] font-semibold">{status?.primaryEngine?.name}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="rounded-lg bg-[#161616] p-2 border border-[#393939]">
                    <span className="text-[#8d8d8d] block text-xs">Avg Latency</span>
                    <span className="font-mono text-[#3ddbd9] font-bold">{status?.primaryEngine?.avgLatencyMs} ms</span>
                  </div>
                  <div className="rounded-lg bg-[#161616] p-2 border border-[#393939]">
                    <span className="text-[#8d8d8d] block text-xs">API Key</span>
                    <span className="text-[#c6c6c6] font-semibold">
                      {status?.primaryEngine?.apiKeyConfigured ? 'Configured ✓' : 'Missing'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#c6c6c6] pt-1 leading-relaxed">
                  Drafts regulatory justifications and compliance reasoning for flagged orders using Google's Gemini language model.
                </p>
              </div>
            </div>

            {/* Local Fallback Engine Card */}
            <div
              className={`rounded-xl border p-4 transition-all ${
                status?.mode === 'force_fallback' || status?.fallbackEngine?.status === 'ACTIVE'
                  ? 'border-[#ff832b]/40 bg-[#ff832b]/5'
                  : 'border-[#393939] bg-[#262626]'
              }`}
            >
              <div className="flex items-center justify-between border-b border-[#393939] pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#ff832b]" />
                  <span className="text-sm font-semibold text-[#f4f4f4]">Fallback Engine</span>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs font-mono font-bold rounded ${
                    status?.mode === 'force_fallback'
                      ? 'bg-[#ff832b]/20 text-[#ff832b] border border-[#ff832b]/30'
                      : 'bg-[#3ddbd9]/20 text-[#3ddbd9] border border-[#3ddbd9]/30'
                  }`}
                >
                  {status?.mode === 'force_fallback' ? 'Forced Active' : 'Ready (Standby)'}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-sm">
                <div>
                  <span className="text-[#8d8d8d] block text-xs">Model</span>
                  <span className="text-[#f4f4f4] font-semibold">{status?.fallbackEngine?.name}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="rounded-lg bg-[#161616] p-2 border border-[#393939]">
                    <span className="text-[#8d8d8d] block text-xs">Latency</span>
                    <span className="font-mono text-[#ff832b] font-bold">{status?.fallbackEngine?.avgLatencyMs} ms</span>
                  </div>
                  <div className="rounded-lg bg-[#161616] p-2 border border-[#393939]">
                    <span className="text-[#8d8d8d] block text-xs">Confidence</span>
                    <span className="text-[#c6c6c6] font-semibold">
                      {(status?.fallbackEngine?.confidenceScore * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#c6c6c6] pt-1 leading-relaxed">
                  {status?.fallbackEngine?.algorithm
                    ? `Decides using ${status.fallbackEngine.algorithm}.`
                    : 'Runs entirely on deterministic local math — no external API call, so it keeps working if Gemini is unreachable.'}
                </p>
              </div>
            </div>
          </div>

          {/* Telemetry Bar */}
          {status?.telemetry && (
            <div className="rounded-xl border border-[#393939] bg-[#262626] p-4">
              <span className="text-sm font-semibold text-[#f4f4f4] block mb-2">Live Session Telemetry</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg bg-[#161616] p-2.5 border border-[#393939]">
                  <span className="text-[#8d8d8d] text-xs block">Total Queries</span>
                  <span className="font-mono font-bold text-[#f4f4f4] text-sm">{status.telemetry.totalRequests}</span>
                </div>
                <div className="rounded-lg bg-[#161616] p-2.5 border border-[#393939]">
                  <span className="text-[#8d8d8d] text-xs block">Handled by Gemini</span>
                  <span className="font-mono font-bold text-[#3ddbd9] text-sm">{status.telemetry.geminiSuccesses}</span>
                </div>
                <div className="rounded-lg bg-[#161616] p-2.5 border border-[#393939]">
                  <span className="text-[#8d8d8d] text-xs block">Fallback Triggers</span>
                  <span className="font-mono font-bold text-[#ff832b] text-sm">{status.telemetry.fallbackTriggers}</span>
                </div>
                <div className="rounded-lg bg-[#161616] p-2.5 border border-[#393939]">
                  <span className="text-[#8d8d8d] text-xs block">Last Query Latency</span>
                  <span className="font-mono font-bold text-[#33b1ff] text-sm">{status.telemetry.lastLatencyMs} ms</span>
                </div>
              </div>
            </div>
          )}

          {/* Parallel Benchmark Test Playground */}
          <div className="rounded-xl border border-[#393939] bg-[#262626] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-sm font-semibold text-[#f4f4f4] block">Parallel Benchmark Comparison</span>
                <p className="text-xs text-[#c6c6c6]">
                  Send one real order through both engines at once to compare their reasoning and response time.
                </p>
              </div>

              <button
                onClick={handleRunBenchmark}
                disabled={isBenchmarking}
                className="flex items-center gap-1.5 rounded-lg bg-[#3ddbd9] px-3 py-1.5 text-xs font-bold text-[#161616] hover:bg-[#3ddbd9]/80 disabled:opacity-50 transition-colors shrink-0"
              >
                {isBenchmarking ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                <span>Run Side-by-Side Test</span>
              </button>
            </div>

            {benchmarkResult && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#8d8d8d]">Results</span>
                  <button
                    onClick={() => setBenchmarkResult(null)}
                    className="text-[#8d8d8d] hover:text-[#f4f4f4] transition-colors"
                    title="Close results"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {/* Primary Result Box */}
                <div className="rounded-lg border border-[#3ddbd9]/30 bg-[#3ddbd9]/10 p-3">
                  <div className="flex items-center justify-between font-bold text-[#3ddbd9] border-b border-[#3ddbd9]/20 pb-1.5 mb-2">
                    <span>Gemini 2.5 Flash</span>
                    <span className="font-mono">{benchmarkResult.primaryResult.latencyMs} ms</span>
                  </div>
                  <p className="text-[#f4f4f4] text-xs leading-relaxed whitespace-pre-wrap">
                    {benchmarkResult.primaryResult.text}
                  </p>
                </div>

                {/* Fallback Result Box */}
                <div className="rounded-lg border border-[#ff832b]/30 bg-[#ff832b]/10 p-3">
                  <div className="flex items-center justify-between font-bold text-[#ff832b] border-b border-[#ff832b]/20 pb-1.5 mb-2">
                    <span>Local Statistical Vector Engine</span>
                    <span className="font-mono">{benchmarkResult.fallbackResult.latencyMs} ms</span>
                  </div>
                  <p className="text-[#f4f4f4] text-xs leading-relaxed whitespace-pre-wrap">
                    {benchmarkResult.fallbackResult.text}
                  </p>
                </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

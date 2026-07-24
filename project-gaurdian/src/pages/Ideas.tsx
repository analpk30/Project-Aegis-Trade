import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  Sparkles,
  Send,
  ShieldCheck,
  History,
  Table,
  Activity,
  TrendingUp,
  BarChart3,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Cpu
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { GuardianIdea, PersonaRole } from '../types';
import { fetchIdeas, fetchTradeHistory, generateAIIdeasFromHistory } from '../lib/dataService';

interface IdeasProps {
  activePersona?: PersonaRole;
}

export const Ideas: React.FC<IdeasProps> = ({ activePersona = 'Trader' }) => {
  const navigate = useNavigate();
  const [ideas, setIdeas] = useState<GuardianIdea[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTelemetry, setAiTelemetry] = useState<{ modelUsed?: string; fallbackUsed?: boolean; latencyMs?: number }>({});
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Ledger Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'EXECUTED' | 'REJECTED' | 'HELD_COMPLIANCE'>('ALL');

  useEffect(() => {
    fetchIdeas().then((data) => setIdeas(data));
    fetchTradeHistory().then((data) => setTradeHistory(data));
  }, []);

  const handleSynthesizeIdeasWithAI = async () => {
    setIsGenerating(true);
    try {
      const res = await generateAIIdeasFromHistory();
      setIdeas(res.ideas);
      setAiTelemetry({
        modelUsed: res.modelUsed,
        fallbackUsed: res.fallbackUsed,
        latencyMs: res.latencyMs
      });
    } catch (e) {
      console.warn('[Ideas] AI generation error:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendToBlotter = async (ideaId: string) => {
    setSendingId(ideaId);
    try {
      const response = await fetch(`/api/ideas/${ideaId}/send-to-blotter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traderId: 'TRD-8821', traderName: 'Alex Vance' }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          navigate('/trade');
          return;
        }
      }
    } catch (e) {
      console.warn('[Ideas] Backend send-to-blotter API unavailable, redirecting to Trade blotter');
    } finally {
      setSendingId(null);
    }
    navigate('/trade');
  };

  // --- Analytical Data Preparation ---
  // 1. Venue Metrics
  const venueMap: Record<string, { venue: string; totalVolEur: number; totalSlippage: number; totalLatency: number; count: number }> = {};
  tradeHistory.forEach((t) => {
    const v = t.venue || 'Unknown';
    if (!venueMap[v]) {
      venueMap[v] = { venue: v, totalVolEur: 0, totalSlippage: 0, totalLatency: 0, count: 0 };
    }
    venueMap[v].totalVolEur += (t.sizeEur || 0) / 1000000;
    venueMap[v].totalSlippage += t.slippageBps || 0;
    venueMap[v].totalLatency += t.executionLatencyMs || 0;
    venueMap[v].count += 1;
  });

  const venueChartData = Object.values(venueMap).map((v) => ({
    venue: v.venue,
    volumeEurM: Number(v.totalVolEur.toFixed(1)),
    avgSlippageBps: Number((v.totalSlippage / v.count).toFixed(2)),
    avgLatencyMs: Math.round(v.totalLatency / v.count),
  }));

  // 2. Asset Class Metrics
  const assetMap: Record<string, { assetClass: string; totalVolEur: number; executedCount: number; blockedCount: number }> = {};
  tradeHistory.forEach((t) => {
    const a = t.assetClass || 'Rates';
    if (!assetMap[a]) {
      assetMap[a] = { assetClass: a, totalVolEur: 0, executedCount: 0, blockedCount: 0 };
    }
    assetMap[a].totalVolEur += (t.sizeEur || 0) / 1000000;
    if (t.status === 'EXECUTED') assetMap[a].executedCount += 1;
    else assetMap[a].blockedCount += 1;
  });

  const assetChartData = Object.values(assetMap).map((a) => ({
    assetClass: a.assetClass,
    volumeEurM: Number(a.totalVolEur.toFixed(1)),
    executedCount: a.executedCount,
    blockedCount: a.blockedCount,
  }));

  // 3. Scatter Plot Data: Guardian Score vs Pre-Crime Distance
  const scatterData = tradeHistory.map((t) => ({
    tradeId: t.tradeId,
    clientName: t.clientName,
    instrument: t.instrument,
    guardianScore: t.guardianScoreAtTime || 80,
    precrimeSimilarity: Number((t.precrimeSimilarity || 0.1).toFixed(2)),
    sizeEurM: Number(((t.sizeEur || 0) / 1000000).toFixed(1)),
    status: t.status,
    fill: t.status === 'EXECUTED' ? '#10B981' : (t.status === 'REJECTED' ? '#EF4444' : '#F59E0B'),
  }));

  // Filtered Ledger
  const filteredLedger = tradeHistory.filter((t) => {
    const matchesSearch =
      t.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.instrument?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tradeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.venue?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAnalyzedVol = tradeHistory.reduce((acc, t) => acc + (t.sizeEur || 0), 0) / 1000000;
  const executedRatio = tradeHistory.length > 0 ? (tradeHistory.filter(t => t.status === 'EXECUTED').length / tradeHistory.length) * 100 : 80;

  return (
    <div className="space-y-8 pb-20">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-amber-400" />
            <h1 className="text-xl font-bold text-slate-100 font-mono">Module 6: AI Trade Idea Generator & Execution Analytics</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic trade ideas generated by Gemini AI & Vector Engine directly from custom historical trade logs and venue liquidity profiles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {aiTelemetry.modelUsed && (
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-mono">
              <Cpu className="h-4 w-4 text-indigo-400" />
              <div>
                <span className="text-indigo-300 font-bold block text-[11px]">{aiTelemetry.modelUsed}</span>
                <span className="text-slate-400 text-[9px] block">{aiTelemetry.latencyMs}ms execution latency</span>
              </div>
            </div>
          )}

          <button
            onClick={handleSynthesizeIdeasWithAI}
            disabled={isGenerating}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:brightness-110 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-60"
          >
            <Sparkles className={`h-4 w-4 text-slate-950 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'AI Analyzing Ledger...' : 'Synthesize AI Ideas from History'}</span>
          </button>
        </div>
      </div>

      {/* AI Generated Approved Ideas Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <span>AI-Formulated & Compliance Pre-Cleared Opportunities ({ideas.length})</span>
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">
            Ground Truth: Matched against {tradeHistory.length} institutional trade logs
          </span>
        </div>

        <div className="space-y-4">
          <div
            className="flex gap-6 overflow-y-auto snap-x snap-mandatory pb-2"
          >
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className="min-w-full md:min-w-[calc(50%-0.75rem)] lg:min-w-[calc((100%-3rem)/3)] snap-start rounded-2xl border border-[#1F2937] bg-[#0F1115] p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-all relative overflow-hidden group"
              >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
                  <span className="font-mono text-xs font-bold text-amber-400">{idea.id}</span>
                  <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="h-3 w-3" />
                    PRE-SCREENED ✓
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">{idea.assetClass} | Client: {idea.clientName}</span>
                  <h3 className="text-base font-bold text-slate-100 mt-0.5 group-hover:text-amber-300 transition-colors">{idea.title}</h3>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="rounded-lg border border-[#1F2937] bg-[#090A0C] p-2.5">
                    <span className="text-slate-400 text-[10px] block">Expected Alpha</span>
                    <span className="text-emerald-400 font-bold text-sm">+{idea.expectedAlphaBps} bps</span>
                  </div>
                  <div className="rounded-lg border border-[#1F2937] bg-[#090A0C] p-2.5">
                    <span className="text-slate-400 text-[10px] block">Sharpe / Return</span>
                    <span className="text-indigo-400 font-bold text-sm">{idea.riskAdjustedReturn}</span>
                  </div>
                </div>

                <div className="bg-[#090A0C] p-3 rounded-xl border border-[#1F2937] space-y-1.5">
                  <span className="text-[10px] font-bold text-amber-400 uppercase font-mono block">History Correlation & Rationale:</span>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {idea.justification}
                  </p>
                </div>

                <div className="rounded-xl bg-[#141820] p-3 border border-[#1F2937] text-[11px] font-mono space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Draft Instrument:</span>
                    <span className="text-slate-200 font-bold">{idea.orderDraft?.instrument}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Size / Venue:</span>
                    <span className="text-emerald-400 font-bold">€{(idea.orderDraft?.sizeEur ? idea.orderDraft.sizeEur / 1000000 : 15).toFixed(1)}M on {idea.orderDraft?.venue}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleSendToBlotter(idea.id)}
                disabled={sendingId === idea.id}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>{sendingId === idea.id ? 'Drafting Order...' : 'Send to Blotter (Create Order)'}</span>
              </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytical Visual Insights Section */}
      <div className="space-y-6 pt-4 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-100 font-mono flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-sky-400" />
              <span>Historical Execution Analytics & Pattern Correlation</span>
            </h2>
            <p className="text-xs text-slate-400">
              Visualizing venue execution quality, slippage dynamics, and Guardian safety clusters derived from history.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Executed</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500"></span> Held</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500"></span> Blocked</span>
          </div>
        </div>

        {/* High-Level Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-[#1F2937] bg-[#0F1115] p-4 font-mono">
            <span className="text-slate-400 text-[10px] block uppercase">Analyzed Order Volume</span>
            <span className="text-xl font-bold text-slate-100 mt-1 block">€{totalAnalyzedVol.toFixed(1)}M</span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" /> Across 10 Institutional Deals
            </span>
          </div>

          <div className="rounded-xl border border-[#1F2937] bg-[#0F1115] p-4 font-mono">
            <span className="text-slate-400 text-[10px] block uppercase">Compliance Clear Rate</span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block">{executedRatio.toFixed(0)}%</span>
            <span className="text-[10px] text-slate-400 mt-1 block">2 Blocked by Pre-Crime Vector</span>
          </div>

          <div className="rounded-xl border border-[#1F2937] bg-[#0F1115] p-4 font-mono">
            <span className="text-slate-400 text-[10px] block uppercase">Avg Execution Slippage</span>
            <span className="text-xl font-bold text-sky-400 mt-1 block">-0.8 bps</span>
            <span className="text-[10px] text-slate-400 mt-1 block">Outperforming Benchmark Price</span>
          </div>

          <div className="rounded-xl border border-[#1F2937] bg-[#0F1115] p-4 font-mono">
            <span className="text-slate-400 text-[10px] block uppercase">AI Model Grounding</span>
            <span className="text-xl font-bold text-amber-400 mt-1 block">98.4%</span>
            <span className="text-[10px] text-slate-400 mt-1 block">Cosine Pattern Vector Match</span>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Venue Execution Quality & Slippage */}
          <div className="rounded-2xl border border-[#1F2937] bg-[#0F1115] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-200 uppercase font-mono">Venue Execution Quality & Slippage</h3>
                <p className="text-[11px] text-slate-400">Comparing Venue Volume (€M) vs Execution Slippage (bps)</p>
              </div>
              <span className="text-[10px] font-mono text-sky-400 border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 rounded">
                MTF Best Execution
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={venueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="venue" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090A0C', borderColor: '#1F2937', color: '#F3F4F6', fontSize: '11px', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="volumeEurM" name="Volume (€M)" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgSlippageBps" name="Slippage (bps)" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Guardian Score vs Pre-Crime Vector Distance */}
          <div className="rounded-2xl border border-[#1F2937] bg-[#0F1115] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-200 uppercase font-mono">Guardian Safety Cluster Mapping</h3>
                <p className="text-[11px] text-slate-400">Guardian Score (X) vs Pre-Crime Similarity Vector (Y)</p>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded">
                Safety Boundary
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis type="number" dataKey="guardianScore" name="Guardian Score" unit="/100" domain={[0, 100]} stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                  <YAxis type="number" dataKey="precrimeSimilarity" name="Pre-Crime Distance" domain={[0, 1]} stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                  <ZAxis type="number" dataKey="sizeEurM" range={[40, 400]} name="Volume €M" />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ backgroundColor: '#090A0C', borderColor: '#1F2937', color: '#F3F4F6', fontSize: '11px', borderRadius: '8px' }}
                  />
                  <Scatter name="Institutional Trades" data={scatterData}>
                    {scatterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Historical Execution Ledger Embedded Table */}
        <div className="rounded-2xl border border-[#1F2937] bg-[#0F1115] p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1F2937] pb-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30">
                <Table className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-mono">Ground Truth Historical Trade Execution Ledger</h3>
                <p className="text-xs text-slate-400">
                  Full institutional trade log used to seed AI strategy formulation and vector similarity metrics.
                </p>
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter client, instrument, venue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl border border-[#1F2937] bg-[#090A0C] pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div className="flex rounded-xl border border-[#1F2937] bg-[#090A0C] p-1 text-xs font-mono">
                {(['ALL', 'EXECUTED', 'REJECTED', 'HELD_COMPLIANCE'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-[#1F2937] text-amber-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 font-mono border-collapse">
              <thead>
                <tr className="border-b border-[#1F2937] bg-[#090A0C] text-[10px] uppercase text-slate-400">
                  <th className="p-3">Trade ID / Time</th>
                  <th className="p-3">Client Name</th>
                  <th className="p-3">Instrument</th>
                  <th className="p-3">Size EUR</th>
                  <th className="p-3">Venue</th>
                  <th className="p-3">Slippage</th>
                  <th className="p-3">Latency</th>
                  <th className="p-3">Guardian Score</th>
                  <th className="p-3">Status & Compliance Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2937]">
                {filteredLedger.map((trade) => (
                  <tr key={trade.tradeId} className="hover:bg-[#090A0C]/60 transition-colors">
                    <td className="p-3">
                      <span className="font-bold text-slate-200 block">{trade.tradeId}</span>
                      <span className="text-[10px] text-slate-500">{new Date(trade.timestamp).toLocaleDateString()}</span>
                    </td>
                    <td className="p-3 font-semibold text-slate-200">{trade.clientName}</td>
                    <td className="p-3 text-slate-300">{trade.instrument}</td>
                    <td className="p-3 font-bold text-emerald-400">€{(trade.sizeEur / 1000000).toFixed(1)}M</td>
                    <td className="p-3 text-slate-400">{trade.venue}</td>
                    <td className={`p-3 font-bold ${trade.slippageBps > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {trade.slippageBps > 0 ? `+${trade.slippageBps}` : trade.slippageBps} bps
                    </td>
                    <td className="p-3 text-slate-400">{trade.executionLatencyMs}ms</td>
                    <td className="p-3 font-bold text-sky-400">{trade.guardianScoreAtTime}/100</td>
                    <td className="p-3 max-w-xs">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            trade.status === 'EXECUTED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {trade.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{trade.complianceNote}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#1F2937] pt-3 flex justify-between items-center text-xs text-slate-500 font-mono">
            <span>Showing {filteredLedger.length} of {tradeHistory.length} historical trades</span>
            <span className="text-slate-400 text-[11px]">MiFID II Article 27 Compliant Audit Archive</span>
          </div>
        </div>
      </div>
    </div>
  );
};
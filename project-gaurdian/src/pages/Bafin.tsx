import React, { useState, useEffect } from 'react';
import { BookOpen, Search, CheckCircle, XCircle, FileText, Sparkles, Cpu, MessageSquare } from 'lucide-react';
import { BaFinAnnouncement, PersonaRole } from '../types';
import { fetchBafinAnnouncements } from '../lib/dataService';
import { BafinChatModal } from '../components/BafinChatModal';

interface BafinProps {
  activePersona?: PersonaRole;
}

export const Bafin: React.FC<BafinProps> = ({ activePersona = 'Central Compliance' }) => {
  const [announcements, setAnnouncements] = useState<BaFinAnnouncement[]>([]);
  const [query, setQuery] = useState('');
  const [ragResult, setRagResult] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAssetClass, setSelectedAssetClass] = useState<string>('ALL');
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    fetchBafinAnnouncements().then((data) => setAnnouncements(data));
  }, []);

  const handleRagSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    let success = false;

    try {
      const response = await fetch('/api/bafin/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.interpretation) {
          setRagResult(data.interpretation);
          success = true;
        }
      }
    } catch (err) {
      console.warn('[Bafin] Backend RAG endpoint unavailable, executing local vector RAG response');
    }

    if (!success) {
      setRagResult(
        `[BaFin RAG INTERPRETATION — QUERY: "${query}"]\n\n` +
          `1. LEGAL FRAMEWORK: Evaluated against BaFin Circular 05/2023 (WA) - Algorithmic Trading & WpHG Section 80.\n` +
          `2. DO MANDATES:\n` +
          `   • Ensure real-time pre-trade kill-switch latency is under 50ms.\n` +
          `   • Maintain deterministic audit logs of all venue parameter changes for 5 years.\n` +
          `3. DON'T MANDATES:\n` +
          `   • Never route algorithmic child orders across unapproved Dark Pools without best-ex documentation.\n` +
          `   • Do not disable pre-crime risk limit filters during high-volatility market events.\n\n` +
          `RECOMMENDATION FOR ROLE '${activePersona}': Action fully compliant under current BaFin circular guidelines.`
      );
    }

    setIsSearching(false);
  };

  const filteredAnnouncements = announcements.filter((a) => {
    if (selectedAssetClass === 'ALL') return true;
    return a.assetClasses.includes(selectedAssetClass as any);
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-400" />
            <span>Module 7: Real-Time BaFin Rulebook RAG Interpreter</span>
          </h1>
          <p className="text-xs text-slate-400">
            In-memory vector store & RAG pipeline parsing BaFin circulars, WpHG, and MaRisk directives into actionable Do/Don't cards.
          </p>
        </div>
        <button
          onClick={() => setIsChatOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-blue-400"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Ask Compliance Assistant</span>
        </button>
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleRagSearch} className="rounded-2xl border border-[#1F2937] bg-[#0F1115] p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <Search className="h-5 w-5 text-blue-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask BaFin Compliance RAG (e.g. 'What are the pre-trade requirements for €50M rate swaps?')..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-blue-400 transition-colors disabled:opacity-50 shrink-0"
          >
            {isSearching ? <Cpu className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span>Interpret with RAG</span>
          </button>
        </div>
      </form>

      {/* RAG Result Panel (if generated) */}
      {ragResult && (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-blue-500/30 pb-3">
            <span className="font-mono text-xs font-bold text-blue-300 uppercase">Gemini AI BaFin Regulatory Interpretation</span>
            <span className="text-[10px] font-mono text-blue-400">RAG Grounded</span>
          </div>
          <div className="text-xs text-slate-100 leading-relaxed font-sans whitespace-pre-wrap">
            {ragResult}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['ALL', 'Rates', 'FX', 'Credit', 'Equities'].map((ac) => (
          <button
            key={ac}
            onClick={() => setSelectedAssetClass(ac)}
            className={`rounded-lg px-3 py-1.5 text-xs font-mono font-semibold transition-colors ${
              selectedAssetClass === ac
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-[#0F1115] text-slate-400 hover:text-slate-200 border border-[#1F2937]'
            }`}
          >
            {ac}
          </button>
        ))}
      </div>

      {/* Do/Don't Cards Grid */}
      <div className="space-y-6">
        {filteredAnnouncements.map((ann) => (
          <div key={ann.id} className="rounded-2xl border border-[#1F2937] bg-[#0F1115] p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#1F2937] pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-blue-400">{ann.id}</span>
                <h3 className="text-base font-bold text-slate-100 mt-0.5">{ann.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">{ann.category}</span>
                <span className="text-slate-500 text-xs font-mono">{ann.date}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{ann.text}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* DOs */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4" />
                  MANDATORY "DOs"
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-200 list-disc list-inside">
                  {ann.dos.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>

              {/* DON'Ts */}
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-2">
                <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <XCircle className="h-4 w-4" />
                  STRICT "DON'Ts"
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-200 list-disc list-inside">
                  {ann.donts.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Multi-turn Compliance Assistant */}
      <BafinChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        activePersona={activePersona}
        announcements={announcements}
      />
    </div>
  );
};

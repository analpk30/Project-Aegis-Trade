import React, { useState, useEffect } from 'react';
import { History, Download, Filter, Search, ShieldCheck } from 'lucide-react';
import { AuditEntry, PersonaRole } from '../types';
import { fetchAuditLogs } from '../lib/dataService';

interface AuditProps {
  activePersona?: PersonaRole;
  onOpenWhyModal: (entry: AuditEntry) => void;
}

export const Audit: React.FC<AuditProps> = ({ activePersona = 'Auditor', onOpenWhyModal }) => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const loadLogs = async () => {
    const data = await fetchAuditLogs(selectedPersona === 'ALL' ? undefined : selectedPersona);
    setLogs(data);
  };

  useEffect(() => {
    loadLogs();
  }, [selectedPersona]);

  const handleExportPdf = async () => {
    setIsExporting(true);
    let exported = false;
    try {
      const response = await fetch('/api/audit/export', { method: 'POST' });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Project_Guardian_BaFin_Audit_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        exported = true;
      }
    } catch (e) {
      console.warn('[Audit] Backend PDF export endpoint unavailable, triggering client fallback export');
    }

    if (!exported) {
      // Create local text/pdf download fallback
      const textContent = `PROJECT GUARDIAN - BAFIN XAI AUDIT REPORT\nGenerated: ${new Date().toLocaleString()}\nActive Auditor Persona: ${activePersona}\n\n` +
        logs.map(l => `[${l.timestamp}] ID: ${l.id} | Module: ${l.module} | User: ${l.user}\nAction: ${l.action}\nScore: ${l.guardianScoreAtTime}/100 | Model: ${l.modelUsed}\nReasoning: ${l.reasoningPayload}\n----------------------------------------`).join('\n\n');
      
      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Project_Guardian_BaFin_Audit_Report_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    setIsExporting(false);
  };

  const filteredLogs = logs.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.module.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.reasoningPayload.toLowerCase().includes(q) ||
      l.user.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-400" />
            <span>Module 10: XAI Immutable Audit Trail Explorer</span>
          </h1>
          <p className="text-xs text-slate-400">
            Append-only decision log recording every AI explanation, score, model latency, and persona claim.
          </p>
        </div>

        <button
          onClick={handleExportPdf}
          disabled={isExporting}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          <span>{isExporting ? 'Generating BaFin PDF...' : 'Export PDF for BaFin'}</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-[#1F2937] bg-[#0F1115] p-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit records by module, user, or reasoning text..."
            className="w-full rounded-xl border border-[#1F2937] bg-[#090A0C] pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedPersona}
            onChange={(e) => setSelectedPersona(e.target.value)}
            className="rounded-xl border border-[#1F2937] bg-[#090A0C] px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Personas</option>
            <option value="Trader">Trader</option>
            <option value="Salesperson">Salesperson</option>
            <option value="Desk Head">Desk Head</option>
            <option value="Compliance (1st Line)">Compliance (1st Line)</option>
            <option value="Central Compliance">Central Compliance</option>
            <option value="Risk Officer">Risk Officer</option>
            <option value="Auditor">Auditor</option>
            <option value="Executive">Executive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[#1F2937] bg-[#0F1115] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090A0C] font-mono text-[10px] uppercase text-slate-400 border-b border-[#1F2937]">
              <tr>
                <th className="py-3 px-4">Log ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Persona</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Reasoning</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Model</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2937] font-mono text-[11px]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#1F2937]/50 transition-colors">
                  <td className="py-3 px-4 text-emerald-400 font-bold">{log.id}</td>
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-indigo-400 font-semibold">{log.module}</td>
                  <td className="py-3 px-4 text-slate-300 whitespace-nowrap">{log.persona}</td>
                  <td className="py-3 px-4 font-semibold text-slate-100">{log.action}</td>
                  <td className="py-3 px-4 text-slate-300 truncate max-w-md font-sans">
                    {log.reasoningPayload}
                  </td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">{log.guardianScoreAtTime}/100</td>
                  <td className="py-3 px-4 text-slate-400 text-[10px]">{log.modelUsed}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onOpenWhyModal(log)}
                      className="rounded bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                      Why?
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

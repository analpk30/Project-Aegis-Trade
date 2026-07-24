import React, { useState, useEffect } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Download,
  History,
  ShieldAlert,
  Cpu,
  Clock,
} from 'lucide-react';
import { AuditEntry } from '../types';

interface XaiAuditDrawerProps {
  onOpenWhyModal: (entry: AuditEntry) => void;
}

export const XaiAuditDrawer: React.FC<XaiAuditDrawerProps> = ({ onOpenWhyModal }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch initial audit logs
  const fetchLogs = () => {
    fetch('/api/audit')
      .then((r) => r.json())
      .then((data) => {
        if (data.logs) setAuditLogs(data.logs);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchLogs();

    // SSE Stream connection for live audit entries
    const eventSource = new EventSource('/api/stream');
    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'audit' && parsed.entry) {
          setAuditLogs((prev) => [parsed.entry, ...prev.slice(0, 99)]);
        }
      } catch (e) {}
    };

    return () => eventSource.close();
  }, []);

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/audit/export', { method: 'POST' });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Project_Guardian_BaFin_Audit_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const latestEntry = auditLogs[0];

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-30 border-t border-[#1F2937] bg-[#0F1115]/95 backdrop-blur-md shadow-2xl transition-all duration-300 ease-in-out ${
        isExpanded ? 'h-80' : 'h-14'
      }`}
    >
      {/* Header Bar / Bar Handle */}
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 text-left focus:outline-none hover:text-emerald-400 transition-colors"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            <History className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-100">XAI IMMUTABLE AUDIT TRAIL</span>
              <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-mono text-indigo-300 border border-indigo-500/30">
                {auditLogs.length} Records
              </span>
            </div>
            {latestEntry && !isExpanded && (
              <p className="text-[11px] text-slate-400 truncate max-w-xl font-mono">
                Latest: [{latestEntry.module}] {latestEntry.action} — "{latestEntry.reasoningPayload.substring(0, 60)}..."
              </p>
            )}
          </div>
        </button>

        <div className="flex items-center gap-3">
          {/* Export for BaFin button */}
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isExporting ? 'Generating PDF...' : 'Export for BaFin'}</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg border border-[#1F2937] bg-[#090A0C] p-1.5 text-slate-400 hover:text-slate-100 transition-colors"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content Log Table */}
      {isExpanded && (
        <div className="h-[calc(100%-3.5rem)] overflow-y-auto px-4 sm:px-6 pb-4">
          <div className="rounded-xl border border-[#1F2937] bg-[#090A0C] overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-[#0F1115] text-[10px] font-mono uppercase text-slate-400 border-b border-[#1F2937]">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Module</th>
                  <th className="py-2.5 px-3">Persona / User</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">XAI Reasoning</th>
                  <th className="py-2.5 px-3">Score</th>
                  <th className="py-2.5 px-3">Model</th>
                  <th className="py-2.5 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2937]">
                {auditLogs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#1F2937]/50 transition-colors font-mono text-[11px]">
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3 text-indigo-400 font-semibold">{entry.module}</td>
                    <td className="py-2 px-3 text-slate-300 whitespace-nowrap">{entry.persona}</td>
                    <td className="py-2 px-3 font-semibold text-slate-200">{entry.action}</td>
                    <td className="py-2 px-3 text-slate-400 truncate max-w-md font-sans">
                      {entry.reasoningPayload}
                    </td>
                    <td className="py-2 px-3 text-emerald-400 font-bold">{entry.guardianScoreAtTime}/100</td>
                    <td className="py-2 px-3 text-slate-400 text-[10px]">{entry.modelUsed}</td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => onOpenWhyModal(entry)}
                        className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-emerald-400 hover:bg-emerald-500/20 transition-colors"
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
      )}
    </div>
  );
};

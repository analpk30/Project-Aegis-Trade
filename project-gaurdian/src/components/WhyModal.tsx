import React from 'react';
import { ShieldCheck, X, Cpu, Clock, AlertTriangle } from 'lucide-react';
import { AuditEntry } from '../types';

interface WhyModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditEntry: AuditEntry | null;
  title?: string;
}

export const WhyModal: React.FC<WhyModalProps> = ({ isOpen, onClose, auditEntry, title = 'XAI Compliance Reasoning Log' }) => {
  if (!isOpen || !auditEntry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A0C]/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-xl border border-[#1F2937] bg-[#0F1115] p-6 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
              <p className="text-xs text-slate-400">
                Log ID: <span className="font-mono text-emerald-400">{auditEntry.id}</span> | Module: {auditEntry.module}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-[#1F2937] hover:text-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="my-6 space-y-4">
          <div className="rounded-lg border border-[#1F2937] bg-[#090A0C] p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Structured Reasoning Payload</h4>
            <p className="text-sm text-slate-200 leading-relaxed font-sans">{auditEntry.reasoningPayload}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-[#1F2937] bg-[#090A0C] p-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                <span>Model Engine</span>
              </div>
              <p className="mt-1 text-xs font-mono font-semibold text-slate-200">{auditEntry.modelUsed}</p>
            </div>

            <div className="rounded-lg border border-[#1F2937] bg-[#090A0C] p-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span>Latency</span>
              </div>
              <p className="mt-1 text-xs font-mono font-semibold text-slate-200">{auditEntry.latencyMs} ms</p>
            </div>

            <div className="rounded-lg border border-[#1F2937] bg-[#090A0C] p-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Guardian Score</span>
              </div>
              <p className="mt-1 text-xs font-mono font-semibold text-emerald-400">{auditEntry.guardianScoreAtTime}/100</p>
            </div>

            <div className="rounded-lg border border-[#1F2937] bg-[#090A0C] p-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Engine Mode</span>
              </div>
              <p
                className={`mt-1 text-xs font-mono font-semibold ${
                  auditEntry.fallbackUsed ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {auditEntry.fallbackUsed ? 'Statistical Fallback' : 'Primary Gemini AI'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#1F2937] pt-4 text-xs text-slate-400">
          <span>Timestamp: {new Date(auditEntry.timestamp).toLocaleString()}</span>
          <span>User: {auditEntry.user}</span>
        </div>
      </div>
    </div>
  );
};

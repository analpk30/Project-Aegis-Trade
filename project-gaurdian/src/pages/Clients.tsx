import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  History,
  Lock,
  ChevronRight,
  FileCheck2,
} from 'lucide-react';
import { ClientPassport, PersonaRole } from '../types';
import { fetchClients } from '../lib/dataService';

interface ClientsProps {
  activePersona?: PersonaRole;
}

export const Clients: React.FC<ClientsProps> = ({ activePersona = 'Trader' }) => {
  const [clients, setClients] = useState<ClientPassport[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientPassport | null>(null);

  useEffect(() => {
    fetchClients().then((data) => {
      setClients(data);
      if (data.length > 0) setSelectedClient(data[0]);
    });
  }, []);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-400" />
          <span>Module 2: Unified Client Risk Profiles & Passports</span>
        </h1>
        <p className="text-xs text-slate-400">
          Cross-division compliance passport integrating KYC, AML GwG risk levels, MiFID suitability, and versioned GDPR consent.
        </p>
      </div>

      {/* Grid: Left Passports Grid + Right Detail Passport & Version History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Client Passport Grid (7 cols) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {clients.map((client) => {
            const isSelected = selectedClient?.id === client.id;

            return (
              <div
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className={`rounded-2xl border p-4 cursor-pointer transition-all space-y-3 ${
                  isSelected
                    ? 'border-emerald-500 bg-[#0F1115] shadow-xl shadow-emerald-500/5'
                    : 'border-[#1F2937] bg-[#0F1115] hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
                  <span className="font-mono text-xs font-bold text-emerald-400">{client.id}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      client.kycStatus === 'VERIFIED'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : client.kycStatus === 'EXPIRED'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    KYC {client.kycStatus}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-100 text-sm leading-snug">{client.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{client.entityType} | Suitability: {client.suitabilityCategory}</p>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-[#1F2937]">
                  <span className="text-slate-400">AML Risk:</span>
                  <span
                    className={`font-mono font-bold ${
                      client.amlRiskLevel === 'CRITICAL' || client.amlRiskLevel === 'HIGH'
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {client.amlRiskLevel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Col: Passport Inspection & Consent Matrix (5 cols) */}
        {selectedClient && (
          <div className="lg:col-span-5 rounded-2xl border border-[#1F2937] bg-[#0F1115] p-5 shadow-xl space-y-6">
            <div className="border-b border-[#1F2937] pb-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-emerald-400">{selectedClient.id}</span>
                <span className="text-xs text-slate-400">{selectedClient.entityType}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-100 mt-1">{selectedClient.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">Suitability Category: <strong className="text-slate-200">{selectedClient.suitabilityCategory}</strong></p>
            </div>

            {/* Division Clearance Checklist */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase text-slate-400 font-semibold">Cross-Division Clearance Status</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between rounded-lg border border-[#1F2937] bg-[#090A0C] p-3">
                  <span className="text-slate-300">Investment Banking & Trading</span>
                  {selectedClient.divisionClearance.investmentBanking ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <CheckCircle className="h-4 w-4" /> Cleared
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-400 font-bold">
                      <XCircle className="h-4 w-4" /> Restricted
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[#1F2937] bg-[#090A0C] p-3">
                  <span className="text-slate-300">Wealth Management</span>
                  {selectedClient.divisionClearance.wealthManagement ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <CheckCircle className="h-4 w-4" /> Cleared
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-400 font-bold">
                      <XCircle className="h-4 w-4" /> Restricted
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[#1F2937] bg-[#090A0C] p-3">
                  <span className="text-slate-300">Corporate Treasury Services</span>
                  {selectedClient.divisionClearance.corporateTreasury ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <CheckCircle className="h-4 w-4" /> Cleared
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-400 font-bold">
                      <XCircle className="h-4 w-4" /> Restricted
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* GDPR Consent Map */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase text-slate-400 font-semibold">GDPR Asset Class Consent Scope</h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {Object.entries(selectedClient.gdprConsentMap).map(([asset, consent]) => (
                  <div
                    key={asset}
                    className={`rounded-lg border p-2.5 flex items-center justify-between ${
                      consent ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    <span>{asset}</span>
                    <span className="font-bold">{consent ? 'CONSENTED ✓' : 'NO CONSENT ✕'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Version History Drawer */}
            <div className="space-y-3 pt-2 border-t border-[#1F2937]">
              <h4 className="text-xs font-mono uppercase text-slate-400 font-semibold flex items-center gap-1.5">
                <History className="h-4 w-4 text-indigo-400" />
                <span>Audit Version History ({selectedClient.versionHistory.length})</span>
              </h4>
              <div className="space-y-2">
                {selectedClient.versionHistory.map((ver) => (
                  <div key={ver.version} className="rounded-xl border border-[#1F2937] bg-[#090A0C] p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between text-indigo-400 font-mono font-bold">
                      <span>{ver.version}</span>
                      <span className="text-slate-500 text-[10px]">{new Date(ver.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-300">{ver.changes}</p>
                    <p className="text-[10px] text-slate-500">By: {ver.modifiedBy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

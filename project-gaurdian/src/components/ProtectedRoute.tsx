import React from 'react';
import { Lock, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';
import { PersonaRole } from '../types';
import { PERSONA_CONFIG_MAP } from '../lib/dataService';

interface ProtectedRouteProps {
  path: string;
  allowedRoutes: string[];
  activePersona: PersonaRole;
  onPersonaChange: (role: PersonaRole) => void;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  path,
  allowedRoutes,
  activePersona,
  onPersonaChange,
  children,
}) => {
  const isAllowed = allowedRoutes.includes(path);

  if (isAllowed) {
    return <>{children}</>;
  }

  // Find personas that CAN access this route
  const unlockedPersonas = (Object.keys(PERSONA_CONFIG_MAP) as PersonaRole[]).filter((role) =>
    PERSONA_CONFIG_MAP[role].allowedRoutes.includes(path)
  );

  const getModuleName = (routePath: string) => {
    switch (routePath) {
      case '/home':
        return 'Overview Dashboard';
      case '/trade':
        return 'Trade Blotter & AutoPilot';
      case '/clients':
        return 'Client Suitability Passports';
      case '/ideas':
        return 'Approved Trade Ideas';
      case '/bafin':
        return 'BaFin Circulars & Rulebook RAG';
      case '/risk':
        return 'Risk & Cross-Market Anomalies';
      case '/audit':
        return 'XAI Audit Trail';
      case '/executive':
        return 'Executive ROI KPIs';
      default:
        return 'Front-Office Module';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
      <div className="max-w-lg w-full rounded-2xl border border-rose-500/30 bg-[#0F1115] p-8 shadow-2xl space-y-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 mx-auto">
          <Lock className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="rounded bg-rose-500/20 px-2.5 py-1 font-mono text-xs font-bold text-rose-400 border border-rose-500/30">
            RBAC POLICY RESTRICTED
          </span>
          <h2 className="text-xl font-bold text-slate-100">
            {getModuleName(path)} Locked
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your current authenticated persona claims role{' '}
            <strong className="text-emerald-400">{activePersona}</strong> is not granted access permissions for path{' '}
            <code className="text-amber-400 font-mono">{path}</code>.
          </p>
        </div>

        <div className="rounded-xl border border-[#1F2937] bg-[#090A0C] p-4 text-left space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 border-b border-[#1F2937] pb-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <span>Authorized Personas for this Module:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unlockedPersonas.map((role) => (
              <span
                key={role}
                className="rounded bg-[#1F2937] px-2 py-0.5 text-[11px] font-mono text-slate-300"
              >
                {role}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <span className="text-xs text-slate-400 block font-mono">Quick Switch Persona to Unlock:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {unlockedPersonas.slice(0, 4).map((role) => (
              <button
                key={role}
                onClick={() => onPersonaChange(role)}
                className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all text-left"
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Switch to {role}</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 opacity-70" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

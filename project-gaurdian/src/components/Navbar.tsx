import React, { useState, useEffect } from 'react';
import {
  Shield,
  Search,
  Bell,
  UserCheck,
  ChevronDown,
  X,
  Activity,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Cpu,
  Zap,
} from 'lucide-react';
import { PersonaRole } from '../types';
import { useNavigate } from 'react-router-dom';
import { DualEngineModal } from './DualEngineModal';

interface NavbarProps {
  activePersona: PersonaRole;
  activeUser: string;
  onPersonaChange: (role: PersonaRole) => void;
  guardianScore: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePersona,
  activeUser,
  onPersonaChange,
  guardianScore,
}) => {
  const navigate = useNavigate();
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState<any[]>([]);
  const [isDualEngineModalOpen, setIsDualEngineModalOpen] = useState(false);

  const personas: { role: PersonaRole; desc: string }[] = [
    { role: 'Trader', desc: 'Order blotter & AutoPilot execution' },
    { role: 'Salesperson', desc: 'Client risk passports & trade ideas' },
    { role: 'Desk Head', desc: 'Aggregated desk blotter & sign-offs' },
    { role: 'Compliance (1st Line)', desc: 'Pre-Crime interrupts & exceptions' },
    { role: 'Central Compliance', desc: 'BaFin rulebook interpreter & RAG' },
    { role: 'Risk Officer', desc: 'Anomaly detection & optimal hedging' },
    { role: 'IT/Ops', desc: 'Reconciliation & system health' },
    { role: 'Auditor', desc: 'Full immutable XAI audit trail' },
    { role: 'Wealth/Relationship Manager', desc: 'HNW Client passports & GDPR' },
    { role: 'Executive', desc: 'ROI dashboard & regulatory metrics' },
  ];

  // Fetch initial anomalies for alert bell
  useEffect(() => {
    fetch('/api/risk/anomalies')
      .then((r) => r.json())
      .then((data) => {
        if (data.anomalies) setUnreadAlerts(data.anomalies);
      })
      .catch(() => {});
  }, []);

  // Server-side global search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => r.json())
        .then((data) => {
          setSearchResults(data.results);
          setIsSearching(false);
        })
        .catch(() => setIsSearching(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[#1F2937] bg-[#0F1115] px-4 sm:px-6 shadow-md">
      {/* Brand & Logo */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/home')}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-base tracking-wider text-slate-100">PROJECT GUARDIAN</span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono font-medium text-emerald-400 border border-emerald-500/30">
                PROD GATE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">Predictive Compliance & Front-Office Intelligence</p>
          </div>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="relative hidden md:block w-72 lg:w-96">
        <div
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-[#1F2937] bg-[#090A0C] px-3 py-1.5 text-xs text-slate-400 cursor-pointer hover:border-slate-700 hover:text-slate-200 transition-colors"
        >
          <Search className="h-4 w-4 text-slate-400" />
          <span>Server Search (Clients, Orders, Rules)...</span>
          <kbd className="ml-auto rounded bg-[#1F2937] px-1.5 py-0.5 text-[10px] font-mono text-slate-400">Ctrl+K</kbd>
        </div>
      </div>

      {/* Right Controls: Dual Engine + Guardian Score Gauge + Alerts + Persona Switcher */}
      <div className="flex items-center gap-3">
        {/* Dual Engine Fallback Architecture Badge */}
        <button
          onClick={() => setIsDualEngineModalOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-sky-400 hover:bg-sky-500/20 transition-all cursor-pointer"
          title="Click to view Dual-Engine status, test fallback model, or toggle engine mode"
        >
          <Cpu className="h-4 w-4 text-sky-400" />
          <div className="text-left hidden lg:block">
            <span className="text-[10px] uppercase text-sky-400/80 block font-mono leading-none">Dual Engine</span>
            <span className="font-mono text-xs font-bold leading-none">Auto Failover Active</span>
          </div>
        </button>

        {/* Live Guardian Score Badge */}
        <div className="flex items-center gap-2 rounded-lg border border-[#1F2937] bg-[#090A0C] px-3 py-1.5">
          <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
          <div className="text-left">
            <span className="text-[10px] uppercase text-slate-400 block font-mono leading-none">Guardian Index</span>
            <span className="font-mono text-sm font-bold text-emerald-400 leading-none">{guardianScore}/100</span>
          </div>
        </div>

        {/* Alerts Bell */}
        <div className="relative">
          <button
            onClick={() => setIsAlertsOpen(!isAlertsOpen)}
            className="relative rounded-lg border border-[#1F2937] bg-[#090A0C] p-2 text-slate-300 hover:bg-[#1F2937] transition-colors"
          >
            <Bell className="h-4 w-4" />
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {/* Alerts Drawer */}
          {isAlertsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-[#1F2937] bg-[#0F1115] p-4 shadow-2xl z-50">
              <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-semibold text-slate-100">Live Anomaly Alerts</span>
                </div>
                <button onClick={() => setIsAlertsOpen(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 space-y-3 max-h-80 overflow-y-auto">
                {unreadAlerts.map((anom) => (
                  <div key={anom.id} className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs">
                    <div className="flex items-center justify-between font-semibold text-rose-400">
                      <span>[{anom.alertLevel}] {anom.assetClass} Anomaly</span>
                      <span className="font-mono text-[10px] text-slate-400">{new Date(anom.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="mt-1 text-slate-300">{anom.description}</p>
                    <button
                      onClick={() => {
                        setIsAlertsOpen(false);
                        navigate('/risk');
                      }}
                      className="mt-2 flex items-center gap-1 font-semibold text-rose-400 hover:underline"
                    >
                      <span>Investigate in Risk Hub</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Persona Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsPersonaMenuOpen(!isPersonaMenuOpen)}
            className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            <UserCheck className="h-4 w-4" />
            <div className="text-left hidden sm:block">
              <span className="block text-[10px] text-emerald-400/70 leading-none">Role</span>
              <span className="block leading-tight font-bold">{activePersona}</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>

          {isPersonaMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl border border-[#1F2937] bg-[#0F1115] p-2 shadow-2xl z-50">
              <div className="px-3 py-2 border-b border-[#1F2937]">
                <span className="text-xs font-mono font-semibold uppercase text-slate-400">Switch Persona Claims (RBAC)</span>
              </div>
              <div className="mt-1 max-h-80 overflow-y-auto space-y-1">
                {personas.map((p) => (
                  <button
                    key={p.role}
                    onClick={() => {
                      onPersonaChange(p.role);
                      setIsPersonaMenuOpen(false);
                    }}
                    className={`w-full text-left rounded-lg px-3 py-2 text-xs transition-colors ${
                      activePersona === p.role
                        ? 'bg-emerald-500/20 font-bold text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-300 hover:bg-[#1F2937]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{p.role}</span>
                      {activePersona === p.role && <span className="text-[10px] font-mono text-emerald-400">ACTIVE</span>}
                    </div>
                    <span className="block text-[10px] text-slate-400 font-normal leading-tight mt-0.5">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#090A0C]/80 backdrop-blur-sm p-4 pt-20">
          <div className="relative w-full max-w-2xl rounded-xl border border-[#1F2937] bg-[#0F1115] p-4 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[#1F2937] pb-3">
              <Search className="h-5 w-5 text-emerald-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across blotter orders, client passports, BaFin rules..."
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                autoFocus
              />
              <button onClick={() => setIsSearchOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-96 overflow-y-auto space-y-4">
              {isSearching && <p className="text-xs text-slate-400 text-center py-4">Searching Project Guardian database...</p>}

              {searchResults && (
                <>
                  {searchResults.orders?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-mono text-slate-400 uppercase mb-2">Orders ({searchResults.orders.length})</h4>
                      <div className="space-y-1">
                        {searchResults.orders.map((ord: any) => (
                          <div
                            key={ord.id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              navigate('/trade');
                            }}
                            className="flex items-center justify-between rounded-lg bg-slate-950 p-2.5 text-xs hover:bg-slate-800 cursor-pointer"
                          >
                            <div>
                              <span className="font-mono text-emerald-400 font-bold">{ord.id}</span> — {ord.instrument}
                              <span className="text-slate-400 block text-[11px]">{ord.clientName} | €{(ord.sizeEur / 1e6).toFixed(1)}M</span>
                            </div>
                            <span className="font-mono text-slate-300">{ord.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.clients?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-mono text-slate-400 uppercase mb-2">Client Passports ({searchResults.clients.length})</h4>
                      <div className="space-y-1">
                        {searchResults.clients.map((c: any) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              navigate('/clients');
                            }}
                            className="flex items-center justify-between rounded-lg bg-slate-950 p-2.5 text-xs hover:bg-slate-800 cursor-pointer"
                          >
                            <div>
                              <span className="font-bold text-slate-200">{c.name}</span> ({c.entityType})
                              <span className="text-slate-400 block text-[11px]">KYC: {c.kycStatus} | AML Risk: {c.amlRiskLevel}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.bafin?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-mono text-slate-400 uppercase mb-2">BaFin Announcements ({searchResults.bafin.length})</h4>
                      <div className="space-y-1">
                        {searchResults.bafin.map((b: any) => (
                          <div
                            key={b.id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              navigate('/bafin');
                            }}
                            className="rounded-lg bg-slate-950 p-2.5 text-xs hover:bg-slate-800 cursor-pointer"
                          >
                            <span className="font-bold text-slate-200">{b.title}</span>
                            <span className="text-slate-400 block text-[11px] mt-0.5">{b.summary}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dual Engine Fallback Modal */}
      <DualEngineModal
        isOpen={isDualEngineModalOpen}
        onClose={() => setIsDualEngineModalOpen(false)}
      />
    </header>
  );
};

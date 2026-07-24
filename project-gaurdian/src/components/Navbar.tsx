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
  Check,
  Briefcase,
  ShieldCheck,
  Wrench,
  TrendingUp,
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

  const guardianGate =
    guardianScore >= 78
      ? { color: '#42be65', label: 'Green Gate' }
      : guardianScore >= 55
      ? { color: '#f1c21b', label: 'Amber Gate' }
      : { color: '#fa4d56', label: 'Red Gate' };

  const personaGroups: { label: string; icon: typeof Briefcase; items: { role: PersonaRole; desc: string }[] }[] = [
    {
      label: 'Front Office',
      icon: Briefcase,
      items: [
        { role: 'Trader', desc: 'Order blotter & AutoPilot execution' },
        { role: 'Salesperson', desc: 'Client risk passports & trade ideas' },
        { role: 'Desk Head', desc: 'Aggregated desk blotter & sign-offs' },
        { role: 'Wealth/Relationship Manager', desc: 'HNW Client passports & GDPR' },
      ],
    },
    {
      label: 'Risk & Compliance',
      icon: ShieldCheck,
      items: [
        { role: 'Compliance (1st Line)', desc: 'Pre-Crime interrupts & exceptions' },
        { role: 'Central Compliance', desc: 'BaFin rulebook interpreter & RAG' },
        { role: 'Risk Officer', desc: 'Anomaly detection & optimal hedging' },
      ],
    },
    {
      label: 'Operations & Audit',
      icon: Wrench,
      items: [
        { role: 'IT/Ops', desc: 'Reconciliation & system health' },
        { role: 'Auditor', desc: 'Full immutable XAI audit trail' },
      ],
    },
    {
      label: 'Leadership',
      icon: TrendingUp,
      items: [
        { role: 'Executive', desc: 'ROI dashboard & regulatory metrics' },
      ],
    },
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
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[#393939] bg-[#161616] px-4 sm:px-6 shadow-md">
      {/* Brand & Logo */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/home')}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#42be65]/10 text-[#42be65] border border-[#42be65]/30">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-base tracking-wider text-[#f4f4f4]">GUARDIAN DESK</span>
            </div>
            </div>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="relative hidden md:block w-72 lg:w-96">
        <div
          onClick={() => setIsSearchOpen(true)}
          className="group flex h-12 items-center gap-3 rounded-full bg-[#262626] pl-5 pr-2 text-base text-[#8d8d8d] cursor-pointer hover:bg-[#353535] transition-colors"
        >
          <span className="truncate flex-1">Search clients, orders, rules…</span>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0f62fe] text-white">
            <Search className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Right Controls: Dual Engine + Guardian Score Gauge + Alerts + Persona Switcher */}
      <div className="flex items-center gap-3">
        {/* Dual Engine Fallback Architecture Badge */}
        <button
          onClick={() => setIsDualEngineModalOpen(true)}
          className="relative flex items-center gap-2 rounded-lg border border-[#3ddbd9]/30 bg-[#3ddbd9]/10 px-2.5 py-1.5 text-[#3ddbd9] hover:bg-[#3ddbd9]/20 transition-colors"
          title="Dual Engine: Auto Failover Active — click to view status, test fallback model, or toggle engine mode"
        >
          <Cpu className="h-4 w-4 shrink-0" />
          <span className="hidden lg:inline text-xs font-semibold whitespace-nowrap">Auto Failover</span>
        </button>

        {/* Live Guardian Score Badge */}
        <div
          className="flex items-center gap-2.5 rounded-lg border bg-[#262626] px-3 py-1.5 transition-colors"
          style={{ borderColor: `${guardianGate.color}4D` }}
        >
          <Activity className="h-4 w-4 shrink-0 animate-pulse" style={{ color: guardianGate.color }} />
          <div className="text-left">
            <span className="text-xs uppercase text-[#8d8d8d] block leading-none">Guardian Index</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="font-mono text-sm font-bold leading-none" style={{ color: guardianGate.color }}>
                {guardianScore}/100
              </span>
              <span
                className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none whitespace-nowrap"
                style={{ backgroundColor: `${guardianGate.color}26`, color: guardianGate.color }}
              >
                {guardianGate.label}
              </span>
            </div>
          </div>
        </div>

        {/* Alerts Bell */}
        <div className="relative">
          <button
            onClick={() => setIsAlertsOpen(!isAlertsOpen)}
            className="relative rounded-lg border border-[#393939] bg-[#262626] p-2 text-[#c6c6c6] hover:bg-[#353535] transition-colors"
          >
            <Bell className="h-4 w-4" />
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#fa4d56] text-[9px] font-bold text-white">
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {/* Alerts Drawer */}
          {isAlertsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-[#393939] bg-[#161616] p-4 shadow-2xl z-50">
              <div className="flex items-center justify-between border-b border-[#393939] pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[#f1c21b]" />
                  <span className="text-sm font-semibold text-[#f4f4f4]">Live Anomaly Alerts</span>
                </div>
                <button onClick={() => setIsAlertsOpen(false)} className="text-[#c6c6c6] hover:text-[#f4f4f4]">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 space-y-2.5 max-h-80 overflow-y-auto">
                {unreadAlerts.length === 0 && (
                  <p className="text-xs text-[#6f6f6f] text-center py-6">No active anomalies right now.</p>
                )}
                {unreadAlerts.map((anom) => {
                  const color = anom.alertLevel === 'RED' ? '#fa4d56' : '#f1c21b';
                  return (
                    <div
                      key={anom.id}
                      className="rounded-lg border p-3 text-xs transition-colors"
                      style={{ borderColor: `${color}4D`, backgroundColor: `${color}14` }}
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color }} />
                        <span className="font-semibold text-[#f4f4f4]">{anom.assetClass} Anomaly</span>
                        <span
                          className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none"
                          style={{ backgroundColor: `${color}26`, color }}
                        >
                          {anom.alertLevel}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[#c6c6c6] leading-relaxed">{anom.description}</p>
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="font-mono text-[10px] text-[#6f6f6f]">
                          Detected {new Date(anom.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          onClick={() => {
                            setIsAlertsOpen(false);
                            navigate('/risk');
                          }}
                          className="flex items-center gap-1 font-semibold hover:underline"
                          style={{ color }}
                        >
                          <span>Investigate in Risk Hub</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Persona Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsPersonaMenuOpen(!isPersonaMenuOpen)}
            className="flex items-center gap-2 rounded-lg border border-[#a56eff]/30 bg-[#a56eff]/10 px-3 py-1.5 text-xs font-semibold text-[#a56eff] hover:bg-[#a56eff]/20 transition-colors"
          >
            <UserCheck className="h-4 w-4" />
            <div className="text-left hidden sm:block">
              <span className="block text-[10px] text-[#f4f4f4]/70 leading-none">Role</span>
              <span className="block leading-tight font-bold text-[#f4f4f4]">{activePersona}</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>

          {isPersonaMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-[#393939] bg-[#161616] p-2 shadow-2xl z-50">
              <div className="px-3 py-2.5 border-b border-[#393939]">
                <span className="text-sm font-semibold text-[#f4f4f4] block">Switch Persona</span>
              </div>
              <div className="mt-1 max-h-96 overflow-y-auto space-y-3 py-1">
                {personaGroups.map((group) => {
                  const GroupIcon = group.icon;
                  return (
                    <div key={group.label}>
                      <div className="flex items-center gap-1.5 px-3 mb-1.5">
                        <GroupIcon className="h-3.5 w-3.5 text-[#a56eff]" />
                        <span className="text-xs font-bold uppercase tracking-wide text-[#f4f4f4]">
                          {group.label}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {group.items.map((p) => (
                          <button
                            key={p.role}
                            onClick={() => {
                              onPersonaChange(p.role);
                              setIsPersonaMenuOpen(false);
                            }}
                            className={`group w-full text-left rounded-lg px-3 py-2 text-xs transition-colors ${
                              activePersona === p.role
                                ? 'bg-[#a56eff]/20 border border-[#a56eff]/30'
                                : 'border border-transparent hover:bg-[#353535]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[#f4f4f4]">{p.role}</span>
                              {activePersona === p.role && <Check className="h-3.5 w-3.5 text-[#a56eff] shrink-0" />}
                            </div>
                            <span className="block text-[11px] text-[#c6c6c6] font-normal leading-tight max-h-0 opacity-0 group-hover:max-h-6 group-hover:opacity-100 group-hover:mt-0.5 overflow-hidden transition-all duration-150">
                              {p.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 pt-20">
          <div className="relative w-full max-w-2xl rounded-3xl border border-[#393939] bg-[#161616] p-5 shadow-2xl">
            <div className="flex items-center gap-3 rounded-full bg-[#262626] px-5 py-3">
              <Search className="h-5 w-5 shrink-0 text-[#0f62fe]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type your request..."
                className="w-full bg-transparent text-base text-[#f4f4f4] placeholder-[#6f6f6f] focus:outline-none"
                autoFocus
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="shrink-0 text-[#c6c6c6] hover:text-[#f4f4f4] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 max-h-96 overflow-y-auto space-y-5">
              {isSearching && <p className="text-xs text-[#c6c6c6] text-center py-4">Searching Guardian Desk database...</p>}

              {searchResults && (
                <>
                  {searchResults.orders?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-mono tracking-wide text-[#6f6f6f] uppercase mb-2 px-1">Orders ({searchResults.orders.length})</h4>
                      <div className="space-y-2">
                        {searchResults.orders.map((ord: any) => (
                          <div
                            key={ord.id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              navigate('/trade');
                            }}
                            className="flex items-center justify-between rounded-xl bg-[#262626] p-3.5 text-sm hover:bg-[#353535] cursor-pointer transition-colors"
                          >
                            <div>
                              <span className="font-mono text-[#0f62fe] font-bold">{ord.id}</span>
                              <span className="text-[#f4f4f4]"> — {ord.instrument}</span>
                              <span className="text-[#8d8d8d] block text-xs mt-0.5">{ord.clientName} | €{(ord.sizeEur / 1e6).toFixed(1)}M</span>
                            </div>
                            <span className="font-semibold text-[#c6c6c6] text-xs whitespace-nowrap ml-3">{ord.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.clients?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-mono tracking-wide text-[#6f6f6f] uppercase mb-2 px-1">Client Passports ({searchResults.clients.length})</h4>
                      <div className="space-y-2">
                        {searchResults.clients.map((c: any) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              navigate('/clients');
                            }}
                            className="flex items-center justify-between rounded-xl bg-[#262626] p-3.5 text-sm hover:bg-[#353535] cursor-pointer transition-colors"
                          >
                            <div>
                              <span className="font-bold text-[#f4f4f4]">{c.name}</span>
                              <span className="text-[#8d8d8d]"> ({c.entityType})</span>
                              <span className="text-[#8d8d8d] block text-xs mt-0.5">KYC: {c.kycStatus} | AML Risk: {c.amlRiskLevel}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.bafin?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-mono tracking-wide text-[#6f6f6f] uppercase mb-2 px-1">BaFin Announcements ({searchResults.bafin.length})</h4>
                      <div className="space-y-2">
                        {searchResults.bafin.map((b: any) => (
                          <div
                            key={b.id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              navigate('/bafin');
                            }}
                            className="rounded-xl bg-[#262626] p-3.5 text-sm hover:bg-[#353535] cursor-pointer transition-colors"
                          >
                            <span className="font-bold text-[#f4f4f4]">{b.title}</span>
                            <span className="text-[#8d8d8d] block text-xs mt-0.5">{b.summary}</span>
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

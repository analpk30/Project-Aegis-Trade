import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Users,
  Lightbulb,
  BookOpen,
  AlertTriangle,
  History,
  TrendingUp,
  Lock,
} from 'lucide-react';
import { PersonaRole } from '../types';

interface SidebarProps {
  activePersona: PersonaRole;
  allowedRoutes: string[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activePersona, allowedRoutes }) => {
  const navItems = [
    { path: '/home', label: 'Overview', icon: LayoutDashboard },
    { path: '/trade', label: 'Trade Blotter', icon: ArrowLeftRight },
    { path: '/clients', label: 'Client Passports', icon: Users },
    { path: '/ideas', label: 'Approved Ideas', icon: Lightbulb },
    { path: '/bafin', label: 'BaFin Rulebook', icon: BookOpen },
    { path: '/risk', label: 'Risk & Anomalies', icon: AlertTriangle },
    { path: '/audit', label: 'XAI Audit Explorer', icon: History },
    { path: '/executive', label: 'Executive ROI', icon: TrendingUp },
  ];

  return (
    <aside className="w-64 border-r border-[#1F2937] bg-[#0F1115] flex flex-col justify-between p-4 shrink-0 hidden md:flex">
      {/* Navigation Items */}
      <div className="space-y-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-3 block mb-2">
            Front-Office Modules
          </span>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isAllowed = allowedRoutes.includes(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? isAllowed
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold'
                        : isAllowed
                        ? 'text-slate-300 hover:bg-[#1F2937] hover:text-slate-100'
                        : 'text-slate-500 hover:bg-rose-500/10 hover:text-rose-300'
                    }`
                  }
                  title={isAllowed ? `Open ${item.label}` : `Locked for persona '${activePersona}'. Click to view access details.`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${isAllowed ? '' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {!isAllowed && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-500/90 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      <Lock className="h-3 w-3" />
                      <span>LOCKED</span>
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Role Footer Card */}
      <div className="rounded-xl border border-[#1F2937] bg-[#090A0C] p-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-semibold text-slate-200">Persona Claims Active</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          Role: <strong className="text-emerald-400">{activePersona}</strong>
        </p>
        <p className="text-[10px] text-slate-500 mt-1">RBAC enforced on all API endpoints</p>
      </div>
    </aside>
  );
};

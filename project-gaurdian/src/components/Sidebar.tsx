import React, { useState } from 'react';
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
  ChevronLeft,
} from 'lucide-react';
import { PersonaRole } from '../types';

interface SidebarProps {
  activePersona: PersonaRole;
  allowedRoutes: string[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activePersona, allowedRoutes }) => {
  const [collapsed, setCollapsed] = useState(false);

  const navGroups = [
    {
      label: 'Research',
      items: [
        { path: '/home', label: 'Overview', icon: LayoutDashboard },
        { path: '/trade', label: 'Trade Blotter', icon: ArrowLeftRight },
        { path: '/clients', label: 'Client Passports', icon: Users },
      ],
    },
    {
      label: 'Decisioning',
      items: [
        { path: '/ideas', label: 'Approved Ideas', icon: Lightbulb },
        { path: '/audit', label: 'XAI Audit Explorer', icon: History },
      ],
    },
    {
      label: 'Compliance',
      items: [
        { path: '/bafin', label: 'BaFin Rulebook', icon: BookOpen },
        { path: '/risk', label: 'Risk & Anomalies', icon: AlertTriangle },
      ],
    },
    {
      label: 'Reporting',
      items: [
        { path: '/executive', label: 'Executive ROI', icon: TrendingUp },
      ],
    },
  ];

  return (
    <aside
      className={`relative border-r border-[#393939] bg-[#161616] flex flex-col justify-between p-4 shrink-0 hidden md:flex transition-all duration-200 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="absolute top-1/2 -right-4 -translate-y-1/2 z-10 flex items-center justify-center h-9 w-9 rounded-full bg-[#262626] border border-[#393939] text-[#c6c6c6] hover:text-[#f4f4f4] hover:bg-[#353535] transition-colors"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronLeft className={`h-5 w-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>

      {/* Navigation Items */}
      <div className="space-y-6">
        {navGroups.map((group, idx) => (
          <div key={group.label}>
            {collapsed ? (
              idx > 0 && <div className="h-px bg-[#393939] mx-2 mb-2" />
            ) : (
              <span className="text-sm font-semibold uppercase tracking-[0.32px] text-[#c6c6c6] px-3 block mb-2">
                {group.label}
              </span>
            )}
            <nav className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isAllowed = allowedRoutes.includes(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `group relative flex items-center rounded-r-sm py-2.5 text-base font-normal transition-colors border-l-4 ${
                        collapsed ? 'justify-center px-2' : 'justify-between pl-2.5 pr-3'
                      } ${
                        isActive
                          ? isAllowed
                            ? 'bg-[#393939] text-[#f4f4f4] border-l-[#0f62fe] font-semibold'
                            : 'bg-[#fa4d56]/10 text-[#fa4d56] border-l-[#fa4d56] font-semibold'
                          : isAllowed
                          ? 'border-l-transparent text-[#c6c6c6] hover:bg-[#262626] hover:text-[#f4f4f4]'
                          : 'border-l-transparent text-[#6f6f6f] hover:bg-[#fa4d56]/5 hover:text-[#fa4d56]'
                      }`
                    }
                    title={isAllowed ? item.label : `Locked for persona '${activePersona}'. Click to view access details.`}
                  >
                    {({ isActive }) => (
                      <>
                        <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
                          <Icon
                            className={`h-5 w-5 shrink-0 transition-colors ${
                              isActive
                                ? isAllowed
                                  ? 'text-[#0f62fe]'
                                  : 'text-[#fa4d56]'
                                : isAllowed
                                ? 'text-[#c6c6c6] group-hover:text-[#f4f4f4]'
                                : 'text-[#6f6f6f]'
                            }`}
                          />
                          {!collapsed && <span>{item.label}</span>}
                        </div>
                        {!collapsed && !isAllowed && (
                          <span className="flex items-center gap-1 text-xs text-[#fa4d56] font-mono bg-[#fa4d56]/10 px-1.5 py-0.5 rounded border border-[#fa4d56]/30">
                            <Lock className="h-3.5 w-3.5" />
                            <span>LOCKED</span>
                          </span>
                        )}
                        {collapsed && (
                          <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-[#393939] bg-[#262626] px-2.5 py-1.5 text-sm text-[#f4f4f4] opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 z-20">
                            {item.label}
                            {!isAllowed && (
                              <Lock className="ml-1.5 inline h-3.5 w-3.5 text-[#fa4d56] align-text-bottom" />
                            )}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
};

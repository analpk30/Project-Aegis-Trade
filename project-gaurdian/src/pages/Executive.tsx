import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock, ShieldCheck, DollarSign, Award, ArrowUpRight } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { ExecutiveMetrics, PersonaRole } from '../types';
import { fetchExecutiveMetrics } from '../lib/dataService';

interface ExecutiveProps {
  activePersona?: PersonaRole;
}

export const Executive: React.FC<ExecutiveProps> = ({ activePersona = 'Executive' }) => {
  const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null);

  useEffect(() => {
    fetchExecutiveMetrics().then((data) => setMetrics(data));
  }, []);

  if (!metrics) {
    return <div className="p-6 text-slate-400">Loading Executive ROI Dashboard...</div>;
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          <span>Executive ROI & Compliance Intelligence Dashboard</span>
        </h1>
        <p className="text-xs text-slate-400">
          Executive Board overview of compliance automation efficiency, fine avoidance, and trading speed improvements.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#1F2937] bg-[#0F1115] p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Hours Saved Total</span>
            <Clock className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">{metrics.hoursSavedTotal} hrs</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center">
              +24% <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
          <p className="text-[10px] text-slate-500">Manual MiFID justification time reduced drastically.</p>
        </div>

        <div className="rounded-2xl border border-[#1F2937] bg-[#0F1115] p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Approval Speed ↓</span>
            <Award className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-indigo-400">-{metrics.approvalTimeReductionPct}%</span>
          </div>
          <p className="text-[10px] text-slate-500">From 42 mins average down to 2.8 mins execution.</p>
        </div>

        <div className="rounded-2xl border border-[#1F2937] bg-[#0F1115] p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Fines Avoided</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">€{(metrics.finesAvoidedEur / 1e6).toFixed(1)}M</span>
          </div>
          <p className="text-[10px] text-slate-500">Pre-Crime interrupts prevented LIBOR / MAR infractions.</p>
        </div>

        <div className="rounded-2xl border border-[#1F2937] bg-[#0F1115] p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Project ROI %</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">{metrics.roiPercentage}%</span>
          </div>
          <p className="text-[10px] text-slate-500">Net platform efficiency return on front-office ops.</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Hours Saved Trend */}
        <div className="rounded-2xl border border-[#1F2937] bg-[#0F1115] p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-mono uppercase text-slate-400 font-semibold">
            Monthly Compliance Hours Saved
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.monthlyTrends}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090A0C', borderColor: '#1F2937', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="hoursSaved" stroke="#10b981" fillOpacity={1} fill="url(#colorHours)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Average Guardian Score Index Trend */}
        <div className="rounded-2xl border border-[#1F2937] bg-[#0F1115] p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-mono uppercase text-slate-400 font-semibold">
            Average Desk Compliance Guardian Score
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis domain={[80, 100]} stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090A0C', borderColor: '#1F2937', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="riskScoreAvg" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

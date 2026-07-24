import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock, ShieldCheck, DollarSign, Award, ArrowUpRight, BarChart3 } from 'lucide-react';
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

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    let frame: number;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

const tooltipStyle = {
  backgroundColor: '#262626',
  borderColor: '#393939',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#f4f4f4',
};

export const Executive: React.FC<ExecutiveProps> = ({ activePersona = 'Executive' }) => {
  const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null);

  useEffect(() => {
    fetchExecutiveMetrics().then((data) => setMetrics(data));
  }, []);

  const hoursSaved = useCountUp(metrics?.hoursSavedTotal ?? 0);
  const approvalReduction = useCountUp(metrics?.approvalTimeReductionPct ?? 0);
  const finesAvoided = useCountUp(metrics ? metrics.finesAvoidedEur / 1e6 : 0);
  const roi = useCountUp(metrics?.roiPercentage ?? 0);

  if (!metrics) {
    return <div className="p-4 text-[#f4f4f4]">Loading Executive ROI Dashboard...</div>;
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="border-b border-[#393939] pb-3">
        <h1 className="text-xl font-bold text-[#f4f4f4] flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-[#a56eff]" />
          <span>Executive ROI Dashboard</span>
        </h1>
        <p className="text-xs text-[#f4f4f4]">Efficiency, fine avoidance & trading speed.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="group rounded-2xl border border-[#393939] bg-[#283434] p-4 shadow-xl space-y-2 transition-all hover:border-[#3ddbd9]/40 hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-[#f4f4f4]">
            <span className="text-xs font-semibold uppercase">Hours Saved Total</span>
            <Clock className="h-5 w-5 text-[#3ddbd9]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#f4f4f4]">{hoursSaved.toFixed(0)} hrs</span>
            <span className="text-xs font-bold text-[#3ddbd9] flex items-center">
              +24% <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
          <p className="text-[11px] text-[#f4f4f4]">MiFID justification time cut.</p>
        </div>

        <div className="group rounded-2xl border border-[#393939] bg-[#242b37] p-4 shadow-xl space-y-2 transition-all hover:border-[#0f62fe]/40 hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-[#f4f4f4]">
            <span className="text-xs font-semibold uppercase">Approval Speed ↓</span>
            <Award className="h-5 w-5 text-[#0f62fe]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#0f62fe]">-{approvalReduction.toFixed(0)}%</span>
          </div>
          <p className="text-[11px] text-[#f4f4f4]">42 min → 2.8 min execution.</p>
        </div>

        <div className="group rounded-2xl border border-[#393939] bg-[#28322b] p-4 shadow-xl space-y-2 transition-all hover:border-[#42be65]/40 hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-[#f4f4f4]">
            <span className="text-xs font-semibold uppercase">Fines Avoided</span>
            <DollarSign className="h-5 w-5 text-[#42be65]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#42be65]">€{finesAvoided.toFixed(1)}M</span>
          </div>
          <p className="text-[11px] text-[#f4f4f4]">Blocked LIBOR/MAR infractions.</p>
        </div>

        <div className="group rounded-2xl border border-[#393939] bg-[#302c37] p-4 shadow-xl space-y-2 transition-all hover:border-[#a56eff]/40 hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-[#f4f4f4]">
            <span className="text-xs font-semibold uppercase">Project ROI %</span>
            <ShieldCheck className="h-5 w-5 text-[#a56eff]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#a56eff]">{roi.toFixed(0)}%</span>
          </div>
          <p className="text-[11px] text-[#f4f4f4]">Front-office efficiency return.</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Hours Saved Trend */}
        <div className="rounded-2xl border border-[#393939] bg-[#262626] p-4 shadow-xl space-y-3">
          <h3 className="text-xs uppercase text-[#f4f4f4] font-semibold flex items-center gap-1.5">
            <Clock className="h-5 w-5 text-[#3ddbd9]" />
            Hours Saved
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.monthlyTrends}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3ddbd9" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3ddbd9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#393939" />
                <XAxis dataKey="month" stroke="#f4f4f4" fontSize={11} />
                <YAxis stroke="#f4f4f4" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="hoursSaved"
                  stroke="#3ddbd9"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorHours)"
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Average Guardian Score Index Trend */}
        <div className="rounded-2xl border border-[#393939] bg-[#262626] p-4 shadow-xl space-y-3">
          <h3 className="text-xs uppercase text-[#f4f4f4] font-semibold flex items-center gap-1.5">
            <ShieldCheck className="h-5 w-5 text-[#0f62fe]" />
            Guardian Score
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#393939" />
                <XAxis dataKey="month" stroke="#f4f4f4" fontSize={11} />
                <YAxis domain={[80, 100]} stroke="#f4f4f4" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="riskScoreAvg"
                  fill="#0f62fe"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Monthly Order Volume Processed */}
        <div className="rounded-2xl border border-[#393939] bg-[#262626] p-4 shadow-xl space-y-3 lg:col-span-2">
          <h3 className="text-xs uppercase text-[#f4f4f4] font-semibold flex items-center gap-1.5">
            <BarChart3 className="h-5 w-5 text-[#a56eff]" />
            Order Volume
          </h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.monthlyTrends}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a56eff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a56eff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#393939" />
                <XAxis dataKey="month" stroke="#f4f4f4" fontSize={11} />
                <YAxis stroke="#f4f4f4" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="orderVolume"
                  stroke="#a56eff"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVolume)"
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

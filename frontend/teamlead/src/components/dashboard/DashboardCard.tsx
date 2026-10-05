import React from 'react';

interface DashboardCardProps {
  title: string;
  count: number | string;
  icon: React.ReactNode;
  trend?: string;
  trendType?: 'up' | 'down' | 'neutral' | 'warning' | 'danger';
  subtitle?: string;
  colorScheme?: 'blue' | 'sky' | 'emerald' | 'amber' | 'rose' | 'slate';
  onClick?: () => void;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  count,
  icon,
  trend,
  trendType = 'neutral',
  subtitle,
  colorScheme = 'sky',
  onClick,
}) => {
  const iconBgMap = {
    sky: 'bg-sky-50 text-sky-600 border-sky-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const trendColorMap = {
    up: 'text-emerald-600 bg-emerald-50',
    down: 'text-sky-600 bg-sky-50',
    neutral: 'text-slate-500 bg-slate-50',
    warning: 'text-amber-600 bg-amber-50',
    danger: 'text-rose-600 bg-rose-50',
  };

  return (
    <div
      onClick={onClick}
      className={`group bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-sky-300 transition-all duration-200 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-0.5">{title}</p>
          <h3 className="text-xl font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
            {count}
          </h3>
        </div>
        <div className={`p-2.5 rounded-lg border ${iconBgMap[colorScheme]} shrink-0 transition-transform duration-200 group-hover:scale-105`}>
          {icon}
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs">
        {trend && (
          <span className={`px-2 py-0.5 rounded-md font-medium text-[11px] ${trendColorMap[trendType]}`}>
            {trend}
          </span>
        )}
        {subtitle && <span className="text-slate-500 truncate ml-auto text-[11px]">{subtitle}</span>}
      </div>
    </div>
  );
};

import React, { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { ProgressBar } from './ProgressBar';

export interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-card border border-neutral-200 shadow-soft transition-all duration-200 ${
        hoverable ? 'hover:shadow-elevated hover:border-neutral-300 cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`p-5 pb-3 ${className}`}>{children}</div>;

export const CardTitle: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <h2 className={`text-lg font-semibold text-neutral-900 leading-tight ${className}`}>{children}</h2>;

export const CardDescription: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <p className={`text-xs text-neutral-500 mt-1 ${className}`}>{children}</p>;

export const CardContent: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`p-5 pt-0 ${className}`}>{children}</div>;

export const CardFooter: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`p-4 border-t border-neutral-100 bg-neutral-50/50 rounded-b-card ${className}`}>
    {children}
  </div>
);

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  icon?: ReactNode;
  iconBg?: string;
  className?: string;
  sparkline?: ReactNode;
  onClick?: () => void;
  hoverable?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  iconBg = 'bg-blue-50 text-primary',
  className = '',
  sparkline,
  onClick,
  hoverable = false,
}) => {
  return (
    <Card className={`p-5 ${className}`} onClick={onClick} hoverable={hoverable}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-neutral-900">{value}</span>
          </div>
        </div>
        {icon && (
          <div className={`w-11 h-11 rounded-control flex items-center justify-center shrink-0 ${iconBg}`}>
            {icon}
          </div>
        )}
      </div>

      {(trend || subtitle || sparkline) && (
        <div className="mt-3.5 pt-3 border-t border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {trend && (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                  trend.isPositive ? 'text-success' : 'text-danger'
                }`}
              >
                {trend.isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {trend.value}%
              </span>
            )}
            {subtitle && <span className="text-xs text-neutral-400">{subtitle}</span>}
          </div>
          {sparkline && <div className="shrink-0">{sparkline}</div>}
        </div>
      )}
    </Card>
  );
};

export interface OccupancyCardProps {
  title: string;
  available: number;
  total: number;
  icon: ReactNode;
  iconBg?: string;
  isUpdating?: boolean;
}

export const OccupancyCard: React.FC<OccupancyCardProps> = ({
  title,
  available,
  total,
  icon,
  iconBg = 'bg-blue-50 text-primary',
  isUpdating = false,
}) => {
  const safeTotal = total > 0 ? total : 1;
  const pctAvailable = total > 0 ? Math.round((available / safeTotal) * 100) : 0;

  let borderShiftClass = 'border-l-4 border-l-success border-neutral-200';
  let badgeColor = 'text-success bg-emerald-50';
  let statusText = `${pctAvailable}% Available`;

  if (total === 0) {
    borderShiftClass = 'border-l-4 border-l-neutral-300 border-neutral-200';
    badgeColor = 'text-neutral-500 bg-neutral-100';
    statusText = '0 Slots';
  } else if (available === 0) {
    borderShiftClass = 'border-l-4 border-l-danger border-neutral-200';
    badgeColor = 'text-danger bg-red-50';
    statusText = 'FULL';
  } else if (pctAvailable <= 10) {
    borderShiftClass = 'border-l-4 border-l-danger border-neutral-200';
    badgeColor = 'text-danger bg-red-50';
    statusText = `${pctAvailable}% Available`;
  } else if (pctAvailable <= 30) {
    borderShiftClass = 'border-l-4 border-l-warning border-neutral-200';
    badgeColor = 'text-warning bg-amber-50';
    statusText = `${pctAvailable}% Available`;
  }

  return (
    <Card
      className={`p-5 transition-all duration-300 relative overflow-hidden ${borderShiftClass} ${
        isUpdating ? 'ring-2 ring-accent/60 bg-amber-50/20' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold text-neutral-900 transition-transform duration-300 ${
                isUpdating ? 'scale-105 text-primary' : ''
              }`}
            >
              {available}
            </span>
            <span className="text-sm font-medium text-neutral-400">/ {total} slots</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={`w-10 h-10 rounded-control flex items-center justify-center shrink-0 ${iconBg}`}>
            {icon}
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-pill ${badgeColor}`}>
            {statusText}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <ProgressBar current={available} total={total} showLabels={false} size="sm" />
      </div>
    </Card>
  );
};

import React from 'react';

export interface ProgressBarProps {
  current: number;
  total: number;
  showLabels?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  showLabels = false,
  size = 'md',
  className = '',
}) => {
  const safeTotal = total > 0 ? total : 1;
  const availablePct = Math.round((current / safeTotal) * 100);
  const occupiedPct = Math.min(100, Math.max(0, 100 - availablePct));

  let colorClass = 'bg-success';
  let badgeColor = 'text-success';
  if (availablePct <= 10) {
    colorClass = 'bg-danger';
    badgeColor = 'text-danger';
  } else if (availablePct <= 30) {
    colorClass = 'bg-warning';
    badgeColor = 'text-warning';
  }

  const heightClass = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {showLabels && (
        <div className="flex justify-between text-xs font-medium">
          <span className="text-neutral-500">{occupiedPct}% Occupied</span>
          <span className={badgeColor}>{availablePct}% Available</span>
        </div>
      )}
      <div className={`w-full bg-neutral-200 rounded-pill overflow-hidden ${heightClass}`}>
        <div
          className={`h-full rounded-pill transition-all duration-500 ease-out ${colorClass}`}
          style={{ width: `${occupiedPct}%` }}
          role="progressbar"
          aria-valuenow={occupiedPct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};

import React from 'react';

export const Skeleton: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className = '',
  style,
}) => {
  return <div style={style} className={`animate-pulse bg-neutral-200 rounded-control ${className}`} />;
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-white rounded-card border border-neutral-200 p-5 shadow-soft space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-10 w-10 rounded-control" />
      </div>
      <Skeleton className="h-2 w-full rounded-pill" />
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 5,
}) => {
  return (
    <div className="w-full bg-white rounded-card border border-neutral-200 shadow-soft overflow-hidden">
      <div className="p-4 border-b border-neutral-200 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-neutral-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkeletonChart: React.FC<{ height?: string }> = ({ height = 'h-64' }) => {
  return (
    <div className={`w-full bg-white rounded-card border border-neutral-200 p-6 shadow-soft ${height} flex flex-col justify-between`}>
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="flex items-end gap-3 h-40 pt-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-control"
            style={{ height: `${20 + ((i * 17) % 80)}%` }}
          />
        ))}
      </div>
    </div>
  );
};

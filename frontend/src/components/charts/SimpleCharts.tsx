import React from 'react';

// Lightweight Sparkline SVG
export const Sparkline: React.FC<{ data: number[]; color?: string; height?: number; width?: number }> = ({
  data,
  color = '#1E3A8A',
  height = 28,
  width = 72,
}) => {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

// Bar chart for Reports (Revenue & Duration)
export interface BarChartProps {
  data: Array<{ label: string; value: number; secondaryValue?: number }>;
  primaryLabel?: string;
  secondaryLabel?: string;
  singleSeriesColor?: 'primary' | 'accent';
  valueFormatter?: (val: number) => string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  primaryLabel = 'Cars',
  secondaryLabel = 'Scooters',
  singleSeriesColor = 'primary',
  valueFormatter = (v) => `${v}`,
}) => {
  const maxVal = Math.max(...data.map((d) => Math.max(d.value, d.secondaryValue || 0))) || 100;

  return (
    <div className="w-full space-y-4">
      {/* Legend */}
      <div className="flex items-center justify-end gap-5 text-xs text-neutral-600">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-primary" />
          <span>{primaryLabel}</span>
        </div>
        {secondaryLabel && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-accent" />
            <span>{secondaryLabel}</span>
          </div>
        )}
      </div>

      {/* Bars container */}
      <div className="h-64 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-neutral-200">
        {data.map((item, i) => {
          const pHeight = Math.round((item.value / maxVal) * 100);
          const sHeight = item.secondaryValue ? Math.round((item.secondaryValue / maxVal) * 100) : 0;

          return (
            <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 bg-neutral-900 text-white text-[11px] py-1 px-2 rounded pointer-events-none whitespace-nowrap shadow-lg">
                <p className="font-semibold">{item.label}</p>
                <p className="text-blue-300">
                  {primaryLabel}: {valueFormatter(item.value)}
                </p>
                {item.secondaryValue !== undefined && (
                  <p className="text-amber-300">
                    {secondaryLabel}: {valueFormatter(item.secondaryValue)}
                  </p>
                )}
              </div>

              {/* Bar columns */}
              <div className="w-full flex items-end justify-center gap-1.5 h-full">
                <div
                  className={`w-full max-w-[20px] ${
                    item.secondaryValue === undefined
                      ? singleSeriesColor === 'accent'
                        ? 'bg-accent'
                        : 'bg-primary'
                      : 'bg-primary'
                  } rounded-t-sm transition-all duration-500 hover:brightness-110`}
                  style={{ height: `${Math.max(4, pHeight)}%` }}
                />
                {item.secondaryValue !== undefined && (
                  <div
                    className="w-full max-w-[20px] bg-accent rounded-t-sm transition-all duration-500 hover:brightness-110"
                    style={{ height: `${Math.max(4, sHeight)}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* X Axis Labels */}
      <div className="flex justify-between text-xs text-neutral-500 pt-1">
        {data.map((item, i) => (
          <div key={i} className="flex-1 text-center truncate px-0.5">
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
};

// Line chart for Occupancy %
export interface LineChartProps {
  data: Array<{ label: string; value: number }>;
  valueFormatter?: (val: number) => string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  valueFormatter = (v) => `${v}%`,
}) => {
  const maxVal = 100;
  const height = 220;
  const width = 600;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (d.value / maxVal) * (height - 30) - 15;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="w-full space-y-3">
      <div className="w-full overflow-hidden relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 overflow-visible">
          {/* Horizontal grid lines */}
          {[0, 25, 50, 75, 100].map((level) => {
            const y = height - (level / 100) * (height - 30) - 15;
            return (
              <g key={level}>
                <line x1="0" y1={width} x2={width} y2={y} stroke="#E5E7EB" strokeDasharray="4 4" />
                <text x="5" y={y - 4} fill="#9CA3AF" fontSize="10">
                  {level}%
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <polygon
            points={`0,${height} ${points} ${width},${height}`}
            fill="rgba(30, 58, 138, 0.08)"
          />

          {/* Path line */}
          <polyline
            fill="none"
            stroke="#1E3A8A"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* Data Points */}
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - (d.value / maxVal) * (height - 30) - 15;
            return (
              <g key={i} className="group cursor-pointer">
                <circle cx={x} cy={y} r="5" fill="#FFFFFF" stroke="#1E3A8A" strokeWidth="2.5" />
                <title>{`${d.label}: ${valueFormatter(d.value)}`}</title>
              </g>
            );
          })}
        </svg>
      </div>

      {/* X Labels */}
      <div className="flex justify-between text-xs text-neutral-500 pt-1">
        {data.map((d, i) => (
          <span key={i} className="text-center font-medium">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
};

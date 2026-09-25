import React from 'react';
import { CheckCircle2, XCircle, Clock, Check, Lock, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';

export type BadgeVariant =
  | 'Vacant'
  | 'Occupied'
  | 'Active'
  | 'Completed'
  | 'Locked'
  | 'Deactivated'
  | 'Admin'
  | 'Operator'
  | 'Warning';

export interface BadgeProps {
  variant: BadgeVariant | string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant,
  size = 'sm',
  showIcon = true,
  children,
  className = '',
}) => {
  const getBadgeConfig = () => {
    switch (variant) {
      case 'Vacant':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          icon: <CheckCircle2 className="w-3 h-3" />,
          label: 'Vacant',
        };
      case 'Occupied':
        return {
          bg: 'bg-red-50 border-red-200 text-red-700',
          icon: <XCircle className="w-3 h-3" />,
          label: 'Occupied',
        };
      case 'Active':
        return {
          bg: 'bg-blue-50 border-blue-200 text-blue-700',
          icon: <Clock className="w-3 h-3 animate-pulse" />,
          label: 'Active',
        };
      case 'Completed':
        return {
          bg: 'bg-neutral-100 border-neutral-200 text-neutral-700',
          icon: <Check className="w-3 h-3" />,
          label: 'Completed',
        };
      case 'Locked':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-700',
          icon: <Lock className="w-3 h-3" />,
          label: 'Locked',
        };
      case 'Deactivated':
        return {
          bg: 'bg-neutral-100 border-neutral-300 text-neutral-500',
          icon: <AlertCircle className="w-3 h-3" />,
          label: 'Deactivated',
        };
      case 'Admin':
      case 'admin':
        return {
          bg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
          icon: <ShieldCheck className="w-3 h-3" />,
          label: 'Admin',
        };
      case 'Operator':
      case 'operator':
        return {
          bg: 'bg-teal-50 border-teal-200 text-teal-700',
          icon: <UserCheck className="w-3 h-3" />,
          label: 'Gate Operator',
        };
      case 'Warning':
        return {
          bg: 'bg-amber-50 border-amber-300 text-amber-800',
          icon: <AlertCircle className="w-3 h-3" />,
          label: 'Warning',
        };
      default:
        return {
          bg: 'bg-neutral-100 border-neutral-200 text-neutral-700',
          icon: null,
          label: variant,
        };
    }
  };

  const config = getBadgeConfig();
  const sizeClass = size === 'sm' ? 'text-xs px-2.5 py-0.5 gap-1' : 'text-sm px-3 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-pill border ${config.bg} ${sizeClass} ${className}`}
    >
      {showIcon && config.icon && <span className="shrink-0">{config.icon}</span>}
      <span>{children || config.label}</span>
    </span>
  );
};

import { cn } from '@/lib/utils';
import type { IntersectionStatus } from '@/types/intersection';

const config: Record<IntersectionStatus, { label: string; className: string }> = {
  smooth:    { label: 'Smooth',    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
  medium:    { label: 'Medium',    className: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  congested: { label: 'Congested', className: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400' },
};

interface StatusBadgeProps {
  status: IntersectionStatus;
  vehicles?: number;
  className?: string;
}

export function StatusBadge({ status, vehicles, className }: StatusBadgeProps) {
  const { label, className: statusClass } = config[status];
  return (
    <span className={cn('px-3 py-1.5 rounded-full text-xs font-medium', statusClass, className)}>
      {label}{vehicles !== undefined ? ` · ${vehicles} veh` : ''}
    </span>
  );
}

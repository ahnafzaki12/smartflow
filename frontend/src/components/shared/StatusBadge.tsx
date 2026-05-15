import { cn } from '@/lib/utils';
import type { IntersectionStatus } from '@/types/intersection';

const config: Record<IntersectionStatus, { label: string; className: string }> = {
  smooth:    { label: 'Jalan',    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  medium:    { label: 'Hati-hati',    className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  congested: { label: 'Berhenti', className: 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
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
      {label}{vehicles !== undefined ? ` · ${vehicles} kdr` : ''}
    </span>
  );
}

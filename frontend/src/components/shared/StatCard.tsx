import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const tints: Record<string, string> = {
  sky:     'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  amber:   'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  violet:  'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
};

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  delta?: number;
  deltaGood?: 'up' | 'down';
  Icon: LucideIcon;
  tint: 'sky' | 'emerald' | 'amber' | 'violet';
}

export function StatCard({ label, value, sub, delta, deltaGood = 'up', Icon, tint }: StatCardProps) {
  const isPositive = delta !== undefined && delta >= 0;
  const good = (isPositive && deltaGood === 'up') || (!isPositive && deltaGood === 'down');

  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', tints[tint])}>
          <Icon className="w-5 h-5" />
        </div>
        {delta !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs px-2 py-1 rounded-full',
              good ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                   : 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
            )}
          >
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(delta)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-[1.75rem] font-semibold leading-tight">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </div>
    </div>
  );
}

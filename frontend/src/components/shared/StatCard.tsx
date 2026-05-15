import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const tints: Record<string, string> = {
  sky:     'bg-sky-50 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
  amber:   'bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
  violet:  'bg-violet-50 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300',
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
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', tints[tint])}>
          <Icon className="w-5 h-5" />
        </div>
        {delta !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs px-2 py-1 rounded-full',
              good ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300'
                   : 'bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-300'
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

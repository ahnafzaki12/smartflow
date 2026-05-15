import { Wifi, WifiOff, AlertTriangle, Loader2, Radio } from 'lucide-react';
import type { ApiStatus } from '@/hooks/useSmartFlowApi';

interface ApiStatusBarProps {
  status: ApiStatus;
  useWs?: boolean;
  className?: string;
}

const CONFIG = {
  connecting: {
    Icon:  Loader2,
    classes: 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50',
    iconClass: 'animate-spin text-slate-500 dark:text-slate-400',
  },
  ok: {
    Icon:  Wifi,
    classes: 'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  stale: {
    Icon:  AlertTriangle,
    classes: 'text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  error: {
    Icon:  WifiOff,
    classes: 'text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5',
    iconClass: 'text-red-600 dark:text-red-400',
  },
} as const;

const STATUS_LABEL: Record<ApiStatus, string> = {
  connecting: 'Menghubungkan…',
  ok:         'Langsung',
  stale:      'Terhenti',
  error:      'API Luring',
};

export function ApiStatusBar({ status, useWs, className = '' }: ApiStatusBarProps) {
  const { Icon, classes, iconClass } = CONFIG[status];
  const label = STATUS_LABEL[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all duration-300 ${classes} ${className}`}
    >
      <Icon className={`w-3 h-3 ${iconClass}`} />
      {label}
      {status === 'ok' && (
        <span className="flex items-center gap-0.5 opacity-70">
          {useWs
            ? <><Radio className="w-2.5 h-2.5" /> WS</>
            : 'Polling'
          }
        </span>
      )}
    </span>
  );
}

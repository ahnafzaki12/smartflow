import { AlertTriangle, CameraOff, CheckCircle2, Clock, Wifi, WifiOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MOCK_ALERTS, MOCK_SYSTEMS } from '@/mocks/alerts';
import type { Alert } from '@/types/alert';

const ICON_MAP: Record<string, LucideIcon> = {
  AlertTriangle,
  CameraOff,
  CheckCircle2,
};

const TINT_MAP: Record<string, string> = {
  red:     'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900',
  amber:   'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900',
  emerald: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900',
};

function AlertCard({ alert }: { alert: Alert }) {
  const Icon = ICON_MAP[alert.iconName] ?? AlertTriangle;
  return (
    <div className={`p-4 rounded-xl border ${TINT_MAP[alert.color]}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center shrink-0">
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium text-foreground truncate">{alert.title}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3" /> {alert.time}
            </div>
          </div>
          <div className="text-sm text-muted-foreground mt-0.5">{alert.desc}</div>
        </div>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1>Alerts & Monitoring</h1>
        <p className="text-sm text-muted-foreground">Real-time system health and incident log</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alert Feed */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3>Recent Alerts</h3>
              <p className="text-sm text-muted-foreground">Auto-triaged by severity</p>
            </div>
            <button className="text-sm text-sky-600 hover:text-sky-700 transition">View all</button>
          </div>
          <div className="space-y-3">
            {MOCK_ALERTS.map((a) => (
              <AlertCard key={a.id} alert={a} />
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm h-fit">
          <h3>System Status</h3>
          <p className="text-sm text-muted-foreground mb-4">Live infrastructure health</p>
          <div className="space-y-3">
            {MOCK_SYSTEMS.map((s) => {
              const online = s.status === 'online';
              return (
                <div key={s.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      online
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                    }`}>
                      {online ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">Uptime {s.uptime}</div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    online
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                  }`}>
                    {s.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

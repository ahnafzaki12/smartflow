// AlertsPage.tsx — Task 3.5: data real dari alerting engine
import { AlertTriangle, CheckCircle2, Clock, Wifi, WifiOff, RefreshCw, X } from 'lucide-react';
import { useAlerts, type AlertItem } from '@/hooks/useAlerts';

const SEVERITY_TINT: Record<string, string> = {
  critical: 'bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-300 border-red-100 dark:border-red-900',
  warning:  'bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 border-amber-100 dark:border-amber-900',
  info:     'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900',
};

function AlertCard({ alert, onResolve }: { alert: AlertItem; onResolve: (id: number) => void }) {
  const tint = SEVERITY_TINT[alert.severity] ?? SEVERITY_TINT.info;
  return (
    <div className={`p-4 rounded-xl border ${tint} hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 ${alert.resolved ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium truncate">{alert.message}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3" /> {alert.timestamp.slice(11, 16)}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{alert.intersection ?? 'Semua simpang'} · {alert.type}</span>
            {!alert.resolved
              ? <button onClick={() => onResolve(alert.id)} className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition"><X className="w-3 h-3" /> Tutup</button>
              : <span className="ml-auto text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Selesai</span>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const { alerts, systems, isLoading, resolveAlert, refetch } = useAlerts();
  const active   = alerts.filter(a => !a.resolved);
  const resolved = alerts.filter(a =>  a.resolved);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1>Peringatan &amp; Pemantauan</h1>
          <p className="text-sm text-muted-foreground">Kesehatan sistem real-time dan log insiden</p>
        </div>
        <button onClick={refetch} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-sm hover:bg-muted transition">
          <RefreshCw className="w-4 h-4" /> Perbarui
        </button>
      </div>

      <div className="flex gap-3 flex-wrap text-xs">
        <span className="px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-medium">
          {active.filter(a => a.severity === 'critical').length} Kritis
        </span>
        <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">
          {active.filter(a => a.severity === 'warning').length} Peringatan
        </span>
        <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
          {resolved.length} Diselesaikan
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="mb-1">Peringatan Aktif</h3>
          <p className="text-sm text-muted-foreground mb-4">Diurutkan berdasarkan keparahan</p>
          {isLoading && [...Array(3)].map((_, i) => <div key={i} className="h-16 mb-3 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
          {!isLoading && active.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
              <p className="font-medium">Tidak ada peringatan aktif</p>
            </div>
          )}
          {!isLoading && (
            <div className="space-y-3">
              {[...active].sort((a, b) => ({ critical: 0, warning: 1, info: 2 }[a.severity] ?? 9) - ({ critical: 0, warning: 1, info: 2 }[b.severity] ?? 9))
                .map(a => <AlertCard key={a.id} alert={a} onResolve={resolveAlert} />)}
              {resolved.slice(0, 3).map(a => <AlertCard key={a.id} alert={a} onResolve={resolveAlert} />)}
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm h-fit">
          <h3>Status Sistem</h3>
          <p className="text-sm text-muted-foreground mb-4">Kesehatan infrastruktur</p>
          <div className="space-y-3">
            {systems.map(s => (
              <div key={s.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.status === 'online' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600'}`}>
                    {s.status === 'online' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">Uptime {s.uptime}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${s.status === 'online' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'}`}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

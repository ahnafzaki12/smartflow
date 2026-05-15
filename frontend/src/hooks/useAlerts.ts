// useAlerts.ts — Task 3.5: fetch alerts dari backend
import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://127.0.0.1:8000';

export interface AlertItem {
  id:           number;
  timestamp:    string;
  type:         string;
  severity:     'info' | 'warning' | 'critical';
  intersection: string | null;
  message:      string;
  resolved:     boolean;
  resolved_at:  string | null;
}

export interface SystemStatus {
  name:   string;
  status: 'online' | 'degraded' | 'offline';
  uptime: string;
}

export function useAlerts() {
  const [alerts,    setAlerts]    = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/alerts?limit=50`);
      if (!r.ok) return;
      const { data } = await r.json() as { data: AlertItem[] };
      setAlerts(data);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, []);

  const resolveAlert = useCallback(async (id: number) => {
    try {
      const r = await fetch(`${API_BASE}/alerts/${id}/resolve`, {
        method: 'POST',
        headers: { Authorization: 'Basic ' + btoa('admin:smartflow2024') },
      });
      if (r.ok) setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
      return r.ok;
    } catch { return false; }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const id = setInterval(fetchAlerts, 10_000);
    return () => clearInterval(id);
  }, [fetchAlerts]);

  // System health mocked dari /status latency
  const systems: SystemStatus[] = [
    { name: 'API Backend',   status: 'online',  uptime: '99.8%' },
    { name: 'YOLO Detector', status: 'online',  uptime: '99.2%' },
    { name: 'Database',      status: 'online',  uptime: '100%'  },
    { name: 'WebSocket',     status: 'online',  uptime: '98.5%' },
  ];

  return { alerts, systems, isLoading, resolveAlert, refetch: fetchAlerts };
}

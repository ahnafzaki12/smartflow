// ─────────────────────────────────────────────
// Alert types
// ─────────────────────────────────────────────

export type AlertSeverity = 'high' | 'medium' | 'low';
export type AlertColor = 'red' | 'amber' | 'emerald';

export interface Alert {
  id: number;
  severity: AlertSeverity;
  iconName: string;  // lucide icon name string
  title: string;
  desc: string;
  time: string;
  color: AlertColor;
  resolved?: boolean;
}

export type SystemStatus = 'online' | 'degraded' | 'offline';

export interface SystemComponent {
  name: string;
  status: SystemStatus;
  uptime: string;
}

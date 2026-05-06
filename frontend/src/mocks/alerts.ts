import type { Alert, SystemComponent } from '@/types/alert';

export const MOCK_ALERTS: Alert[] = [
  {
    id: 1,
    severity: 'high',
    iconName: 'AlertTriangle',
    title: 'Heavy congestion — Semanggi Loop',
    desc: 'Queue length exceeded 140m. AI redistributing flow to Rasuna Said.',
    time: '2 min ago',
    color: 'red',
    resolved: false,
  },
  {
    id: 2,
    severity: 'medium',
    iconName: 'CameraOff',
    title: 'CCTV offline — Kuningan HR Cam-02',
    desc: 'Signal lost at 14:17. Fallback to radar sensors active.',
    time: '8 min ago',
    color: 'amber',
    resolved: false,
  },
  {
    id: 3,
    severity: 'low',
    iconName: 'CheckCircle2',
    title: 'Auto-resolved — Sudirman–Thamrin',
    desc: 'AI extended green phase, congestion cleared in 3 cycles.',
    time: '22 min ago',
    color: 'emerald',
    resolved: true,
  },
  {
    id: 4,
    severity: 'medium',
    iconName: 'AlertTriangle',
    title: 'Unusual motorcycle surge — Gatot Subroto',
    desc: '+180% above weekday baseline. Likely event egress.',
    time: '41 min ago',
    color: 'amber',
    resolved: false,
  },
  {
    id: 5,
    severity: 'low',
    iconName: 'CheckCircle2',
    title: 'System sync complete',
    desc: 'Model v3.4.2 deployed to 48 edge nodes.',
    time: '1 h ago',
    color: 'emerald',
    resolved: true,
  },
];

export const MOCK_SYSTEMS: SystemComponent[] = [
  { name: 'AI Inference Cluster',    status: 'online',   uptime: '99.98%' },
  { name: 'CCTV Network (48 cams)', status: 'degraded', uptime: '97.2%'  },
  { name: 'Signal Controllers',      status: 'online',   uptime: '99.99%' },
  { name: 'Data Lake Ingestion',     status: 'online',   uptime: '100%'   },
  { name: 'Edge Inference Nodes',    status: 'online',   uptime: '99.91%' },
];

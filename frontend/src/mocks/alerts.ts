import type { Alert, SystemComponent } from '@/types/alert';

export const MOCK_ALERTS: Alert[] = [
  {
    id: 1,
    severity: 'high',
    iconName: 'AlertTriangle',
    title: 'Kemacetan parah — MER UPN Surabaya',
    desc: 'Panjang antrean melebihi 140m. AI mengalihkan arus ke Rasuna Said.',
    time: '2 mnt lalu',
    color: 'red',
    resolved: false,
  },
  {
    id: 2,
    severity: 'medium',
    iconName: 'CameraOff',
    title: 'CCTV luring — Kuningan HR Cam-02',
    desc: 'Sinyal hilang pada 14:17. Cadangan sensor radar aktif.',
    time: '8 mnt lalu',
    color: 'amber',
    resolved: false,
  },
  {
    id: 3,
    severity: 'low',
    iconName: 'CheckCircle2',
    title: 'Otomatis terselesaikan — Sudirman–Thamrin',
    desc: 'AI memperpanjang fase hijau, kemacetan terurai dalam 3 siklus.',
    time: '22 mnt lalu',
    color: 'emerald',
    resolved: true,
  },
  {
    id: 4,
    severity: 'medium',
    iconName: 'AlertTriangle',
    title: 'Lonjakan motor tak wajar — Gatot Subroto',
    desc: '+180% di atas baseline hari kerja. Kemungkinan bubaran acara.',
    time: '41 mnt lalu',
    color: 'amber',
    resolved: false,
  },
  {
    id: 5,
    severity: 'low',
    iconName: 'CheckCircle2',
    title: 'Sinkronisasi sistem selesai',
    desc: 'Model v3.4.2 diterapkan ke 48 edge node.',
    time: '1 jam lalu',
    color: 'emerald',
    resolved: true,
  },
];

export const MOCK_SYSTEMS: SystemComponent[] = [
  { name: 'Klaster Inferensi AI',      status: 'online',   uptime: '99.98%' },
  { name: 'Jaringan CCTV (48 cam)',    status: 'degraded', uptime: '97.2%'  },
  { name: 'Pengontrol Sinyal',         status: 'online',   uptime: '99.99%' },
  { name: 'Data Lake Ingestion',       status: 'online',   uptime: '100%'   },
  { name: 'Edge Inference Nodes',      status: 'online',   uptime: '99.91%' },
];

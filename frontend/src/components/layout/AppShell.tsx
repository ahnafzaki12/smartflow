import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { SmartFlowProvider } from '@/providers/SmartFlowProvider';
import { Toaster } from '@/components/ui/sonner';
import { useAlerts } from '@/hooks/useAlerts';

const TITLES: Record<string, { title: string; subtitle: string }> = {
  '/':              { title: 'Dasbor Operasi Kota',     subtitle: 'Kecerdasan lalu lintas langsung · Zona Surabaya Timur' },
  '/intersections': { title: 'Konsol Persimpangan',   subtitle: 'Inspeksi umpan langsung dan penyesuaian perilaku AI' },
  '/analytics':     { title: 'Analisis & Laporan',    subtitle: 'Tren historis dan laporan performa' },
  '/alerts':        { title: 'Peringatan & Pemantauan', subtitle: 'Umpan insiden dan kesehatan sistem' },
  '/settings':      { title: 'Pengaturan',            subtitle: 'Kelola penerapan SmartFlow Anda' },
};

export function AppShell() {
  const { pathname } = useLocation();

  // Normalize path — support /intersections/:id sub-pages
  const base = pathname === '/' ? '/' : `/${pathname.split('/')[1]}`;
  const meta = TITLES[base] ?? { title: 'SmartFlow', subtitle: '' };

  const { alerts } = useAlerts();
  const activeAlertCount = alerts.filter(a => !a.resolved).length;

  return (
    <SmartFlowProvider>
      <div className="min-h-screen flex bg-slate-50/50 dark:bg-background text-foreground">
        <Sidebar alertCount={activeAlertCount} />
        <main className="flex-1 min-w-0">
          <Topbar title={meta.title} subtitle={meta.subtitle} />
          <Outlet />
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </SmartFlowProvider>
  );
}

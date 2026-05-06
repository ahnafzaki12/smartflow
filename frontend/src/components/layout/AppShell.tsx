import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const TITLES: Record<string, { title: string; subtitle: string }> = {
  '/':              { title: 'City Operations Dashboard',   subtitle: 'Real-time traffic intelligence · Jakarta Central Zone' },
  '/intersections': { title: 'Intersection Console',         subtitle: 'Inspect live feed and tune AI behavior' },
  '/analytics':     { title: 'Analytics & Reports',          subtitle: 'Historical trends and performance reports' },
  '/alerts':        { title: 'Alerts & Monitoring',          subtitle: 'Incident feed and system health' },
  '/settings':      { title: 'Settings',                     subtitle: 'Manage your SmartFlow deployment' },
};

export function AppShell() {
  const { pathname } = useLocation();

  // Normalize path — support /intersections/:id sub-pages
  const base = pathname === '/' ? '/' : `/${pathname.split('/')[1]}`;
  const meta = TITLES[base] ?? { title: 'SmartFlow', subtitle: '' };

  return (
    <div className="min-h-screen flex bg-slate-50/50 dark:bg-background text-foreground">
      <Sidebar alertCount={3} />
      <main className="flex-1 min-w-0">
        <Topbar title={meta.title} subtitle={meta.subtitle} />
        <Outlet />
      </main>
    </div>
  );
}

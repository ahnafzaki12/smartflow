import { LayoutDashboard, MapPin, BarChart3, Bell, Settings, Zap, ChevronLeft } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';

type RouteId = 'dashboard' | 'intersections' | 'analytics' | 'alerts' | 'settings';

const navItems: { id: RouteId; label: string; path: string; Icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard',     label: 'Dasbor',        path: '/',              Icon: LayoutDashboard },
  { id: 'intersections', label: 'Persimpangan',  path: '/intersections', Icon: MapPin          },
  { id: 'analytics',     label: 'Analisis',      path: '/analytics',     Icon: BarChart3       },
  { id: 'alerts',        label: 'Peringatan',    path: '/alerts',        Icon: Bell            },
  { id: 'settings',      label: 'Pengaturan',    path: '/settings',      Icon: Settings        },
];

interface SidebarProps {
  alertCount?: number;
}

export function Sidebar({ alertCount = 0 }: SidebarProps) {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        'shrink-0 border-r border-border bg-sidebar h-screen sticky top-0 flex flex-col transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-3 border-b border-border min-h-[69px]">
        <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center shadow-sm">
          <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        {!sidebarCollapsed && (
          <div className="overflow-hidden">
            <div className="font-semibold whitespace-nowrap">SmartFlow</div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">Platform AI Lalu Lintas</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ id, label, path, Icon }) => (
          <NavLink
            key={id}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left',
                isActive
                  ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
            title={sidebarCollapsed ? label : undefined}
          >
            <Icon className="w-[18px] h-[18px] shrink-0" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-sm font-medium">{label}</span>
                {id === 'alerts' && alertCount > 0 && (
                  <span className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5">
                    {alertCount}
                  </span>
                )}
              </>
            )}
            {sidebarCollapsed && id === 'alerts' && alertCount > 0 && (
              <span className="absolute left-8 top-1.5 w-2 h-2 rounded-full bg-red-500" />
            )}
          </NavLink>
        ))}
      </nav>

      {/* System status */}
      {!sidebarCollapsed && (
        <div className="p-4 border-t border-border">
          <div className="rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 p-4 text-white">
            <div className="text-xs opacity-90">Status Sistem</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-sm font-medium">Semua sistem daring</span>
            </div>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="mx-auto mb-3 p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        title={sidebarCollapsed ? 'Perluas bilah sisi' : 'Tutup bilah sisi'}
      >
        <ChevronLeft
          className={cn('w-4 h-4 transition-transform duration-300', sidebarCollapsed && 'rotate-180')}
        />
      </button>
    </aside>
  );
}

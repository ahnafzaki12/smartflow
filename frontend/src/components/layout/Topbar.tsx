import { Search, Bell, Sun, Moon } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { darkMode, toggleDarkMode } = useUIStore();

  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-8 py-4 flex items-center gap-6">
      <div className="flex-1 min-w-0">
        <h1 className="truncate">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>

      {/* Search */}
      <div className="relative w-72 shrink-0">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          id="topbar-search"
          placeholder="Search intersection, zone..."
          className={cn(
            'w-full pl-10 pr-4 py-2 rounded-lg bg-input-background border border-transparent',
            'focus:border-sky-400 outline-none transition text-sm'
          )}
        />
      </div>

      {/* Dark mode toggle */}
      <button
        id="topbar-darkmode"
        onClick={toggleDarkMode}
        className="relative w-10 h-10 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
        title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {darkMode ? (
          <Sun className="w-[18px] h-[18px]" />
        ) : (
          <Moon className="w-[18px] h-[18px]" />
        )}
      </button>

      {/* Notifications */}
      <button
        id="topbar-notifications"
        className="relative w-10 h-10 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
      >
        <Bell className="w-[18px] h-[18px]" />
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />
      </button>

      {/* User profile */}
      <div className="flex items-center gap-3 pl-4 border-l border-border">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-medium">Agus Pratama</div>
          <div className="text-xs text-muted-foreground">Operator · Dishub</div>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
          AP
        </div>
      </div>
    </header>
  );
}

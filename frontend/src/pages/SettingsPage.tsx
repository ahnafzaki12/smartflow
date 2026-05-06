import { User, Key, Cpu, Bell, Globe, ChevronRight } from 'lucide-react';

const SECTIONS = [
  {
    id: 'profile',
    icon: User,
    title: 'User Profile',
    description: 'Name, role, and contact information',
    color: 'bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400',
    fields: [
      { label: 'Full Name',    placeholder: 'Agus Pratama',    type: 'text'  },
      { label: 'Role',         placeholder: 'Operator',         type: 'text'  },
      { label: 'Organization', placeholder: 'Dishub Jakarta',   type: 'text'  },
      { label: 'Email',        placeholder: 'agus@dishub.go.id', type: 'email' },
    ],
  },
  {
    id: 'api',
    icon: Key,
    title: 'API Configuration',
    description: 'Backend endpoints and credentials',
    color: 'bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400',
    fields: [
      { label: 'API Base URL',  placeholder: 'http://localhost:8000/api/v1', type: 'text' },
      { label: 'WebSocket URL', placeholder: 'ws://localhost:8000/ws',        type: 'text' },
      { label: 'API Key',       placeholder: '••••••••••••••••',              type: 'password' },
    ],
  },
  {
    id: 'ai',
    icon: Cpu,
    title: 'AI Thresholds',
    description: 'Configure SmartFlow AI behavior parameters',
    color: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400',
    fields: [
      { label: 'Congestion Threshold (veh)',    placeholder: '200', type: 'number' },
      { label: 'Min Green Duration (s)',         placeholder: '10',  type: 'number' },
      { label: 'Max Green Duration (s)',         placeholder: '90',  type: 'number' },
      { label: 'AI Cycle Interval (s)',          placeholder: '30',  type: 'number' },
    ],
  },
  {
    id: 'notifications',
    icon: Bell,
    title: 'Notifications',
    description: 'Alert delivery preferences',
    color: 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
    fields: [
      { label: 'Webhook URL',  placeholder: 'https://hooks.example.com/sf', type: 'url'   },
      { label: 'Email Alerts', placeholder: 'ops@dishub.go.id',              type: 'email' },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div>
        <h1>Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your SmartFlow deployment configuration</p>
      </div>

      <div className="space-y-4">
        {SECTIONS.map(({ id, icon: Icon, title, description, color, fields }) => (
          <details key={id} className="bg-card rounded-2xl border border-border shadow-sm group" open={id === 'profile'}>
            <summary className="flex items-center gap-4 p-5 cursor-pointer list-none select-none">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{title}</div>
                <div className="text-sm text-muted-foreground">{description}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90" />
            </summary>

            <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4">
              {fields.map((f) => (
                <div key={f.label}>
                  <label className="block text-sm font-medium mb-1.5">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-transparent focus:border-sky-400 outline-none transition text-sm"
                  />
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>

      {/* System info footer */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-border p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
          <Globe className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">SmartFlow v1.0.0</div>
          <div className="text-xs text-muted-foreground">Model v3.4.2 · Edge nodes: 48 · Region: Jakarta Metropolitan</div>
        </div>
        <button className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm transition">
          Save Changes
        </button>
      </div>
    </div>
  );
}

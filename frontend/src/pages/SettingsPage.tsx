// SettingsPage.tsx — Task 3.6: GET/POST /settings dengan useSettings hook
import { Save, Cpu, Bell, User, Key, RefreshCw } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

export default function SettingsPage() {
  const { settings, setSettings, isSaving, isLoading, saveSettings } = useSettings();

  function field(
    label: string,
    key: keyof typeof settings,
    opts?: { min?: number; max?: number; step?: number; unit?: string }
  ) {
    return (
      <div key={key}>
        <label className="block text-sm font-medium mb-1.5">
          {label}{opts?.unit && <span className="text-muted-foreground text-xs ml-1">({opts.unit})</span>}
        </label>
        <input
          type="number"
          min={opts?.min}
          max={opts?.max}
          step={opts?.step ?? 1}
          value={settings[key] as number}
          onChange={e => setSettings(p => ({ ...p, [key]: +e.target.value }))}
          className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1>Pengaturan</h1>
          <p className="text-sm text-muted-foreground">Kelola konfigurasi penerapan SmartFlow Anda</p>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="space-y-6">
          {/* AI Algorithm Settings */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
                <Cpu className="w-[18px] h-[18px]" />
              </div>
              <div>
                <div className="font-semibold">Ambang Batas Algoritma SmartFlow</div>
                <div className="text-xs text-muted-foreground">Konfigurasi parameter algoritma AI — perubahan langsung berlaku</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field('Durasi Hijau Minimum', 'min_green', { min: 5, max: 30, unit: 'detik' })}
              {field('Durasi Hijau Maksimum', 'max_green', { min: 20, max: 90, unit: 'detik' })}
              {field('Durasi Siklus Total', 'cycle_time', { min: 40, max: 300, unit: 'detik' })}
              {field('Durasi Fase Kuning', 'yellow_duration', { min: 2, max: 6, unit: 'detik' })}
              {field('Kecepatan Arus (SAT)', 'sat_flow_rate', { min: 0.1, max: 2, step: 0.1, unit: 'kdr/detik' })}
              {field('Ambang Deadlock', 'deadlock_threshold', { min: 20, max: 100, unit: 'kendaraan' })}
            </div>
            <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-muted-foreground">
              ALL_RED gap: <strong>{settings.all_red_gap}d</strong> (konstan, tidak bisa diubah) ·
              Perubahan berlaku pada siklus berikutnya secara otomatis.
            </div>
          </div>

          {/* Profile (static) */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-900/40 text-sky-600 flex items-center justify-center">
                <User className="w-[18px] h-[18px]" />
              </div>
              <div>
                <div className="font-semibold">Profil Operator</div>
                <div className="text-xs text-muted-foreground">Informasi pengguna sistem</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Nama Lengkap',   placeholder: 'Agus Pratama',     type: 'text'  },
                { label: 'Peran',          placeholder: 'Operator Senior',  type: 'text'  },
                { label: 'Organisasi',     placeholder: 'Dishub Surabaya',  type: 'text'  },
                { label: 'Email',          placeholder: 'ops@dishub.go.id', type: 'email' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-sm font-medium mb-1.5">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* API Config (static) */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/40 text-violet-600 flex items-center justify-center">
                <Key className="w-[18px] h-[18px]" />
              </div>
              <div>
                <div className="font-semibold">Konfigurasi API</div>
                <div className="text-xs text-muted-foreground">Endpoint dan koneksi backend</div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {[
                { label: 'URL Backend',   placeholder: 'http://127.0.0.1:8000',   type: 'text' },
                { label: 'URL WebSocket', placeholder: 'ws://127.0.0.1:8000/ws',  type: 'text' },
                { label: 'API Username',  placeholder: 'admin',                   type: 'text' },
                { label: 'API Password',  placeholder: '••••••••••',              type: 'password' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-sm font-medium mb-1.5">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notifikasi */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center">
                <Bell className="w-[18px] h-[18px]" />
              </div>
              <div>
                <div className="font-semibold">Notifikasi</div>
                <div className="text-xs text-muted-foreground">Preferensi pengiriman peringatan</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'URL Webhook', placeholder: 'https://hooks.example.com/sf', type: 'url' },
                { label: 'Email Alert', placeholder: 'ops@dishub.go.id',             type: 'email' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-sm font-medium mb-1.5">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm hover:bg-muted transition"
            >
              <RefreshCw className="w-4 h-4" /> Reset
            </button>
            <button
              onClick={() => saveSettings({
                min_green:          settings.min_green,
                max_green:          settings.max_green,
                cycle_time:         settings.cycle_time,
                sat_flow_rate:      settings.sat_flow_rate,
                yellow_duration:    settings.yellow_duration,
                deadlock_threshold: settings.deadlock_threshold,
              })}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium transition disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Menyimpan…' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

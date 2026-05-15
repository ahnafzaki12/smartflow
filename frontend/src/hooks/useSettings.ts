// useSettings.ts — Task 3.6: GET/POST /settings
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const API_BASE = 'http://127.0.0.1:8000';
const AUTH     = 'Basic ' + btoa('admin:smartflow2024');

export interface AppSettings {
  min_green:          number;
  max_green:          number;
  cycle_time:         number;
  sat_flow_rate:      number;
  yellow_duration:    number;
  deadlock_threshold: number;
  all_red_gap:        number;
}

const DEFAULTS: AppSettings = {
  min_green: 15, max_green: 45, cycle_time: 120,
  sat_flow_rate: 0.5, yellow_duration: 3,
  deadlock_threshold: 40, all_red_gap: 2,
};

export function useSettings() {
  const [settings,  setSettings]  = useState<AppSettings>(DEFAULTS);
  const [isSaving,  setIsSaving]  = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/settings`);
      if (r.ok) {
        const d = await r.json() as AppSettings;
        setSettings(d);
      }
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveSettings = useCallback(async (patch: Partial<AppSettings>) => {
    setIsSaving(true);
    try {
      const r = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: AUTH },
        body: JSON.stringify(patch),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.detail || 'Gagal menyimpan');
      }
      const { settings: updated } = await r.json() as { settings: AppSettings };
      setSettings(updated);
      toast.success('Pengaturan berhasil disimpan');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { settings, setSettings, isSaving, isLoading, saveSettings };
}

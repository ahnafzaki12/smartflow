import { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://127.0.0.1:8000';

export interface SmartFlowData {
  queue: {
    'Simpang A': number;
    'Simpang B': number;
    'Simpang C': number;
    'Simpang D': number;
  };
  green_lights: {
    'Simpang A': number;
    'Simpang B': number;
    'Simpang C': number;
    'Simpang D': number;
  };
}

export type ApiStatus = 'connecting' | 'ok' | 'stale' | 'error';

const DEFAULT_DATA: SmartFlowData = {
  queue:        { 'Simpang A': 0, 'Simpang B': 0, 'Simpang C': 0, 'Simpang D': 0 },
  green_lights: { 'Simpang A': 0, 'Simpang B': 0, 'Simpang C': 0, 'Simpang D': 0 },
};

/**
 * useSmartFlowApi — Phase 3 enhanced version
 *
 * - Polls /status every 500ms
 * - Tracks API health: connecting → ok → stale (5s without data) → error (15s)
 * - Builds a local HistoryEntry on each tick for useHistoricalData
 * - Exposes onTick callback so callers can accumulate history
 */
export function useSmartFlowApi(onTick?: (entry: HistoryEntry) => void) {
  const [data,      setData]      = useState<SmartFlowData>(DEFAULT_DATA);
  const [status,    setStatus]    = useState<ApiStatus>('connecting');
  const [lastOk,    setLastOk]    = useState<number>(Date.now());
  const [error,     setError]     = useState<Error | null>(null);

  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    let alive = true;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/status`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: SmartFlowData = await res.json();

        if (!alive) return;
        setData(json);
        setError(null);
        setStatus('ok');
        setLastOk(Date.now());

        // Build a history tick entry and forward to caller
        const now = new Date();
        onTickRef.current?.({
          t:  now.toTimeString().slice(0, 8),
          ts: now.toISOString(),
          qA: json.queue['Simpang A'],
          qB: json.queue['Simpang B'],
          qC: json.queue['Simpang C'],
          qD: json.queue['Simpang D'],
          gA: json.green_lights['Simpang A'],
          gB: json.green_lights['Simpang B'],
          gC: json.green_lights['Simpang C'],
          gD: json.green_lights['Simpang D'],
        });
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err : new Error('Unknown error'));
        const age = Date.now() - lastOk;
        setStatus(age > 15_000 ? 'error' : age > 5_000 ? 'stale' : 'ok');
      }
    };

    fetchStatus();
    const id = setInterval(fetchStatus, 500);
    return () => { alive = false; clearInterval(id); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, status, error };
}

// ─── Shared type for history ticks ───────────────────────────────────────────
export interface HistoryEntry {
  t: string; ts: string;
  qA: number; qB: number; qC: number; qD: number;
  gA: number; gB: number; gC: number; gD: number;
}

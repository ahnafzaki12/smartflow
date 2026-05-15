// useSmartFlowWs.ts — Task 3.7: WebSocket client dengan HTTP polling fallback
import { useState, useEffect, useRef, useCallback } from 'react';
import type { SmartFlowData, ApiStatus, HistoryEntry } from './useSmartFlowApi';

const WS_URL  = 'ws://127.0.0.1:8000/ws';
const API_BASE = 'http://127.0.0.1:8000';

export interface ClassCounts {
  cars:        number;
  motorcycles: number;
  trucks:      number;
}

export interface ExtendedStatus extends SmartFlowData {
  phases:         Record<string, 'GREEN' | 'YELLOW' | 'ALL_RED' | 'RED'>;
  class_counts:   Record<string, ClassCounts>;
  emergency_mode: boolean;
  emergency_lane: string | null;
  deadlock:       boolean;
  cycle_number:   number;
}

const DEFAULT: ExtendedStatus = {
  queue:         { 'Simpang A': 0, 'Simpang B': 0, 'Simpang C': 0, 'Simpang D': 0 },
  green_lights:  { 'Simpang A': 0, 'Simpang B': 0, 'Simpang C': 0, 'Simpang D': 0 },
  phases:        { 'Simpang A': 'RED', 'Simpang B': 'RED', 'Simpang C': 'RED', 'Simpang D': 'RED' },
  class_counts:  {
    'Simpang A': { cars: 0, motorcycles: 0, trucks: 0 },
    'Simpang B': { cars: 0, motorcycles: 0, trucks: 0 },
    'Simpang C': { cars: 0, motorcycles: 0, trucks: 0 },
    'Simpang D': { cars: 0, motorcycles: 0, trucks: 0 },
  },
  emergency_mode: false,
  emergency_lane: null,
  deadlock:       false,
  cycle_number:   0,
};

export function useSmartFlowWs(onTick?: (e: HistoryEntry) => void) {
  const [data,   setData]   = useState<ExtendedStatus>(DEFAULT);
  const [status, setStatus] = useState<ApiStatus>('connecting');
  const [useWs,  setUseWs]  = useState(true);

  const onTickRef     = useRef(onTick);
  const wsRef         = useRef<WebSocket | null>(null);
  const reconnectRef  = useRef<ReturnType<typeof setTimeout>>();
  const pollRef       = useRef<ReturnType<typeof setInterval>>();
  onTickRef.current   = onTick;

  const applyData = useCallback((d: ExtendedStatus) => {
    setData(d);
    setStatus('ok');
    const now = new Date();
    onTickRef.current?.({
      t: now.toTimeString().slice(0, 8), ts: now.toISOString(),
      qA: d.queue['Simpang A'], qB: d.queue['Simpang B'],
      qC: d.queue['Simpang C'], qD: d.queue['Simpang D'],
      gA: d.green_lights['Simpang A'], gB: d.green_lights['Simpang B'],
      gC: d.green_lights['Simpang C'], gD: d.green_lights['Simpang D'],
    });
  }, []);

  // ── Polling fallback ──
  const startPolling = useCallback(() => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API_BASE}/status`);
        if (!r.ok) throw new Error();
        const d = await r.json() as ExtendedStatus;
        applyData(d);
      } catch {
        setStatus('error');
      }
    }, 500);
  }, [applyData]);

  // ── WebSocket ──
  const connectWs = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen  = () => { setStatus('ok'); setUseWs(true); clearInterval(pollRef.current); };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'status') applyData(msg as ExtendedStatus);
      } catch { /* ignore */ }
    };
    ws.onerror = () => {
      setUseWs(false);
      startPolling();
    };
    ws.onclose = () => {
      setUseWs(false);
      startPolling();
      // Retry WS setelah 5s
      reconnectRef.current = setTimeout(connectWs, 5000);
    };
  }, [applyData, startPolling]);

  useEffect(() => {
    connectWs();
    return () => {
      wsRef.current?.close();
      clearInterval(pollRef.current);
      clearTimeout(reconnectRef.current);
    };
  }, [connectWs]);

  return { data, status, useWs };
}

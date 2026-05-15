import { useState, useEffect, useRef, useCallback } from 'react';
import type { FlowTimelinePoint } from '@/types/metrics';
import type { HistoryEntry } from '@/hooks/useSmartFlowApi';

const API_BASE = 'http://127.0.0.1:8000';

interface DecisionEntry {
  id: number;
  timestamp: string;
  time: string;
  intersection: string;
  prev_green: number;
  new_green: number;
  reason: string;
}

/**
 * useHistoricalData — Phase 3
 *
 * 1. Fetches /history on mount (initial 30-min ring buffer)
 * 2. Appends incoming data from the live polling tick
 * 3. Throttles chart re-render to every 10s (not every 500ms)
 * 4. Also fetches /decisions for LiveActivity replacement
 */
export function useHistoricalData() {
  // Local ring buffer (max 360 points)
  const bufferRef = useRef<HistoryEntry[]>([]);
  const [chartData,   setChartData]   = useState<FlowTimelinePoint[]>([]);
  const [decisions,   setDecisions]   = useState<DecisionEntry[]>([]);
  const [apiStatus,   setApiStatus]   = useState<'loading' | 'ok' | 'error'>('loading');

  // ── Initial fetch: /history ──────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/history`)
      .then((r) => r.json())
      .then(({ data }: { data: HistoryEntry[] }) => {
        bufferRef.current = data.slice(-360);
        setChartData(toChartPoints(bufferRef.current));
        setApiStatus('ok');
      })
      .catch(() => setApiStatus('error'));
  }, []);

  // ── Initial fetch: /decisions ────────────────────────────────────────────
  useEffect(() => {
    const fetchDecisions = () => {
      fetch(`${API_BASE}/decisions`)
        .then((r) => r.json())
        .then(({ data }: { data: DecisionEntry[] }) => setDecisions(data))
        .catch(() => {});
    };
    fetchDecisions();
    const id = setInterval(fetchDecisions, 5000); // refresh decisions every 5s
    return () => clearInterval(id);
  }, []);

  // ── appendTick: called by useSmartFlowApi on every poll ─────────────────
  const pendingRef    = useRef(0);
  const lastRenderRef = useRef(0);

  const appendTick = useCallback((entry: HistoryEntry) => {
    bufferRef.current = [...bufferRef.current, entry].slice(-360);
    pendingRef.current++;

    const now = Date.now();
    // Only trigger setState (re-render) every 10 seconds
    if (now - lastRenderRef.current >= 10_000) {
      lastRenderRef.current = now;
      setChartData(toChartPoints(bufferRef.current));
      pendingRef.current = 0;
    }
  }, []);

  // Force final flush on unmount
  useEffect(() => {
    return () => {
      if (pendingRef.current > 0) {
        setChartData(toChartPoints(bufferRef.current));
      }
    };
  }, []);

  return { chartData, decisions, apiStatus, appendTick };
}

// ─── Derive chart-friendly points from raw history ───────────────────────────
function toChartPoints(entries: HistoryEntry[]): FlowTimelinePoint[] {
  // Reduce to at most 60 points for Recharts performance (1 point per 15s)
  const stride = Math.max(1, Math.floor(entries.length / 60));

  return entries
    .filter((_, i) => i % stride === 0)
    .map((e) => {
      // flow  = total vehicles across all intersections (proxy for throughput)
      const flow = e.qA + e.qB + e.qC + e.qD;
      // wait  = active green duration (proxy for avg wait time of others)
      const wait = Math.max(e.gA, e.gB, e.gC, e.gD);
      return { t: e.t, flow, wait };
    });
}

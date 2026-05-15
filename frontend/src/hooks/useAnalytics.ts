// useAnalytics.ts — Task 3.4: data historis real dari /history
import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://127.0.0.1:8000';

interface HistoryRow {
  timestamp: string;
  q_a: number; q_b: number; q_c: number; q_d: number;
  g_a: number; g_b: number; g_c: number; g_d: number;
}

interface DecisionRow {
  intersection: string;
  new_green: number;
}

export interface DensityPoint { hour: string; density: number; }
export interface QueueTrendPoint { t: string; A: number; B: number; C: number; D: number; }
export interface GreenDistPoint { name: string; value: number; }
export interface AnalyticsKPIs {
  avgDensity: string;
  peakQueue: number;
  peakIntersection: string;
  avgGreenTime: number;
  totalDecisions: number;
}

export function useAnalytics(hours = 24) {
  const [density,    setDensity]    = useState<DensityPoint[]>([]);
  const [queueTrend, setQueueTrend] = useState<QueueTrendPoint[]>([]);
  const [greenDist,  setGreenDist]  = useState<GreenDistPoint[]>([]);
  const [kpis,       setKpis]       = useState<AnalyticsKPIs | null>(null);
  const [isLoading,  setIsLoading]  = useState(true);

  const fetch_data = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await fetch(`${API_BASE}/history?hours=${hours}&limit=5000`);
      if (!r.ok) return;
      const { data } = await r.json() as { data: HistoryRow[] };
      if (!data.length) return;

      // Queue trend (setiap 5 menit = 600 entries @ 0.5s)
      const stride = Math.max(1, Math.floor(data.length / 60));
      const trend: QueueTrendPoint[] = data
        .filter((_, i) => i % stride === 0)
        .map(row => ({
          t: row.timestamp.slice(11, 16),
          A: row.q_a, B: row.q_b, C: row.q_c, D: row.q_d,
        }));
      setQueueTrend(trend);

      // Density per jam
      const byHour: Record<string, number[]> = {};
      data.forEach(row => {
        const h = row.timestamp.slice(11, 13) + ':00';
        if (!byHour[h]) byHour[h] = [];
        byHour[h].push(row.q_a + row.q_b + row.q_c + row.q_d);
      });
      const dens: DensityPoint[] = Object.entries(byHour).map(([hour, vals]) => ({
        hour,
        density: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      }));
      setDensity(dens);

      // Ambil data decisions untuk statistik waktu hijau yang sebenarnya
      let dData: DecisionRow[] = [];
      try {
        const dRes = await fetch(`${API_BASE}/decisions?limit=1000`);
        if (dRes.ok) {
          const dJson = await dRes.json();
          dData = dJson.data || [];
        }
      } catch { /* silent */ }

      // Green time distribution dari data keputusan sebenarnya (new_green)
      const avgG = { 'Simpang A': 0, 'Simpang B': 0, 'Simpang C': 0, 'Simpang D': 0 };
      const countsG = { 'Simpang A': 0, 'Simpang B': 0, 'Simpang C': 0, 'Simpang D': 0 };
      
      dData.forEach(d => {
        if (avgG[d.intersection as keyof typeof avgG] !== undefined) {
          avgG[d.intersection as keyof typeof avgG] += d.new_green;
          countsG[d.intersection as keyof typeof countsG]++;
        }
      });
      
      Object.keys(avgG).forEach(k => {
        const key = k as keyof typeof avgG;
        if (countsG[key] > 0) avgG[key] /= countsG[key];
      });

      setGreenDist(Object.entries(avgG).map(([name, value]) => ({ name, value: Math.round(value) })));

      // KPIs
      const totals = data.map(r => r.q_a + r.q_b + r.q_c + r.q_d);
      const peakIdx = totals.indexOf(Math.max(...totals));
      const peakRow = data[peakIdx];
      const peakMap = { 'Simpang A': peakRow.q_a, 'Simpang B': peakRow.q_b, 'Simpang C': peakRow.q_c, 'Simpang D': peakRow.q_d };
      const peakIntersection = Object.entries(peakMap).sort((a, b) => b[1] - a[1])[0][0];
      const avgTotal = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
      
      setKpis({
        avgDensity:      `${Math.round((avgTotal / 180) * 100)}%`,
        peakQueue:       Math.max(...totals),
        peakIntersection,
        avgGreenTime:    Math.round(Object.values(avgG).reduce((a, b) => a + b, 0) / 4),
        totalDecisions:  dData.length,
      });
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, [hours]);

  // Tambahkan interval auto-refresh agar tersinkronisasi (misal tiap 10 detik)
  useEffect(() => { 
    fetch_data(); 
    const intervalId = setInterval(fetch_data, 10000);
    return () => clearInterval(intervalId);
  }, [fetch_data]);

  return { density, queueTrend, greenDist, kpis, isLoading, refetch: fetch_data };
}

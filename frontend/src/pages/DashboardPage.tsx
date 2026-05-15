import { Clock, TrendingUp, MapPin, Gauge } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { StatCard } from '@/components/shared/StatCard';
import { TrafficMap } from '@/components/map/TrafficMap';
import { LiveActivity } from '@/components/shared/LiveActivity';
import { ApiStatusBar } from '@/components/shared/ApiStatusBar';
import { useIntersections } from '@/hooks/useIntersections';
import { useIntersectionStore } from '@/store/intersectionStore';
import { useSmartFlow } from '@/providers/SmartFlowProvider';
import { MOCK_THROUGHPUT } from '@/mocks/metrics';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { intersections } = useIntersections();
  const { selectedId, setSelectedId } = useIntersectionStore();

  // ── Live data from single provider (Fix #2 — no more triple polling) ──
  const { apiData, apiStatus, decisions } = useSmartFlow();

  // ── Derived KPI metrics from live data ──
  const totalVehicles =
    apiData.queue['Simpang A'] +
    apiData.queue['Simpang B'] +
    apiData.queue['Simpang C'] +
    apiData.queue['Simpang D'];

  // Avg green duration across active intersections (proxy for wait time)
  const avgGreen = Math.round(
    Object.values(apiData.green_lights).reduce((a, b) => a + b, 0) / 4
  );

  // Active intersection count from store
  const counts = intersections.reduce(
    (acc, i) => { acc[i.status]++; return acc; },
    { smooth: 0, medium: 0, congested: 0 } as Record<string, number>
  );

  const handleSelectIntersection = (id: string) => {
    setSelectedId(id);
    navigate(`/intersections/${id}`);
  };

  return (
    <div className="p-8 space-y-6">
      {/* API Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ApiStatusBar status={apiStatus} />
          {totalVehicles > 0 && (
            <span className="text-xs text-muted-foreground">
              {totalVehicles} kendaraan terdeteksi di seluruh persimpangan
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards — live data where possible */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Avg Green Duration (proxy for wait time) — LIVE */}
        <StatCard
          label="Rata-rata Durasi Hijau"
          value={`${avgGreen}s`}
          sub="Waktu hijau AI saat ini"
          delta={avgGreen < 30 ? -15 : undefined}
          deltaGood="down"
          Icon={Clock}
          tint="sky"
        />
        {/* Total Vehicle Count — LIVE */}
        <StatCard
          label="Total Kendaraan (Langsung)"
          value={`${totalVehicles}`}
          sub="Di seluruh 4 persimpangan"
          Icon={TrendingUp}
          tint="emerald"
        />
        {/* Active Intersections — LIVE */}
        <StatCard
          label="Persimpangan Aktif"
          value={`${intersections.length}`}
          sub={`${counts.congested} berhenti saat ini`}
          Icon={MapPin}
          tint="violet"
        />
        {/* AI Model — static for PoC */}
        <StatCard
          label="Model AI"
          value="YOLOv8n"
          sub="yolov8n.pt · SmartFlow v2.0"
          Icon={Gauge}
          tint="amber"
        />
      </div>

      {/* Map + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {/* Traffic Map */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3>Peta Lalu Lintas Kota</h3>
                <p className="text-sm text-muted-foreground">Klik persimpangan mana saja untuk inspeksi langsung</p>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                  Jalan · {counts.smooth}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                  Hati-hati · {counts.medium}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                  Berhenti · {counts.congested}
                </span>
              </div>
            </div>
            <TrafficMap
              intersections={intersections}
              selectedId={selectedId}
              onSelect={handleSelectIntersection}
            />
          </div>

          {/* Throughput Chart — static mock with label */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3>Kapasitas Arus · Sebelum vs Sesudah</h3>
                <p className="text-sm text-muted-foreground">Kendaraan per jam di koridor yang dipantau</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Timer lama
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> SmartFlow AI
                  </span>
                </div>
                {/* Label: Historical estimate */}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                  Estimasi Historis
                </span>
              </div>
            </div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <AreaChart data={MOCK_THROUGHPUT} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradBefore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradAfter" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="h" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} interval={2} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Area type="monotone" dataKey="before" stroke="#94a3b8" strokeWidth={2} fill="url(#gradBefore)" />
                  <Area type="monotone" dataKey="after"  stroke="#10b981" strokeWidth={2} fill="url(#gradAfter)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Live AI Feed — uses /decisions data */}
        <LiveActivity decisions={decisions} />
      </div>
    </div>
  );
}

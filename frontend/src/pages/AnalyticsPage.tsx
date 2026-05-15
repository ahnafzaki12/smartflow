// AnalyticsPage.tsx — Task 3.4: data real dari /history
import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts';
import { useAnalytics } from '@/hooks/useAnalytics';

const HOURS_OPTIONS = [
  { label: '1 jam',   value: 1   },
  { label: '6 jam',   value: 6   },
  { label: '24 jam',  value: 24  },
  { label: '7 hari',  value: 168 },
];

export default function AnalyticsPage() {
  const [hours, setHours] = useState(24);
  const { density, queueTrend, greenDist, kpis, isLoading, refetch } = useAnalytics(hours);

  const KPI_METRICS = kpis ? [
    { key: 'density',  label: 'Rata-rata Kepadatan',    value: kpis.avgDensity,          sub: 'dari kapasitas maksimum' },
    { key: 'peak',     label: 'Puncak Antrean',         value: `${kpis.peakQueue} kdr`,   sub: `di ${kpis.peakIntersection}` },
    { key: 'green',    label: 'Rata-rata Hijau (AI)',   value: `${kpis.avgGreenTime}s`,  sub: 'per siklus per simpang' },
    { key: 'decisions',label: 'Total Keputusan AI',     value: `${kpis.totalDecisions}x`, sub: 'tindakan optimalisasi' },
  ] : [];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1>Analisis &amp; Laporan</h1>
          <p className="text-sm text-muted-foreground">Wawasan mendalam dari data lalu lintas real-time</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {HOURS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setHours(opt.value)}
              className={`px-3 py-1.5 rounded-lg border text-sm transition ${
                hours === opt.value
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'border-border bg-card hover:bg-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-sm hover:bg-muted transition"
          >
            <RefreshCw className="w-4 h-4" /> Perbarui
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 h-24 animate-pulse" />
          ))}
        </div>
      )}

      {/* KPI Cards */}
      {!isLoading && KPI_METRICS.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {KPI_METRICS.map((m) => (
            <div key={m.key} className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="text-sm text-muted-foreground">{m.label}</div>
              <div className="mt-1 text-[1.6rem] font-semibold leading-tight">{m.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{m.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Queue Trend */}
      {!isLoading && queueTrend.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all duration-300">
          <h3 className="mb-1">Tren Antrean per Simpang</h3>
          <p className="text-sm text-muted-foreground mb-4">Volume kendaraan real-time — {queueTrend.length} titik</p>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={queueTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="t" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false}
                  interval={Math.max(0, Math.floor(queueTrend.length / 8))} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="A" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Simpang A" />
                <Line type="monotone" dataKey="B" stroke="#10b981" strokeWidth={2} dot={false} name="Simpang B" />
                <Line type="monotone" dataKey="C" stroke="#f59e0b" strokeWidth={2} dot={false} name="Simpang C" />
                <Line type="monotone" dataKey="D" stroke="#a78bfa" strokeWidth={2} dot={false} name="Simpang D" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Density per jam */}
        {!isLoading && density.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <h3 className="mb-1">Kepadatan per Jam</h3>
            <p className="text-sm text-muted-foreground mb-4">Total kendaraan rata-rata per jam</p>
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={density} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="density" fill="#0ea5e9" radius={[6, 6, 0, 0]} name="Total kdr" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Green time distribution */}
        {!isLoading && greenDist.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <h3 className="mb-1">Distribusi Waktu Hijau (AI)</h3>
            <p className="text-sm text-muted-foreground mb-4">Rata-rata detik hijau per simpang</p>
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={greenDist} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} name="Rata-rata hijau (d)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {!isLoading && queueTrend.length === 0 && (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <p className="text-muted-foreground">Belum ada data historis untuk periode ini.</p>
          <p className="text-xs text-muted-foreground mt-1">Coba pilih rentang waktu yang lebih pendek atau tunggu data terkumpul.</p>
        </div>
      )}
    </div>
  );
}

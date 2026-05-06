import { Download, Calendar, MapPin } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts';
import { MOCK_DENSITY, MOCK_WAIT_TIME, MOCK_PEAK_HOUR } from '@/mocks/metrics';

const KPI_METRICS = [
  { key: 'density',   label: 'Avg. Density',     value: '68%',    sub: 'below capacity' },
  { key: 'wait',      label: 'Wait Reduction',    value: '-41%',   sub: 'YoY improvement' },
  { key: 'peak',      label: 'Peak Hour Flow',    value: '1,842/h', sub: 'per corridor' },
  { key: 'co2',       label: 'CO₂ Saved',         value: '2.4t',   sub: 'this month' },
];

export default function AnalyticsPage() {
  return (
    <div className="p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1>Analytics & Reports</h1>
          <p className="text-sm text-muted-foreground">Deep insights into traffic performance and AI impact</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent text-sm transition">
            <Calendar className="w-4 h-4" /> Last 30 days
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent text-sm transition">
            <MapPin className="w-4 h-4" /> All intersections
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm transition">
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {KPI_METRICS.map((m) => (
          <div key={m.key} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <div className="text-sm text-muted-foreground">{m.label}</div>
            <div className="mt-1 text-[1.6rem] font-semibold leading-tight">{m.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Density */}
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h3>Traffic Density Over Time</h3>
          <p className="text-sm text-muted-foreground mb-4">Weekly average utilization vs capacity</p>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={MOCK_DENSITY} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="density" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Wait Time Reduction */}
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h3>Waiting Time Reduction</h3>
          <p className="text-sm text-muted-foreground mb-4">Monthly avg. seconds per vehicle</p>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={MOCK_WAIT_TIME} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="m" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="before" stroke="#94a3b8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="after"  stroke="#10b981" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3>Peak Hour Trends</h3>
        <p className="text-sm text-muted-foreground mb-4">Hourly traffic intensity — weekdays vs weekends</p>
        <div style={{ height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={MOCK_PEAK_HOUR} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="h" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="weekday" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              <Bar dataKey="weekend" fill="#a78bfa" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

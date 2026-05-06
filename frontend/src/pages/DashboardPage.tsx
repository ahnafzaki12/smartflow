import { Clock, TrendingUp, MapPin, Gauge } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { StatCard } from '@/components/shared/StatCard';
import { TrafficMap } from '@/components/map/TrafficMap';
import { LiveActivity } from '@/components/shared/LiveActivity';
import { useIntersections } from '@/hooks/useIntersections';
import { useIntersectionStore } from '@/store/intersectionStore';
import { MOCK_THROUGHPUT } from '@/mocks/metrics';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { intersections } = useIntersections();
  const { selectedId, setSelectedId } = useIntersectionStore();

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
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Avg. Waiting Time" value="48s"
          sub="was 82s before SmartFlow"
          delta={-41} deltaGood="down"
          Icon={Clock} tint="sky"
        />
        <StatCard
          label="Throughput Improvement" value="+34.7%"
          sub="vs fixed-timer baseline"
          delta={34.7}
          Icon={TrendingUp} tint="emerald"
        />
        <StatCard
          label="Active Intersections" value={`${intersections.length}`}
          sub={`${counts.congested} congested right now`}
          Icon={MapPin} tint="violet"
        />
        <StatCard
          label="AI Confidence" value="96.2%"
          sub="model v3.4 · last synced 2m ago"
          delta={2.1}
          Icon={Gauge} tint="amber"
        />
      </div>

      {/* Map + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {/* Traffic Map */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3>City Traffic Map</h3>
                <p className="text-sm text-muted-foreground">Click any intersection to inspect live flow</p>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                  Smooth · {counts.smooth}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                  Medium · {counts.medium}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400">
                  Congested · {counts.congested}
                </span>
              </div>
            </div>
            <TrafficMap
              intersections={intersections}
              selectedId={selectedId}
              onSelect={handleSelectIntersection}
            />
          </div>

          {/* Throughput Chart */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3>Throughput · Before vs After</h3>
                <p className="text-sm text-muted-foreground">Vehicles per hour across monitored corridors</p>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Legacy timer
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> SmartFlow AI
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

        {/* Live AI Feed */}
        <LiveActivity />
      </div>
    </div>
  );
}

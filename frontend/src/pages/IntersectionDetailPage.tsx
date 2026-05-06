import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, Car, Bike, Truck,
  Brain, Clock, Shield, AlertTriangle,
} from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useIntersectionStore } from '@/store/intersectionStore';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { IntersectionSimulation } from '@/components/map/IntersectionSimulation';
import type { Lane } from '@/types/intersection';

// ─── Static mock lane data (will come from API per intersection) ──────────────
const LANES: Lane[] = [
  { name: 'North', cars: 24, motorcycles: 48, trucks: 3, queue: 82, aiGreen: 42, oldGreen: 30 },
  { name: 'East',  cars: 18, motorcycles: 35, trucks: 2, queue: 54, aiGreen: 28, oldGreen: 30 },
  { name: 'South', cars: 31, motorcycles: 62, trucks: 5, queue: 95, aiGreen: 55, oldGreen: 30 },
  { name: 'West',  cars: 12, motorcycles: 27, trucks: 1, queue: 33, aiGreen: 22, oldGreen: 30 },
];

const TIMELINE = Array.from({ length: 30 }, (_, i) => ({
  t: `${i}m`,
  flow: 60 + Math.sin(i / 2) * 20 + Math.random() * 8,
  wait: 45 + Math.cos(i / 3) * 15 + Math.random() * 5,
}));

export default function IntersectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [manual, setManual] = useState(false);
  const [greenDuration, setGreenDuration] = useState(42);

  const intersections = useIntersectionStore((s) => s.intersections);
  const intersection = intersections.find((i) => i.id === id) ?? intersections[0];

  return (
    <div className="p-8 space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </button>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1>{intersection.name}</h1>
          <p className="text-sm text-muted-foreground">
            Intersection #{intersection.id.toUpperCase()} · {intersection.zone ?? 'Jakarta Central'} · {intersection.cctvId ?? 'CCTV-04'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge status={intersection.status} vehicles={intersection.vehicles} />
          <button className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm flex items-center gap-2 transition">
            <AlertTriangle className="w-4 h-4" /> Emergency Mode
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column: CCTV + Lanes + Timeline */}
        <div className="xl:col-span-2 space-y-6">
          {/* CCTV Feed */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Live CCTV · North Cam</span>
              </div>
              <span className="text-xs text-red-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> REC
              </span>
            </div>
            <div className="p-4 bg-slate-900 flex justify-center">
              <IntersectionSimulation />
            </div>
          </div>

          {/* Per-Lane Breakdown */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <div className="mb-4">
              <h3>Per-Lane Breakdown</h3>
              <p className="text-sm text-muted-foreground">Vehicle mix and queue length</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {LANES.map((l) => (
                <div key={l.name} className="p-4 rounded-xl border border-border bg-gradient-to-br from-white to-slate-50/60 dark:from-slate-900 dark:to-slate-800/60">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium">{l.name} Lane</div>
                    <span className="text-xs text-muted-foreground">
                      {l.cars + l.motorcycles + l.trucks} veh
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Car  className="w-3.5 h-3.5" /> {l.cars}</span>
                    <span className="flex items-center gap-1"><Bike className="w-3.5 h-3.5" /> {l.motorcycles}</span>
                    <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> {l.trucks}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Queue length</span>
                    <span>{l.queue}m</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        l.queue > 80 ? 'bg-red-500' : l.queue > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, l.queue)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Flow & Wait Time Chart */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <div className="mb-4">
              <h3>Flow & Wait Time · Last 30 min</h3>
              <p className="text-sm text-muted-foreground">Updated every 10s</p>
            </div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer>
                <LineChart data={TIMELINE} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="t" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} interval={4} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Line type="monotone" dataKey="flow" stroke="#0ea5e9" strokeWidth={2.2} dot={false} />
                  <Line type="monotone" dataKey="wait" stroke="#f59e0b" strokeWidth={2.2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right column: AI Panel + Manual Override */}
        <div className="space-y-6">
          {/* AI Decision Panel */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium">AI Decision Panel</div>
                <div className="text-xs text-muted-foreground">Recommended green duration</div>
              </div>
            </div>

            <div className="space-y-3">
              {LANES.map((l) => {
                const diff = l.aiGreen - l.oldGreen;
                return (
                  <div key={l.name} className="p-3 rounded-xl border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{l.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-md ${
                        diff >= 0
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                          : 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-400'
                      }`}>
                        {diff > 0 ? '+' : ''}{diff}s
                      </span>
                    </div>
                    {/* Old green bar */}
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-slate-300 dark:bg-slate-600"
                          style={{ width: `${(l.oldGreen / 60) * 100}%` }} />
                      </div>
                      <span className="text-muted-foreground w-8 text-right">{l.oldGreen}s</span>
                    </div>
                    {/* AI green bar */}
                    <div className="flex items-center gap-2 text-xs mt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950 relative overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-emerald-500"
                          style={{ width: `${(l.aiGreen / 60) * 100}%` }} />
                      </div>
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium w-8 text-right">{l.aiGreen}s</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="mt-4 w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm transition flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" /> Apply AI Recommendations
            </button>
          </div>

          {/* Manual Override */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-sm font-medium">Manual Override</div>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 mb-4">
              <div>
                <div className="text-sm font-medium">{manual ? 'Manual control' : 'AI autonomous'}</div>
                <div className="text-xs text-muted-foreground">Toggle to override AI</div>
              </div>
              <button
                id="manual-override-toggle"
                onClick={() => setManual(!manual)}
                className={`w-11 h-6 rounded-full relative transition-colors ${manual ? 'bg-amber-500' : 'bg-emerald-500'}`}
                aria-pressed={manual}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${manual ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Green duration slider */}
            <div className={manual ? '' : 'opacity-50 pointer-events-none'}>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Green duration</span>
                <span className="font-medium">{greenDuration}s</span>
              </div>
              <input
                type="range" min={10} max={90}
                value={greenDuration}
                onChange={(e) => setGreenDuration(Number(e.target.value))}
                className="w-full accent-sky-500"
                disabled={!manual}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>10s</span><span>90s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, Car, Bike, Truck,
  Brain, Clock, Shield, AlertTriangle, MapPin, Siren,
} from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { toast } from 'sonner';
import { useIntersectionStore } from '@/store/intersectionStore';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ApiStatusBar } from '@/components/shared/ApiStatusBar';
import { CCTVPanel } from '@/components/map/CCTVPanel';
import { TrafficMap } from '@/components/map/TrafficMap';
import { useSmartFlow } from '@/providers/SmartFlowProvider';
import type { Lane } from '@/types/intersection';

const API_BASE = 'http://127.0.0.1:8000';
const AUTH     = 'Basic ' + btoa('admin:smartflow2024');

const INTERSECTIONS = ['Simpang A', 'Simpang B', 'Simpang C', 'Simpang D'] as const;

export default function IntersectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const intersections = useIntersectionStore((s) => s.intersections);
  const intersection  = intersections.find((i) => i.id === id) ?? intersections[0];

  const { apiData, apiStatus, useWs, chartData } = useSmartFlow();

  // ── Emergency state ──
  const [emergencyActive, setEmergencyActive] = useState(
    (apiData as { emergency_mode?: boolean }).emergency_mode ?? false
  );
  const [emergencyLane, setEmergencyLane] = useState<string>('Simpang A');
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);
  const [isEmergencyLoading, setIsEmergencyLoading] = useState(false);

  // ── Apply AI state ──
  const [isApplying, setIsApplying] = useState(false);
  const [aiActive, setAiActive] = useState(false);

  // ── Manual override state ──
  const [overrideDurations, setOverrideDurations] = useState<Record<string, number>>({
    'Simpang A': 30, 'Simpang B': 30, 'Simpang C': 30, 'Simpang D': 30,
  });

  const totalVehicles =
    apiData.queue['Simpang A'] + apiData.queue['Simpang B'] +
    apiData.queue['Simpang C'] + apiData.queue['Simpang D'];

  // Data kendaraan per-kelas: dari YOLO nyata (Simpang A) atau 0 (B/C/D tanpa kamera)
  const classCounts = apiData.class_counts ?? {};

  const LANES: Lane[] = INTERSECTIONS.map(name => {
    const cls = classCounts[name] ?? { cars: 0, motorcycles: 0, trucks: 0 };
    // Jika data kelas tidak tersedia (Simpang B/C/D tanpa kamera): tampilkan total sebagai unknown
    const hasRealData = cls.cars + cls.motorcycles + cls.trucks > 0;
    const totalQueue  = apiData.queue[name];
    return {
      name,
      cars:        hasRealData ? cls.cars        : totalQueue, // B/C/D: total = cars (belum tahu kelasnya)
      motorcycles: hasRealData ? cls.motorcycles : 0,          // B/C/D: 0, bukan estimasi palsu
      trucks:      hasRealData ? cls.trucks      : 0,
      queue:       totalQueue,
      aiGreen:     Math.max(1, apiData.green_lights[name]),
      oldGreen:    15,
    };
  });

  // ── Handlers ──
  async function handleEmergencyToggle() {
    setIsEmergencyLoading(true);
    setShowEmergencyConfirm(false);
    try {
      const r = await fetch(`${API_BASE}/emergency`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: AUTH },
        body: JSON.stringify(
          emergencyActive
            ? { active: false }
            : { active: true, lane: emergencyLane }
        ),
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setEmergencyActive(data.emergency_mode);
      toast[data.emergency_mode ? 'warning' : 'success'](
        data.emergency_mode
          ? `Mode Darurat aktif — ${data.emergency_lane} mendapat prioritas`
          : 'Mode Darurat dinonaktifkan — kembali ke AI'
      );
    } catch {
      toast.error('Gagal mengubah mode darurat');
    } finally {
      setIsEmergencyLoading(false);
    }
  }

  async function handleApplyAI() {
    setIsApplying(true);
    try {
      const r = await fetch(`${API_BASE}/apply-ai`, {
        method: 'POST',
        headers: { Authorization: AUTH },
      });
      if (!r.ok) throw new Error();
      const { splits } = await r.json() as { splits: Record<string, number> };
      const topEntry = Object.entries(splits).sort((a, b) => b[1] - a[1])[0];
      setAiActive(true);
      toast.success(`Rekomendasi AI diterapkan! Top: ${topEntry[0]} (${topEntry[1]}d)`);
    } catch {
      toast.error('Gagal menerapkan rekomendasi AI');
    } finally {
      setIsApplying(false);
    }
  }

  async function handleOverride(lane: string) {
    const secs = overrideDurations[lane] ?? 30;
    try {
      const r = await fetch(`${API_BASE}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: AUTH },
        body: JSON.stringify({ intersection: lane, green_secs: secs }),
      });
      if (!r.ok) throw new Error();
      setAiActive(false);
      toast.success(`${lane}: durasi hijau diset ke ${secs}s`);
    } catch {
      toast.error(`Gagal override ${lane}`);
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke dasbor
      </button>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1>{intersection.name}</h1>
          <p className="text-sm text-muted-foreground">
            Persimpangan #{intersection.id.toUpperCase()} · {intersection.zone ?? 'Surabaya Timur'} · {intersection.cctvId ?? 'CCTV-01'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ApiStatusBar status={apiStatus} useWs={useWs} />
          <StatusBadge
            status={totalVehicles > 60 ? 'congested' : totalVehicles > 30 ? 'medium' : 'smooth'}
            vehicles={totalVehicles}
          />

          {/* Emergency Button — AKTIF */}
          <button
            onClick={() => emergencyActive ? handleEmergencyToggle() : setShowEmergencyConfirm(true)}
            disabled={isEmergencyLoading}
            className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition font-medium ${
              emergencyActive
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-500/30 shadow-md'
                : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 hover:bg-red-200'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <Siren className="w-4 h-4" />
            {emergencyActive ? 'Nonaktifkan Darurat' : 'Mode Darurat'}
          </button>
        </div>
      </div>

      {/* Emergency Confirm Dialog */}
      {showEmergencyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-red-200 dark:border-red-800 p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="font-semibold text-red-700 dark:text-red-300">Aktifkan Mode Darurat?</div>
                <div className="text-xs text-muted-foreground">Semua simpang akan MERAH kecuali jalur darurat</div>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5">Pilih Jalur Darurat</label>
              <select
                value={emergencyLane}
                onChange={(e) => setEmergencyLane(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm"
              >
                {INTERSECTIONS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEmergencyConfirm(false)}
                className="flex-1 py-2 rounded-lg border border-border text-sm hover:bg-muted transition"
              >Batal</button>
              <button
                onClick={handleEmergencyToggle}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 font-medium transition"
              >Aktifkan Darurat</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: CCTV + Lanes + Chart */}
        <div className="xl:col-span-2 space-y-6">

          {/* CCTV */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">CCTV Langsung · Quad View</span>
                <span className="text-xs text-muted-foreground">· Simpang A: YOLO · B/C/D: Simulasi</span>
              </div>
              <span className="text-xs text-red-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> REC
              </span>
            </div>
            <div className="p-3 bg-slate-950">
              <CCTVPanel apiData={apiData} />
            </div>
          </div>

          {/* Per-Lane Breakdown */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="mb-4">
              <h3>Rincian per Jalur</h3>
              <p className="text-sm text-muted-foreground">Komposisi kendaraan dan panjang antrean · Data langsung</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {LANES.map((l) => {
                const isRealData = l.name === 'Simpang A' && (classCounts['Simpang A'] !== undefined);
                return (
                  <div key={l.name} className="p-4 rounded-xl border border-border bg-gradient-to-br from-white to-slate-50/60 dark:from-slate-900 dark:to-slate-800/60 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{l.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          isRealData
                            ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {isRealData ? 'YOLO' : 'Simulasi'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">{l.queue} kdr</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5" /> {l.cars}</span>
                      {l.motorcycles > 0 && (
                        <span className="flex items-center gap-1"><Bike className="w-3.5 h-3.5" /> {l.motorcycles}</span>
                      )}
                      {l.trucks > 0 && (
                        <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> {l.trucks}</span>
                      )}
                      {!isRealData && (
                        <span className="text-muted-foreground italic">— komposisi tidak tersedia</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Panjang antrean</span><span>{l.queue} kdr</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          l.queue > 35 ? 'bg-red-500' : l.queue > 18 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (l.queue / 45) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Flow Chart */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3>Arus & Waktu Tunggu · Riwayat Langsung</h3>
                <p className="text-sm text-muted-foreground">Diperbarui setiap 10d · {chartData.length} titik data</p>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Arus</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Hijau</span>
              </div>
            </div>
            <div style={{ height: 220 }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="t" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false}
                      interval={Math.max(0, Math.floor(chartData.length / 8))} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                      formatter={(v: number, name: string) => [v, name === 'flow' ? 'Total Kendaraan' : 'Durasi Hijau (d)']} />
                    <Line type="monotone" dataKey="flow" stroke="#0ea5e9" strokeWidth={2.2} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="wait" stroke="#f59e0b" strokeWidth={2.2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col gap-3 justify-center px-4">
                  {[0.7, 0.5, 0.9, 0.4, 0.8].map((w, i) => (
                    <div key={i} className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse"
                         style={{ width: `${w * 100}%` }} />
                  ))}
                  <p className="text-xs text-muted-foreground text-center mt-2">Mengumpulkan data…</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Map + AI Panel + Manual Override */}
        <div className="space-y-6">
          {/* Map */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/40 text-sky-600 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium">Peta Lokasi</div>
                <div className="text-xs text-muted-foreground">Ikhtisar lalu lintas kota</div>
              </div>
            </div>
            <TrafficMap
              intersections={intersections}
              selectedId={intersection.id}
              onSelect={(newId) => navigate(`/intersections/${newId}`)}
              height={260}
            />
          </div>

          {/* AI Panel */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/40 text-violet-600 flex items-center justify-center">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium">Panel Keputusan AI</div>
                <div className="text-xs text-muted-foreground">Rekomendasi durasi hijau · Langsung</div>
              </div>
            </div>
            <div className="space-y-3">
              {LANES.map((l) => {
                const diff = l.aiGreen - l.oldGreen;
                return (
                  <div key={l.name} className="p-3 rounded-xl border border-border hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{l.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-md ${
                        diff >= 0
                          ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300'
                      }`}>
                        {diff > 0 ? '+' : ''}{diff}s
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-slate-300 dark:bg-slate-600"
                             style={{ width: `${(l.oldGreen / 60) * 100}%` }} />
                      </div>
                      <span className="text-muted-foreground w-8 text-right">{l.oldGreen}s</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs mt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/40 relative overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-500"
                             style={{ width: `${(l.aiGreen / 60) * 100}%` }} />
                      </div>
                      <span className="text-emerald-700 dark:text-emerald-300 font-medium w-8 text-right">{l.aiGreen}s</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Control Buttons */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleApplyAI}
                disabled={isApplying || aiActive}
                className={`flex-1 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 font-medium transition disabled:opacity-90 ${
                  aiActive ? 'bg-emerald-600 text-white cursor-default' : 'bg-violet-600 hover:bg-violet-700 text-white'
                }`}
              >
                <Shield className="w-4 h-4" />
                {isApplying ? 'Menerapkan…' : aiActive ? 'Sedang Menerapkan AI' : 'Terapkan Rekomendasi AI'}
              </button>
              <button
                onClick={() => setAiActive(false)}
                disabled={!aiActive}
                className="px-4 py-2.5 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium transition disabled:opacity-50 flex items-center gap-2"
              >
                Kendali Manual
              </button>
            </div>
          </div>

          {/* Manual Override — AKTIF */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/40 text-sky-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-sm font-medium">Kendali Manual</div>
            </div>
            <div className="space-y-3">
              {INTERSECTIONS.map((lane) => (
                <div key={lane} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-20 shrink-0">{lane}</span>
                  <input
                    type="range"
                    min={15} max={45} step={1}
                    value={overrideDurations[lane]}
                    onChange={(e) => setOverrideDurations(p => ({ ...p, [lane]: +e.target.value }))}
                    className="flex-1 accent-sky-500"
                  />
                  <span className="text-xs font-mono w-8 text-right">{overrideDurations[lane]}s</span>
                  <button
                    onClick={() => handleOverride(lane)}
                    className="px-2 py-1 rounded-lg bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-xs font-medium hover:bg-sky-200 transition"
                  >Set</button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2">
              Override berlaku langsung. AI otomatis melanjutkan pada siklus berikutnya.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

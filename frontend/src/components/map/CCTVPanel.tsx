import { useRef, useState, useEffect } from 'react';
import { Camera, CameraOff, Wifi } from 'lucide-react';
import type { SmartFlowData } from '@/hooks/useSmartFlowApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PanelInfo {
  key: 'Simpang A' | 'Simpang B' | 'Simpang C' | 'Simpang D';
  label: string;
  hasCamera: boolean;
  direction: 'Simpang A' | 'Simpang B' | 'Simpang C' | 'Simpang D';
}

const PANELS: PanelInfo[] = [
  { key: 'Simpang A', label: 'A', hasCamera: true,  direction: 'Simpang A' },
  { key: 'Simpang B', label: 'B', hasCamera: false, direction: 'Simpang B'  },
  { key: 'Simpang C', label: 'C', hasCamera: false, direction: 'Simpang C' },
  { key: 'Simpang D', label: 'D', hasCamera: false, direction: 'Simpang D'  },
];

interface CCTVPanelProps {
  apiData: SmartFlowData;
  videoFeedUrl?: string;
}

// ─── Sub-component: Live MJPEG Feed (Simpang A) ────────────────────────────
function LiveFeed({ url, queue, greenSecs, phase }: { url: string; queue: number; greenSecs: number, phase: string }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [offline, setOffline] = useState(false);
  const color = phase === 'GREEN' ? '#10b981' : phase === 'YELLOW' ? '#f59e0b' : '#ef4444';
  const displayLabel = phase === 'GREEN' || phase === 'YELLOW' ? `${greenSecs}d` : 'MERAH';

  // Periodic src reset to prevent browser memory leak on long-running streams
  useEffect(() => {
    const id = setInterval(() => {
      if (imgRef.current && !offline) {
        const current = imgRef.current.src;
        imgRef.current.src = '';
        imgRef.current.src = current;
      }
    }, 5 * 60 * 1000); // reset every 5 minutes
    return () => clearInterval(id);
  }, [offline]);

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden">
      {/* MJPEG Image */}
      {!offline ? (
        <img
          ref={imgRef}
          src={url}
          alt="Simpang A Live Feed"
          className="w-full h-full object-cover"
          onError={() => setOffline(true)}
          onLoad={() => setOffline(false)}
        />
      ) : (
        <CameraOffPlaceholder label="A" isSim={false} error="Kamera Luring" />
      )}

      {/* ── Overlay: Top-left — Label + Status ── */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5">
        <span className="bg-black/60 backdrop-blur-sm border border-white/10 text-white text-xs font-bold px-2.5 py-1 rounded-md tracking-wider">
          SIMPANG A
        </span>
        <span
          className="w-2.5 h-2.5 rounded-full shadow-lg animate-pulse"
          style={{
            background: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      </div>

      {/* ── Overlay: Top-right — REC badge ── */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm border border-red-500/30 px-2 py-1 rounded-md">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-red-400 text-[10px] font-bold tracking-widest">REC</span>
      </div>

      {/* ── Overlay: Bottom bar — Stats ── */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 flex items-end justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-300">
            <span className="text-white font-semibold">{queue}</span> kdr
          </span>
          <span className="text-xs text-slate-500">·</span>
          <span className="flex items-center gap-1 text-xs">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-400 font-mono text-[10px]">YOLO LIVE</span>
          </span>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-400">{phase === 'YELLOW' ? 'Kuning' : 'Hijau'}</div>
          <div className={`text-sm font-bold font-mono`} style={{ color }}>
            {displayLabel}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-component: No Camera Placeholder (Simpang B/C/D) ────────────────────
function CameraOffPlaceholder({
  label,
  queue,
  greenSecs,
  isSim = true,
  error,
  phase,
}: {
  label: string;
  queue?: number;
  greenSecs?: number;
  isSim?: boolean;
  error?: string;
  phase?: string;
}) {
  const color = phase === 'GREEN' ? '#10b981' : phase === 'YELLOW' ? '#f59e0b' : '#ef4444';
  const displayLabel = phase === 'GREEN' || phase === 'YELLOW' ? `${greenSecs}d` : 'MERAH';

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col">
      {/* Grid background */}
      <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none">
        <defs>
          <pattern id={`grid-${label}`} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#334155" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-${label})`} />
      </svg>

      {/* Subtle vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(2,6,23,0.6) 100%)' }} />

      {/* ── Overlay: Top-left — Label ── */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
        <span className="bg-black/60 backdrop-blur-sm border border-white/10 text-white text-xs font-bold px-2.5 py-1 rounded-md tracking-wider">
          SIMPANG {label}
        </span>
        {greenSecs !== undefined && (
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background: color,
              boxShadow: `0 0 8px ${color}`,
            }}
          />
        )}
      </div>

      {/* ── Overlay: Top-right — SIM badge ── */}
      <div className="absolute top-2 right-2 z-10">
        {isSim ? (
          <span className="flex items-center gap-1.5 bg-amber-500/10 backdrop-blur-sm border border-amber-500/30 px-2 py-1 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-amber-400 text-[10px] font-bold tracking-widest">SIM</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 bg-red-500/10 backdrop-blur-sm border border-red-500/30 px-2 py-1 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="text-red-400 text-[10px] font-bold tracking-widest">N/A</span>
          </span>
        )}
      </div>

      {/* Center icon + label */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 z-10">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center">
            <CameraOff className="w-6 h-6 text-slate-500" />
          </div>
          {/* Diagonal slash overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-px bg-red-500/50 rotate-45 rounded-full" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-slate-400 text-xs font-medium">
            {error ?? 'Tidak Ada Feed Kamera'}
          </p>
          {isSim && (
            <p className="text-slate-600 text-[10px] mt-0.5">Data: Simulasi (Acak)</p>
          )}
        </div>

        {/* Queue sparkle pill */}
        {queue !== undefined && (
          <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 px-3 py-1.5 rounded-full">
            <Camera className="w-3 h-3 text-slate-500" />
            <span className="text-xs text-slate-300">
              <span className="font-semibold text-white">{queue}</span> kdr (simulasi)
            </span>
          </div>
        )}
      </div>

      {/* ── Overlay: Bottom bar — Stats ── */}
      {queue !== undefined && greenSecs !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 flex items-end justify-between z-10">
          <div className="text-xs text-slate-400">
            Antrean: <span className="text-white font-semibold">{queue}</span> kdr
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-500">{phase === 'YELLOW' ? 'Kuning' : 'Hijau'}</div>
            <div className={`text-sm font-bold font-mono`} style={{ color }}>
              {displayLabel}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component: CCTVPanel ────────────────────────────────────────────────
export function CCTVPanel({
  apiData,
  videoFeedUrl = 'http://127.0.0.1:8000/video_feed',
}: CCTVPanelProps) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden bg-slate-900 border border-slate-800"
         style={{ minHeight: 320 }}>
      {PANELS.map((panel) => {
        const queue     = apiData.queue[panel.key];
        const greenSecs = apiData.green_lights[panel.key];
        const phase     = (apiData as any).phases?.[panel.key] || 'RED';

        return (
          <div
            key={panel.key}
            className="relative aspect-video overflow-hidden"
            style={{ minHeight: 140 }}
          >
            {panel.hasCamera ? (
              <LiveFeed
                url={videoFeedUrl}
                queue={queue}
                greenSecs={greenSecs}
                phase={phase}
              />
            ) : (
              <CameraOffPlaceholder
                label={panel.label}
                queue={queue}
                greenSecs={greenSecs}
                isSim={true}
                phase={phase}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

import { motion } from 'motion/react';
import type { Intersection, IntersectionStatus } from '@/types/intersection';
import { useSmartFlowApi } from '@/hooks/useSmartFlowApi';

const statusColors: Record<IntersectionStatus, string> = {
  smooth:    '#10b981',
  medium:    '#f59e0b',
  congested: '#ef4444',
};

interface TrafficMapProps {
  intersections: Intersection[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}

export function TrafficMap({ intersections, selectedId, onSelect }: TrafficMapProps) {
  const { data: apiData } = useSmartFlowApi();

  const getLights = () => {
    return {
      N: apiData.green_lights['Simpang A'] > 0 ? '#10b981' : '#ef4444',
      E: apiData.green_lights['Simpang B'] > 0 ? '#10b981' : '#ef4444',
      S: apiData.green_lights['Simpang C'] > 0 ? '#10b981' : '#ef4444',
      W: apiData.green_lights['Simpang D'] > 0 ? '#10b981' : '#ef4444',
    };
  };

  return (
    <div
      className="relative rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-sm"
      style={{ height: 440 }}
    >
      {/* SVG road grid */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs>
          <pattern id="mapgrid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#1e293b" strokeWidth="0.15" />
          </pattern>
          <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#roadGrad)" />
        <rect width="100" height="100" fill="url(#mapgrid)" />
        
        {/* Road base lines */}
        <g stroke="#1e293b" strokeWidth="8" fill="none" strokeLinecap="round">
          <line x1="0" y1="50" x2="100" y2="50" />
          <line x1="50" y1="0"  x2="50"  y2="100" />
        </g>
        
        {/* Road lane markings */}
        <g stroke="#334155" strokeWidth="0.8" strokeDasharray="2 3">
          <line x1="0" y1="50" x2="100" y2="50" />
          <line x1="50" y1="0"  x2="50"  y2="100" />
        </g>
      </svg>

      {/* Intersection nodes */}
      {intersections.map((i) => {
        const isSelected = selectedId === i.id;
        const lights = getLights();
        
        const totalVehicles = apiData.queue['Simpang A'] + apiData.queue['Simpang B'] + apiData.queue['Simpang C'] + apiData.queue['Simpang D'];
        const liveStatus = totalVehicles > 60 ? 'congested' : totalVehicles > 30 ? 'medium' : 'smooth';

        return (
          <button
            key={i.id}
            onClick={() => onSelect?.(i.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none w-4 h-4 flex items-center justify-center"
            style={{ left: `${i.x}%`, top: `${i.y}%` }}
            title={`${i.name} — ${liveStatus} · ${totalVehicles} veh`}
          >
            {/* Traffic Lights */}
            {/* North Light */}
            <span className={`absolute -top-5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full transition-colors duration-300 shadow-[0_0_6px_rgba(0,0,0,0.8)] ${isSelected ? 'ring-2 ring-white' : ''}`} style={{ background: lights.N }} />
            {/* South Light */}
            <span className={`absolute -bottom-5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full transition-colors duration-300 shadow-[0_0_6px_rgba(0,0,0,0.8)] ${isSelected ? 'ring-2 ring-white' : ''}`} style={{ background: lights.S }} />
            {/* East Light */}
            <span className={`absolute top-1/2 -right-5 -translate-y-1/2 w-3 h-3 rounded-full transition-colors duration-300 shadow-[0_0_6px_rgba(0,0,0,0.8)] ${isSelected ? 'ring-2 ring-white' : ''}`} style={{ background: lights.E }} />
            {/* West Light */}
            <span className={`absolute top-1/2 -left-5 -translate-y-1/2 w-3 h-3 rounded-full transition-colors duration-300 shadow-[0_0_6px_rgba(0,0,0,0.8)] ${isSelected ? 'ring-2 ring-white' : ''}`} style={{ background: lights.W }} />

            {/* Tooltip label */}
            <span className="absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-800/90 backdrop-blur border border-slate-700 px-2 py-1 rounded-md text-xs text-slate-200 shadow-sm opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
              <span className="font-medium text-white">{i.name}</span> · {totalVehicles} veh
            </span>
          </button>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur rounded-xl border border-slate-800 shadow-sm px-4 py-3 flex items-center gap-5 text-xs text-slate-300">
        {(['smooth', 'medium', 'congested'] as IntersectionStatus[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: statusColors[s], boxShadow: `0 0 8px ${statusColors[s]}` }} />
            <span className="capitalize">{s}</span>
          </div>
        ))}
      </div>

      {/* Live badge */}
      <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur rounded-xl border border-slate-800 shadow-sm px-3 py-2 flex items-center gap-2 text-xs">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
        <span className="text-slate-300">Live · Jakarta Central Zone</span>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Car, Bike, Truck } from 'lucide-react';
import { useSmartFlowApi } from '@/hooks/useSmartFlowApi';

type Direction = 'N' | 'S' | 'E' | 'W';
type LightState = 'green' | 'yellow' | 'red';
type VehicleType = 'car' | 'motorcycle' | 'truck';

interface Vehicle {
  id: number;
  dir: Direction;
  type: VehicleType;
  pos: number; // 0 to 400
  speed: number;
  stopped: boolean;
}

const VEHICLE_CONFIG = {
  car: { color: '#3b82f6', radius: 4, speed: 1.5 },
  motorcycle: { color: '#fbbf24', radius: 3, speed: 2.2 },
  truck: { color: '#94a3b8', radius: 5, speed: 1.0 },
};

// Intersection layout (400x400)
// Center junction: 160 to 240
const STOP_LINES: Record<Direction, number> = {
  N: 155, // Distance from start. Reaches y=155
  S: 155, // Distance from start. Reaches y=245
  E: 155, // Distance from start. Reaches x=245
  W: 155, // Distance from start. Reaches x=155
};

// Coordinates for the paths
const LANES: Record<Direction, { fixed: 'x' | 'y'; val: number; sign: 1 | -1 }> = {
  N: { fixed: 'x', val: 180, sign: 1 },  // Moving down (+y)
  S: { fixed: 'x', val: 220, sign: -1 }, // Moving up (-y)
  W: { fixed: 'y', val: 220, sign: 1 },  // Moving right (+x)
  E: { fixed: 'y', val: 180, sign: -1 }, // Moving left (-x)
};

export function IntersectionSimulation() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [lights, setLights] = useState<{ N: LightState; E: LightState; S: LightState; W: LightState }>({
    N: 'green', E: 'red', S: 'red', W: 'red',
  });

  const vehiclesRef = useRef<Vehicle[]>([]);
  const lightsRef = useRef<{ N: LightState; E: LightState; S: LightState; W: LightState }>({
    N: 'green', E: 'red', S: 'red', W: 'red',
  });
  const reqRef = useRef<number>();
  const idCounter = useRef(0);

  const { data: apiData } = useSmartFlowApi();
  const queueRef = useRef({ A: 0, B: 0, C: 0, D: 0 });

  // Sync lights with API
  useEffect(() => {
    if (!apiData) return;
    
    // API logic: if > 0 then green, else red
    const newLights: { N: LightState; E: LightState; S: LightState; W: LightState } = {
      N: apiData.green_lights['Simpang A'] > 0 ? 'green' : 'red',
      E: apiData.green_lights['Simpang B'] > 0 ? 'green' : 'red',
      S: apiData.green_lights['Simpang C'] > 0 ? 'green' : 'red',
      W: apiData.green_lights['Simpang D'] > 0 ? 'green' : 'red',
    };
    
    setLights(newLights);
    lightsRef.current = newLights;

    // Update queueRef for spawning logic
    queueRef.current = {
      A: apiData.queue['Simpang A'],
      B: apiData.queue['Simpang B'],
      C: apiData.queue['Simpang C'],
      D: apiData.queue['Simpang D'],
    };
  }, [apiData]);

  // ─── Vehicle Spawner ──────────────────────────────────────────────────────
  useEffect(() => {
    const spawn = () => {
      const types: VehicleType[] = ['car', 'car', 'motorcycle', 'motorcycle', 'truck'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      const q = queueRef.current;
      const total = q.A + q.B + q.C + q.D;
      
      let dir: Direction = 'N';
      if (total > 0) {
        let r = Math.random() * total;
        if (r < q.A) dir = 'N';
        else if (r < q.A + q.B) dir = 'E';
        else if (r < q.A + q.B + q.C) dir = 'S';
        else dir = 'W';
      } else {
        const dirs: Direction[] = ['N', 'S', 'E', 'W'];
        dir = dirs[Math.floor(Math.random() * dirs.length)];
      }
      
      // Don't spawn if the start of the lane is blocked (backpressure)
      const isBlocked = vehiclesRef.current.some((v) => v.dir === dir && v.pos < 20);
      
      if (!isBlocked) {
        const baseSpeed = VEHICLE_CONFIG[type].speed;
        // add slight randomness to speed
        const speed = baseSpeed * (0.8 + Math.random() * 0.4);
        
        vehiclesRef.current.push({
          id: idCounter.current++,
          dir,
          type,
          pos: 0,
          speed,
          stopped: false,
        });
      }
      
      // Random spawn interval (300ms to 1200ms)
      setTimeout(spawn, 300 + Math.random() * 900);
    };
    
    const timeout = setTimeout(spawn, 1000);
    return () => clearTimeout(timeout);
  }, []);

  // ─── Physics Loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const minDistance = 14; // pixels between vehicles
    
    const update = () => {
      const currentLights = lightsRef.current;
      
      vehiclesRef.current = vehiclesRef.current.filter(v => v.pos < 450).map((v, i, arr) => {
        let maxPos = 450;
        
        // 1. Check traffic light
        const lightState = currentLights[v.dir];
        const stopLine = STOP_LINES[v.dir];
        
        // If approaching intersection and light is not green, stop line applies
        if (v.pos <= stopLine && lightState !== 'green') {
          maxPos = stopLine;
        }

        // 2. Check vehicle directly ahead
        const ahead = arr.find(
          other => other.dir === v.dir && other.pos > v.pos && other.pos < v.pos + 50
        );
        
        if (ahead) {
          maxPos = Math.min(maxPos, ahead.pos - minDistance);
        }

        // 3. Move
        let newPos = v.pos;
        let stopped = false;
        
        if (newPos + v.speed >= maxPos) {
          newPos = maxPos;
          stopped = true;
        } else {
          newPos += v.speed;
        }

        return { ...v, pos: newPos, stopped };
      });

      // trigger re-render
      setVehicles([...vehiclesRef.current]);
      reqRef.current = requestAnimationFrame(update);
    };

    reqRef.current = requestAnimationFrame(update);
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, []);

  // ─── Rendering helpers ────────────────────────────────────────────────────
  const getLightColor = (state: LightState) => {
    if (state === 'green') return '#10b981';
    if (state === 'yellow') return '#fbbf24';
    return '#ef4444';
  };

  return (
    <div className="relative aspect-square w-full max-w-md mx-auto bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400">
        <defs>
          <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
        </defs>

        {/* Vertical Road */}
        <rect x="160" y="0" width="80" height="400" fill="url(#road)" />
        {/* Horizontal Road */}
        <rect x="0" y="160" width="400" height="80" fill="url(#road)" />

        {/* Road markings */}
        <g stroke="#334155" strokeDasharray="6 8" strokeWidth="2">
          {/* Vertical center line */}
          <line x1="200" y1="0" x2="200" y2="155" />
          <line x1="200" y1="245" x2="200" y2="400" />
          {/* Horizontal center line */}
          <line x1="0" y1="200" x2="155" y2="200" />
          <line x1="245" y1="200" x2="400" y2="200" />
        </g>

        {/* Stop lines */}
        <g stroke="#fbbf24" strokeWidth="3">
          <line x1="160" y1="155" x2="200" y2="155" /> {/* N */}
          <line x1="200" y1="245" x2="240" y2="245" /> {/* S */}
          <line x1="245" y1="160" x2="245" y2="200" /> {/* E */}
          <line x1="155" y1="200" x2="155" y2="240" /> {/* W */}
        </g>

        {/* Vehicles */}
        {vehicles.map(v => {
          const cfg = VEHICLE_CONFIG[v.type];
          const lane = LANES[v.dir];
          // Calculate true x,y based on origin and direction
          const x = lane.fixed === 'x' ? lane.val : (lane.sign > 0 ? v.pos : 400 - v.pos);
          const y = lane.fixed === 'y' ? lane.val : (lane.sign > 0 ? v.pos : 400 - v.pos);

          return (
            <g key={v.id}>
              {/* Outer glow */}
              <circle cx={x} cy={y} r={cfg.radius + 2} fill={cfg.color} opacity="0.3" />
              {/* Core */}
              <circle cx={x} cy={y} r={cfg.radius} fill={cfg.color} />
              {/* Brake lights if stopped */}
              {v.stopped && (
                <circle cx={x} cy={y} r={2} fill="#ef4444" opacity="0.8" />
              )}
            </g>
          );
        })}

        {/* Traffic Lights UI */}
        {/* North Light (controls cars going down) */}
        <circle cx="150" cy="155" r="6" fill={getLightColor(lights.N)} stroke="#334155" strokeWidth="2" />
        {/* South Light (controls cars going up) */}
        <circle cx="250" cy="245" r="6" fill={getLightColor(lights.S)} stroke="#334155" strokeWidth="2" />
        {/* East Light (controls cars going left) */}
        <circle cx="245" cy="150" r="6" fill={getLightColor(lights.E)} stroke="#334155" strokeWidth="2" />
        {/* West Light (controls cars going right) */}
        <circle cx="155" cy="250" r="6" fill={getLightColor(lights.W)} stroke="#334155" strokeWidth="2" />

        {/* Labels for Simpang A, B, C, D */}
        <text x="200" y="30" fill="#94a3b8" fontSize="24" fontWeight="bold" textAnchor="middle" opacity="0.6">A</text>
        <text x="370" y="200" fill="#94a3b8" fontSize="24" fontWeight="bold" textAnchor="middle" alignmentBaseline="central" opacity="0.6">B</text>
        <text x="200" y="380" fill="#94a3b8" fontSize="24" fontWeight="bold" textAnchor="middle" opacity="0.6">C</text>
        <text x="30" y="200" fill="#94a3b8" fontSize="24" fontWeight="bold" textAnchor="middle" alignmentBaseline="central" opacity="0.6">D</text>
      </svg>

      {/* Legend */}
      <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur border border-slate-700 px-3 py-2 rounded-lg text-xs text-slate-300">
        <div className="font-medium text-white mb-1.5 border-b border-slate-700 pb-1">Legend</div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: VEHICLE_CONFIG.car.color }} />
          Car
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: VEHICLE_CONFIG.motorcycle.color }} />
          Motorcycle
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: VEHICLE_CONFIG.truck.color }} />
          Truck
        </div>
      </div>

      {/* System Status overlay */}
      <div className="absolute bottom-3 right-3 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded text-[10px] text-emerald-400 font-mono">
        SIMULATION ACTIVE
      </div>
    </div>
  );
}

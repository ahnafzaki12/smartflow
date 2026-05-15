// ─────────────────────────────────────────────
// Intersection types
// ─────────────────────────────────────────────

export type IntersectionStatus = 'smooth' | 'medium' | 'congested';

export interface Intersection {
  id: string;
  name: string;
  x: number;   // percentage position on map (0-100)
  y: number;   // percentage position on map (0-100)
  status: IntersectionStatus;
  vehicles: number;
  zone?: string;
  cctvId?: string;
}

export interface Lane {
  name: 'Simpang A' | 'Simpang B' | 'Simpang C' | 'Simpang D';
  cars: number;
  motorcycles: number;
  trucks: number;
  queue: number;
  aiGreen: number;   // AI-recommended green duration (seconds)
  oldGreen: number;  // Legacy fixed-timer green duration (seconds)
}

export interface IntersectionDetail extends Intersection {
  lanes: Lane[];
}

// ─────────────────────────────────────────────
// Metrics / Analytics types
// ─────────────────────────────────────────────

export interface ThroughputDataPoint {
  h: string;
  before: number;
  after: number;
}

export interface DensityDataPoint {
  day: string;
  density: number;
  capacity: number;
}

export interface WaitTimeDataPoint {
  m: string;
  before: number;
  after: number;
}

export interface PeakHourDataPoint {
  h: string;
  weekday: number;
  weekend: number;
}

export interface FlowTimelinePoint {
  t: string;
  flow: number;
  wait: number;
}

export interface KpiMetric {
  key: string;
  label: string;
  value: string;
  sub: string;
  delta?: number;
  deltaGood?: 'up' | 'down';
}

export interface AiDecisionEntry {
  id: number;
  loc: string;
  from: number;
  to: number;
  reason: string;
  time: string;
}

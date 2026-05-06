import type {
  ThroughputDataPoint,
  DensityDataPoint,
  WaitTimeDataPoint,
  PeakHourDataPoint,
} from '@/types/metrics';

export const MOCK_THROUGHPUT: ThroughputDataPoint[] = Array.from({ length: 24 }, (_, i) => ({
  h: `${i.toString().padStart(2, '0')}h`,
  before: 800 + Math.sin(i / 3) * 250 + (i > 7 && i < 10 ? 400 : 0) + (i > 16 && i < 20 ? 500 : 0),
  after: 1100 + Math.sin(i / 3) * 280 + (i > 7 && i < 10 ? 550 : 0) + (i > 16 && i < 20 ? 650 : 0),
}));

export const MOCK_DENSITY: DensityDataPoint[] = Array.from({ length: 7 }, (_, i) => ({
  day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
  density: 60 + Math.random() * 30,
  capacity: 95,
}));

export const MOCK_WAIT_TIME: WaitTimeDataPoint[] = Array.from({ length: 12 }, (_, i) => ({
  m: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
  before: 85 - i * 0.5 + Math.random() * 4,
  after: 55 - i * 2 + Math.random() * 3,
}));

export const MOCK_PEAK_HOUR: PeakHourDataPoint[] = Array.from({ length: 24 }, (_, i) => ({
  h: `${i}`,
  weekday: 30 + (i > 6 && i < 10 ? 60 : 0) + (i > 16 && i < 20 ? 70 : 0) + Math.random() * 10,
  weekend: 25 + (i > 10 && i < 14 ? 35 : 0) + (i > 18 && i < 22 ? 45 : 0) + Math.random() * 10,
}));

export const AI_DECISION_TEMPLATES = [
  { loc: 'Sudirman–Thamrin', from: 30, to: 42, reason: 'North-bound queue detected' },
  { loc: 'Gatot Subroto',    from: 45, to: 38, reason: 'Flow normalized — easing timing' },
  { loc: 'Senayan Gate',     from: 25, to: 55, reason: 'Event crowd egress predicted' },
  { loc: 'Rasuna Said',      from: 35, to: 28, reason: 'Off-peak adjustment applied' },
  { loc: 'Kuningan HR',      from: 40, to: 52, reason: 'Motorcycle surge detected' },
  { loc: 'Semanggi Loop',    from: 50, to: 45, reason: 'Merge congestion resolved' },
];

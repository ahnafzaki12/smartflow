import apiClient from './client';
import type {
  ThroughputDataPoint,
  DensityDataPoint,
  WaitTimeDataPoint,
  PeakHourDataPoint,
} from '@/types/metrics';

export const metricsApi = {
  /** GET /metrics/throughput?range=24h */
  getThroughput: (range = '24h'): Promise<ThroughputDataPoint[]> =>
    apiClient.get('/metrics/throughput', { params: { range } }).then((r) => r.data),

  /** GET /metrics/density?range=7d */
  getDensity: (range = '7d'): Promise<DensityDataPoint[]> =>
    apiClient.get('/metrics/density', { params: { range } }).then((r) => r.data),

  /** GET /metrics/wait-time?range=12m */
  getWaitTime: (range = '12m'): Promise<WaitTimeDataPoint[]> =>
    apiClient.get('/metrics/wait-time', { params: { range } }).then((r) => r.data),

  /** GET /metrics/peak-hour */
  getPeakHour: (): Promise<PeakHourDataPoint[]> =>
    apiClient.get('/metrics/peak-hour').then((r) => r.data),
};

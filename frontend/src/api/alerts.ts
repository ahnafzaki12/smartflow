import type { Alert, SystemComponent } from '@/types/alert';
import apiClient from './client';

export const alertsApi = {
  /** GET /alerts */
  getAll: (): Promise<Alert[]> =>
    apiClient.get('/alerts').then((r) => r.data),

  /** PATCH /alerts/:id/resolve */
  resolve: (id: number): Promise<void> =>
    apiClient.patch(`/alerts/${id}/resolve`),

  /** GET /systems */
  getSystems: (): Promise<SystemComponent[]> =>
    apiClient.get('/systems').then((r) => r.data),
};

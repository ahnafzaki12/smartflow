import type { Intersection } from '@/types/intersection';
import type { IntersectionStatus } from '@/types/intersection';
import apiClient from './client';

// ─── API endpoints ────────────────────────────────────────────────────────────

export const intersectionsApi = {
  /** GET /intersections */
  getAll: (): Promise<Intersection[]> =>
    apiClient.get('/intersections').then((r) => r.data),

  /** GET /intersections/:id */
  getById: (id: string): Promise<Intersection> =>
    apiClient.get(`/intersections/${id}`).then((r) => r.data),

  /** PATCH /intersections/:id/signal */
  updateSignal: (id: string, greenDuration: number): Promise<void> =>
    apiClient.patch(`/intersections/${id}/signal`, { green_duration: greenDuration }),

  /** POST /intersections/:id/emergency */
  triggerEmergency: (id: string): Promise<void> =>
    apiClient.post(`/intersections/${id}/emergency`),
};

// ─── Type helpers (also used by mock) ────────────────────────────────────────

export type { Intersection, IntersectionStatus };

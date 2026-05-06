import { useEffect } from 'react';
import { useIntersectionStore } from '@/store/intersectionStore';
import type { IntersectionStatus } from '@/types/intersection';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

/**
 * Simulates real-time intersection status updates.
 * When VITE_USE_MOCK=false, replace this with actual WebSocket messages.
 */
export function useIntersections() {
  const { intersections, selectedId, setSelectedId, updateStatus } = useIntersectionStore();

  useEffect(() => {
    if (!USE_MOCK) return; // Real-time updates come from WebSocket in production

    const interval = setInterval(() => {
      intersections.forEach((i) => {
        if (Math.random() > 0.8) {
          const statuses: IntersectionStatus[] = ['smooth', 'medium', 'congested'];
          const next = statuses[Math.floor(Math.random() * statuses.length)];
          const newVehicles = Math.max(20, i.vehicles + Math.round((Math.random() - 0.5) * 30));
          updateStatus(i.id, next, newVehicles);
        } else {
          const delta = Math.max(20, i.vehicles + Math.round((Math.random() - 0.5) * 10));
          updateStatus(i.id, i.status, delta);
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [intersections, updateStatus]);

  const selected = intersections.find((i) => i.id === selectedId) ?? intersections[0];

  return { intersections, selected, selectedId, setSelectedId };
}

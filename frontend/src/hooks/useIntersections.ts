import { useEffect } from 'react';
import { useIntersectionStore } from '@/store/intersectionStore';
import { useSmartFlow } from '@/providers/SmartFlowProvider';

/**
 * useIntersections — Fix #2 + #4
 *
 * Consumes from SmartFlowProvider context (single poller).
 * Previously called useSmartFlowApi() directly — caused duplicate polling.
 * Removed unused useCallback import (Fix #4).
 */
export function useIntersections() {
  const { intersections, selectedId, setSelectedId, updateStatus } = useIntersectionStore();

  const { apiData } = useSmartFlow();

  // Map API queue data → intersection store status
  useEffect(() => {
    const mapping: Array<{ id: string; key: 'Simpang A' | 'Simpang B' | 'Simpang C' | 'Simpang D' }> = [
      { id: 'upn', key: 'Simpang A' },
    ];

    mapping.forEach(({ id, key }) => {
      const vehicles = apiData.queue[key] ?? 0;
      const status   = vehicles > 35 ? 'congested' : vehicles > 18 ? 'medium' : 'smooth';
      updateStatus(id, status, vehicles);
    });
  }, [apiData, updateStatus]);

  const selected = intersections.find((i) => i.id === selectedId) ?? intersections[0];

  return { intersections, selected, selectedId, setSelectedId };
}

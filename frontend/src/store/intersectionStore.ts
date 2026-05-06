import { create } from 'zustand';
import type { Intersection, IntersectionStatus } from '@/types/intersection';
import { MOCK_INTERSECTIONS } from '@/mocks/intersections';

interface IntersectionState {
  intersections: Intersection[];
  selectedId: string;
  setSelectedId: (id: string) => void;
  setIntersections: (data: Intersection[]) => void;
  updateStatus: (id: string, status: IntersectionStatus, vehicles: number) => void;
}

export const useIntersectionStore = create<IntersectionState>((set) => ({
  intersections: MOCK_INTERSECTIONS,
  selectedId: 'smg',

  setSelectedId: (id) => set({ selectedId: id }),

  setIntersections: (data) => set({ intersections: data }),

  updateStatus: (id, status, vehicles) =>
    set((state) => ({
      intersections: state.intersections.map((i) =>
        i.id === id ? { ...i, status, vehicles } : i
      ),
    })),
}));

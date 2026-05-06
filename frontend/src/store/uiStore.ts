import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  darkMode: boolean;
  sidebarCollapsed: boolean;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      darkMode: false,
      sidebarCollapsed: false,
      toggleDarkMode: () =>
        set((state) => {
          const next = !state.darkMode;
          // Apply/remove .dark class on document root for Tailwind dark mode
          document.documentElement.classList.toggle('dark', next);
          return { darkMode: next };
        }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'smartflow-ui',
      onRehydrateStorage: () => (state) => {
        // Rehydrate dark mode class on page load
        if (state?.darkMode) {
          document.documentElement.classList.add('dark');
        }
      },
    }
  )
);

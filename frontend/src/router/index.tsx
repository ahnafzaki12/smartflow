import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import DashboardPage from '@/pages/DashboardPage';
import IntersectionsPage from '@/pages/IntersectionsPage';
import IntersectionDetailPage from '@/pages/IntersectionDetailPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import AlertsPage from '@/pages/AlertsPage';
import SettingsPage from '@/pages/SettingsPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true,                element: <DashboardPage /> },
      { path: 'intersections',      element: <IntersectionsPage /> },
      { path: 'intersections/:id',  element: <IntersectionDetailPage /> },
      { path: 'analytics',          element: <AnalyticsPage /> },
      { path: 'alerts',             element: <AlertsPage /> },
      { path: 'settings',           element: <SettingsPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

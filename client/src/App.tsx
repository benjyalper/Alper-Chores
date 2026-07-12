import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SchedulePage } from './pages/SchedulePage';
import { MembersPage } from './pages/MembersPage';
import { ManageChoresPage } from './pages/ManageChoresPage';
import { SettingsPage } from './pages/SettingsPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <SchedulePage /> },
      { path: 'family', element: <MembersPage /> },
      { path: 'chores', element: <ManageChoresPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <SchedulePage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}

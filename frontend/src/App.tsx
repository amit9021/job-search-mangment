import { Navigate, Route, Routes } from 'react-router-dom';
import { ShellLayout } from './layouts/ShellLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { JobsPage } from './pages/JobsPage';
import { ContactsPage } from './pages/ContactsPage';
import { GrowPage } from './pages/GrowPage';
import { TasksPage } from './pages/TasksPage';
import { ProtectedRoute } from './routes/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<ShellLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="growth" element={<GrowPage />} />
          <Route path="tasks" element={<TasksPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

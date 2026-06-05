import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/index.css';

import Layout from './components/layout/Layout';
import PrivateRoute from './components/common/PrivateRoute';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// App pages
import Dashboard from './pages/dashboard/Dashboard';
import ReportIncident from './pages/incidents/ReportIncident';
import MyIncidents from './pages/incidents/MyIncidents';
import IncidentDetails from './pages/incidents/IncidentDetails';
import ThreatIntelligence from './pages/threat/ThreatIntelligence';
import Analytics from './pages/analytics/Analytics';
import Reports from './pages/reports/Reports';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

// Admin pages
import UserManagement from './pages/admin/UserManagement';
import Assignments from './pages/admin/Assignments';
import AuditLogs from './pages/admin/AuditLogs';

const Loader = () => (
  <div className="page-loader">
    <div className="loader-ring" />
  </div>
);

const App = () => (
  <>
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected — all roles */}
      <Route element={<PrivateRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/incidents/my" element={<MyIncidents />} />
          <Route path="/incidents/:id" element={<IncidentDetails />} />
          <Route path="/threat-intelligence" element={<ThreatIntelligence />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />

          {/* Reporter + Admin */}
          <Route element={<PrivateRoute roles={['reporter', 'admin']} />}>
            <Route path="/incidents/report" element={<ReportIncident />} />
          </Route>

          {/* Admin only */}
          <Route element={<PrivateRoute roles={['admin']} />}>
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/assignments" element={<Assignments />} />
            <Route path="/admin/audit-logs" element={<AuditLogs />} />
          </Route>
        </Route>
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>

    <ToastContainer
      position="bottom-right"
      autoClose={4000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnHover
      theme="dark"
      toastClassName="sentinelx-toast"
    />
  </>
);

export default App;

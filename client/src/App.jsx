import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import AssetList from './pages/AssetList';
import AssetDetail from './pages/AssetDetail';
import PrintableQR from './pages/PrintableQR';
import UserManagement from './pages/UserManagement';
import LocationsCategories from './pages/LocationsCategories';
import MaintenanceRequests from './pages/MaintenanceRequests';
import WorkOrders from './pages/WorkOrders';
import WorkOrderDetail from './pages/WorkOrderDetail';
import PMSchedules from './pages/PMSchedules';
import Inventory from './pages/Inventory';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  return (
    <Routes>
      {/* Public Authentication routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Standalone Printable QR Sticker view */}
      <Route
        path="/assets/:id/qr"
        element={<ProtectedRoute allowedRoles={['ADMIN', 'TECHNICIAN', 'REQUESTER']} />}
      >
        <Route index element={<PrintableQR />} />
      </Route>

      {/* Main Authenticated Layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Default route redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard — Accessible to all logged-in roles (role-adaptive) */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Maintenance Requests — Requester + Admin */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'REQUESTER']} />}>
            <Route path="/requests" element={<MaintenanceRequests />} />
          </Route>

          {/* Work Orders — Technician + Admin */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'TECHNICIAN']} />}>
            <Route path="/work-orders" element={<WorkOrders />} />
            <Route path="/work-orders/:id" element={<WorkOrderDetail />} />
          </Route>

          {/* Assets & QR scanning — Accessible to all 3 roles */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'TECHNICIAN', 'REQUESTER']} />}>
            <Route path="/assets" element={<AssetList />} />
            <Route path="/assets/:id" element={<AssetDetail />} />
          </Route>

          {/* Preventive Maintenance & Inventory — Admin and Technician */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'TECHNICIAN']} />}>
            <Route path="/pm-schedules" element={<PMSchedules />} />
            <Route path="/inventory" element={<Inventory />} />
          </Route>

          {/* Reports & Exports — Admin and Technician */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'TECHNICIAN']} />}>
            <Route path="/reports" element={<Reports />} />
          </Route>

          {/* Admin Only System Configuration & User Directory */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/users" element={<UserManagement />} />
            <Route path="/locations" element={<LocationsCategories />} />
            <Route path="/audit-log" element={<StubModule title="Audit Trail" />} />
          </Route>
        </Route>
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function StubModule({ title }) {
  return (
    <div className="p-8 bg-white rounded-xl border border-gray-200 text-center">
      <div className="text-4xl mb-2">🚧</div>
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      <p className="text-sm text-gray-500 mt-1">Campus CMMS Milestone Roadmap</p>
    </div>
  );
}

export default App;

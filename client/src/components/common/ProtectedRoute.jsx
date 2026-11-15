import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md text-center">
          <div className="text-5xl mb-4 text-red-500">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800">403 — Access Denied</h2>
          <p className="text-gray-600 mt-2">
            Your current role (<span className="font-semibold text-blue-600">{user.role}</span>) does not have permission to access this module.
          </p>
          <a
            href="/assets"
            className="inline-block mt-6 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
          >
            Go to Allowed Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

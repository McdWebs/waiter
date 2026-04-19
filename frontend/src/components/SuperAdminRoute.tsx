import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSuperAdminAuth } from "./SuperAdminAuthContext";

export default function SuperAdminRoute() {
  const { token, loading } = useSuperAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    );
  }

  if (!token) {
    return (
      <Navigate to="/super-admin/login" state={{ from: location }} replace />
    );
  }

  return <Outlet />;
}

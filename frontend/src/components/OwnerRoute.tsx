import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function OwnerRoute() {
  const { token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-md px-4 py-6">
          <p className="text-sm text-slate-600">Loading your restaurant…</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/owner/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

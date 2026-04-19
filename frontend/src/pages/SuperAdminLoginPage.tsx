import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useSuperAdminAuth } from "../components/SuperAdminAuthContext";

export default function SuperAdminLoginPage() {
  const { loginSuperAdmin, token, loading } = useSuperAdminAuth();
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: { from?: { pathname?: string } };
  };
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && token) {
    return <Navigate to="/super-admin" replace />;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string) ?? "";
    const password = (formData.get("password") as string) ?? "";

    setSubmitting(true);
    setError(null);
    try {
      await loginSuperAdmin(email, password);
      const from = location.state?.from?.pathname ?? "/super-admin";
      navigate(from, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Servo
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Super Admin
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in with your super-admin credentials to manage all restaurants.
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm"
        >
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}
          <div className="space-y-1">
            <label
              htmlFor="sa-email"
              className="text-xs font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="sa-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="admin@example.com"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="sa-password"
              className="text-xs font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="sa-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

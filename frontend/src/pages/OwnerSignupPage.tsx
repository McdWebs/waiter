import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthContext";

const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "ILS", label: "ILS (₪)" },
];

export default function OwnerSignupPage() {
  const { register, token, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && token) {
    return <Navigate to="/owner" replace />;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string) ?? "";
    const password = (formData.get("password") as string) ?? "";
    const restaurantName = (formData.get("restaurantName") as string) ?? "";
    const restaurantSlug =
      ((formData.get("restaurantSlug") as string) ?? "").trim() || undefined;
    const currency = (formData.get("currency") as string) || undefined;

    setSubmitting(true);
    setError(null);
    try {
      await register({
        email,
        password,
        restaurantName,
        restaurantSlug,
        currency,
      });
      navigate("/owner", { replace: true });
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
            Create your restaurant
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Set up a restaurant, then you can build your menu and manage orders.
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
              htmlFor="restaurantName"
              className="text-xs font-medium text-slate-700"
            >
              Restaurant name
            </label>
            <input
              id="restaurantName"
              name="restaurantName"
              required
              className="w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="Demo Bistro"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="restaurantSlug"
              className="text-xs font-medium text-slate-700"
            >
              Public URL slug (optional)
            </label>
            <input
              id="restaurantSlug"
              name="restaurantSlug"
              className="w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="my-restaurant"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              This will be used in links like{" "}
              <code>/restaurant/your-slug/menu</code>. If you leave it empty,
              we&apos;ll generate one from the restaurant name.
            </p>
          </div>
          <div className="space-y-1">
            <label
              htmlFor="currency"
              className="text-xs font-medium text-slate-700"
            >
              Currency
            </label>
            <select
              id="currency"
              name="currency"
              defaultValue="USD"
              className="w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="text-xs font-medium text-slate-700"
            >
              Owner email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="password"
              className="text-xs font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="At least 8 characters"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              You&apos;ll use this email and password to sign in and manage your
              restaurant.
            </p>
          </div>
          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? "Creating…" : "Create restaurant"}
          </button>
          <div className="pt-2 text-center text-xs text-slate-600">
            <span>Already have a restaurant? </span>
            <Link
              to="/owner/login"
              className="font-semibold text-slate-900 underline-offset-2 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

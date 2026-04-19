import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <Link
          to="/owner/login"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Go to sign in
        </Link>
      </div>
    </div>
  );
}

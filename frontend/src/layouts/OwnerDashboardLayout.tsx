import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'

export default function OwnerDashboardLayout() {
  const { owner, restaurant, logout } = useAuth()
  const navigate = useNavigate()
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)

  const handleLogout = () => {
    setShowSignOutConfirm(false)
    logout()
    navigate('/owner/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="sticky top-0 z-20">
        {restaurant?.isSuspended && (
          <div
            className="border-b border-amber-300 bg-amber-100 px-3 py-2.5 text-center text-sm font-medium text-amber-900"
            role="alert"
          >
            Your restaurant is currently suspended. The public menu and new orders are disabled.
            Contact support if you believe this is an error.
          </div>
        )}
        <header className="border-b border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
          <div className="mx-auto flex max-w-5xl flex-nowrap items-center gap-2 overflow-x-auto px-2 py-1.5 sm:gap-3 sm:overflow-visible sm:px-4 sm:py-2">
            <h1 className="min-w-0 flex-shrink truncate text-sm font-bold tracking-tight text-slate-900 sm:min-w-[8rem] sm:text-base">
              <span className="text-slate-500 font-semibold">Servo</span>
              <span className="mx-1.5 text-slate-300">·</span>
              {restaurant?.name ?? 'Your restaurant'}
            </h1>
            <div className="flex flex-shrink-0 flex-nowrap items-center gap-1 sm:gap-2">
              <nav className="flex items-center gap-0.5 rounded-md bg-slate-100/80 p-0.5">
                <NavLink
                  to="/owner/menu"
                  className={({ isActive }) =>
                    `rounded px-1.5 py-1 text-[11px] font-medium transition-colors touch-manipulation sm:px-2 sm:py-1 sm:text-xs ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`
                  }
                >
                  Menu
                </NavLink>
                <NavLink
                  to="/owner/stats"
                  className={({ isActive }) =>
                    `rounded px-1.5 py-1 text-[11px] font-medium transition-colors touch-manipulation sm:px-2 sm:py-1 sm:text-xs ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`
                  }
                >
                  Stats
                </NavLink>
                <NavLink
                  to="/owner/settings"
                  className={({ isActive }) =>
                    `rounded px-1.5 py-1 text-[11px] font-medium transition-colors touch-manipulation sm:px-2 sm:py-1 sm:text-xs ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`
                  }
                >
                  Settings
                </NavLink>
                <NavLink
                  to="/owner/feedback"
                  className={({ isActive }) =>
                    `rounded px-1.5 py-1 text-[11px] font-medium transition-colors touch-manipulation sm:px-2 sm:py-1 sm:text-xs ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`
                  }
                >
                  Feedback
                </NavLink>
              </nav>
              {restaurant?.slug && (
                <a
                  href={`/restaurant/${restaurant.slug}/menu`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="touch-manipulation whitespace-nowrap rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 sm:px-2"
                >
                  <span className="sm:hidden">Menu</span>
                  <span className="hidden sm:inline">Guest menu</span>
                </a>
              )}
              {restaurant?._id && (
                <button
                  type="button"
                  className="touch-manipulation whitespace-nowrap rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 sm:px-2"
                  onClick={() => navigate(`/kitchen/${restaurant._id}`)}
                >
                  <span className="sm:hidden">Kitchen</span>
                  <span className="hidden sm:inline">Kitchen</span>
                </button>
              )}
              <div className="hidden items-center gap-1 rounded border border-slate-200 bg-slate-50/80 px-1.5 py-0.5 sm:flex">
                <span
                  className="max-w-[100px] truncate text-[11px] text-slate-600 sm:max-w-[140px]"
                  title={owner?.email ?? ''}
                >
                  {owner?.email}
                </span>
                <button
                  type="button"
                  className="touch-manipulation rounded bg-slate-800 px-1.5 py-0.5 text-[11px] font-semibold text-white transition-colors hover:bg-slate-700"
                  onClick={() => setShowSignOutConfirm(true)}
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>
      </div>
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
            <h2 className="text-sm font-semibold text-slate-900">Sign out?</h2>
            <p className="mt-2 text-xs text-slate-600">
              You will need to sign in again to access the owner dashboard.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setShowSignOutConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                onClick={handleLogout}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  )
}


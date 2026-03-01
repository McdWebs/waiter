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
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4">
          <div className="min-w-0 flex-shrink-0">
            <h1 className="truncate text-base font-bold tracking-tight text-slate-900">
              {restaurant?.name ?? 'Your restaurant'}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <nav className="flex items-center gap-0.5 rounded-lg bg-slate-100/80 p-0.5">
              <NavLink
                to="/owner/menu"
                className={({ isActive }) =>
                  `rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors touch-manipulation inline-flex items-center ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                Menu
              </NavLink>
              <NavLink
                to="/owner/settings"
                className={({ isActive }) =>
                  `rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors touch-manipulation inline-flex items-center ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                Settings
              </NavLink>
            </nav>
            {restaurant?.slug && (
              <a
                href={`/restaurant/${restaurant.slug}/menu`}
                target="_blank"
                rel="noopener noreferrer"
                className="touch-manipulation rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 sm:px-3"
              >
                <span className="sm:hidden">View menu</span>
                <span className="hidden sm:inline">View guest menu</span>
              </a>
            )}
            {restaurant?._id && (
              <button
                type="button"
                className="touch-manipulation rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 sm:px-3"
                onClick={() => navigate(`/kitchen/${restaurant._id}`)}
              >
                <span className="sm:hidden">Kitchen</span>
                <span className="hidden sm:inline">Open kitchen</span>
              </button>
            )}
            <div className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 sm:flex">
              <span
                className="max-w-[120px] truncate text-[11px] text-slate-600 sm:max-w-[180px]"
                title={owner?.email ?? ''}
              >
                {owner?.email}
              </span>
              <button
                type="button"
                className="touch-manipulation rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-slate-700"
                onClick={() => setShowSignOutConfirm(true)}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>
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


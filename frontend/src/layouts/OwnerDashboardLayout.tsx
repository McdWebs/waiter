import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'

export default function OwnerDashboardLayout() {
  const { restaurant, logout } = useAuth()
  const navigate = useNavigate()
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    setShowSignOutConfirm(false)
    logout()
    navigate('/owner/login', { replace: true })
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors touch-manipulation ${
      isActive
        ? 'bg-white text-slate-900 shadow-sm'
        : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
    }`

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation ${
      isActive
        ? 'bg-slate-900 text-white'
        : 'text-slate-700 hover:bg-slate-100'
    }`

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Sticky top bar: suspension banner + header */}
      <div className="sticky top-0 z-20">
        {restaurant?.isSuspended && (
          <div
            className="border-b border-amber-300 bg-amber-100 px-4 py-2.5 text-center text-xs font-medium text-amber-900"
            role="alert"
          >
            Your restaurant is suspended — the public menu and new orders are disabled.{' '}
            <span className="underline underline-offset-2">Contact support</span> if this is an error.
          </div>
        )}

        <header className="border-b border-slate-200 bg-white shadow-sm">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
            {/* Brand + restaurant name */}
            <div className="min-w-0 flex-shrink-0">
              <span className="text-sm font-bold tracking-tight text-slate-900">
                <span className="text-slate-400 font-semibold">Servo</span>
                {restaurant?.name && (
                  <>
                    <span className="mx-2 text-slate-300">·</span>
                    <span className="truncate text-slate-900">{restaurant.name}</span>
                  </>
                )}
              </span>
            </div>

            {/* Desktop nav */}
            <div className="ml-auto hidden items-center gap-2 sm:flex">
              <nav className="flex items-center gap-0.5 rounded-lg bg-slate-100/80 p-0.5">
                <NavLink to="/owner/menu" className={navLinkClass}>Menu</NavLink>
                <NavLink to="/owner/stats" className={navLinkClass}>Stats</NavLink>
                <NavLink to="/owner/settings" className={navLinkClass}>Settings</NavLink>
                <NavLink to="/owner/feedback" className={navLinkClass}>Feedback</NavLink>
              </nav>

              {/* External links */}
              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2.5">
                {restaurant?.slug && (
                  <a
                    href={`/restaurant/${restaurant.slug}/menu`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
                  >
                    Guest menu
                    <svg className="h-3 w-3 opacity-50" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 10L10 2M10 2H6M10 2v4" />
                    </svg>
                  </a>
                )}
                {restaurant?._id && (
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
                    onClick={() => navigate(`/kitchen/${restaurant._id}`)}
                  >
                    Kitchen
                  </button>
                )}
                <button
                  type="button"
                  className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-rose-100 hover:text-rose-700"
                  onClick={() => setShowSignOutConfirm(true)}
                >
                  Sign out
                </button>
              </div>
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 sm:hidden"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label="Toggle navigation"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l10 10M13 3L3 13" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 4h12M2 8h12M2 12h12" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile drawer */}
          <div
            className={`overflow-hidden border-t border-slate-100 bg-white transition-all duration-200 ease-out sm:hidden ${
              mobileMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
            }`}
          >
            <div className="space-y-1 px-3 pb-3 pt-2">
              <nav className="space-y-0.5">
                <NavLink to="/owner/menu" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                  Menu
                </NavLink>
                <NavLink to="/owner/stats" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                  Stats
                </NavLink>
                <NavLink to="/owner/settings" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                  Settings
                </NavLink>
                <NavLink to="/owner/feedback" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                  Feedback
                </NavLink>
              </nav>

              <div className="mt-2 border-t border-slate-100 pt-2 space-y-0.5">
                {restaurant?.slug && (
                  <a
                    href={`/restaurant/${restaurant.slug}/menu`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>Guest menu</span>
                    <svg className="h-3.5 w-3.5 opacity-40" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 10L10 2M10 2H6M10 2v4" />
                    </svg>
                  </a>
                )}
                {restaurant?._id && (
                  <button
                    type="button"
                    className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      navigate(`/kitchen/${restaurant._id}`)
                    }}
                  >
                    Kitchen
                  </button>
                )}
                <button
                  type="button"
                  className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setShowSignOutConfirm(true)
                  }}
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Sign-out confirmation modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-sm font-semibold text-slate-900">Sign out?</h2>
            <p className="mt-1.5 text-xs text-slate-500">
              You&apos;ll need to sign in again to access the owner dashboard.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setShowSignOutConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                onClick={handleLogout}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

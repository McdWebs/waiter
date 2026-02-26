import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'

export default function OwnerDashboardLayout() {
  const { owner, restaurant, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/owner/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {restaurant?.name ?? 'Your restaurant'}
            </div>
            <div className="text-[11px] text-slate-500">
              {restaurant?.slug ? `/restaurant/${restaurant.slug}/menu` : 'No public link yet'}
            </div>
          </div>
          <nav className="flex items-center gap-4 text-xs">
            <NavLink
              to="/owner/menu"
              className={({ isActive }) =>
                `rounded-full px-3 py-1 font-medium ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              Menu
            </NavLink>
            <NavLink
              to="/owner/settings"
              className={({ isActive }) =>
                `rounded-full px-3 py-1 font-medium ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              Settings
            </NavLink>
            {restaurant?._id && (
              <button
                type="button"
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                onClick={() => navigate(`/kitchen/${restaurant._id}`)}
              >
                Open kitchen view
              </button>
            )}
            <div className="ml-3 flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
              <span className="text-[11px] text-slate-700">{owner?.email}</span>
              <button
                type="button"
                className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white hover:bg-slate-800"
                onClick={handleLogout}
              >
                Sign out
              </button>
            </div>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}


import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useSuperAdminAuth } from '../components/SuperAdminAuthContext'
import { apiFetch } from '../lib/api'
import type { Restaurant } from '../components/types'
import { BarChartCard, StatCard } from '../components/stats'

interface ListItem {
  restaurant: Restaurant & { createdAt?: string; updatedAt?: string }
  ownerEmail: string | null
}

interface Stats {
  totalRestaurants: number
  totalOrders: number
  ordersToday: number
  ordersThisWeek?: number
  ordersThisMonth?: number
  openWaiterCalls: number
  waiterCallsHandled?: number
  waiterCallsHandledThisWeek?: number
  avgWaiterResponseMinutes?: number | null
  totalFeedback?: number
  chatSessionsTotal?: number
  chatSessionsThisWeek?: number
  totalRevenue?: number
}

interface FeedbackItem {
  _id: string
  restaurantId: string
  restaurantName: string
  ownerEmail: string
  type: 'feedback' | 'bug'
  message: string
  status: 'new' | 'read' | 'replied'
  adminReply?: string
  adminRepliedAt?: string
  createdAt: string
}

interface RestaurantDetail {
  restaurant: Restaurant & { createdAt?: string; updatedAt?: string }
  owner: { email: string; createdAt: string } | null
}

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'ILS', label: 'ILS (₪)' },
] as const

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400'
const labelClass = 'text-xs font-medium text-slate-700'

export default function SuperAdminDashboardPage() {
  const { token, superAdmin, logoutSuperAdmin } = useSuperAdminAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [list, setList] = useState<ListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string | number | boolean>>({})
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySaving, setReplySaving] = useState(false)
  const [markingReadId, setMarkingReadId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'restaurants' | 'stats'>('restaurants')

  const fetchStats = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiFetch<Stats>('/api/super-admin/stats', { token })
      setStats(data)
    } catch {
      setStats(null)
    }
  }, [token])

  const fetchList = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      const data = await apiFetch<{ items: ListItem[]; total: number }>(
        `/api/super-admin/restaurants?${params.toString()}`,
        { token }
      )
      setList(data.items)
      setTotal(data.total)
    } catch (err) {
      setError((err as Error).message)
      setList([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [token, search])

  const fetchFeedback = useCallback(async () => {
    if (!token) return
    setFeedbackLoading(true)
    try {
      const data = await apiFetch<{ items: FeedbackItem[] }>('/api/super-admin/feedback', {
        token,
      })
      setFeedbackList(data.items)
    } catch {
      setFeedbackList([])
    } finally {
      setFeedbackLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    fetchFeedback()
  }, [fetchFeedback])

  const handleMarkFeedbackRead = useCallback(
    async (id: string) => {
      if (!token) return
      setMarkingReadId(id)
      try {
        await apiFetch(`/api/super-admin/feedback/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'read' }),
          token,
        })
        await fetchFeedback()
        await fetchStats()
      } catch {
        // ignore
      } finally {
        setMarkingReadId(null)
      }
    },
    [token, fetchFeedback, fetchStats]
  )

  const handleReplySubmit = useCallback(
    async (id: string) => {
      if (!token || !replyText.trim()) return
      setReplySaving(true)
      try {
        await apiFetch(`/api/super-admin/feedback/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ adminReply: replyText.trim() }),
          token,
        })
        setReplyingId(null)
        setReplyText('')
        await fetchFeedback()
        await fetchStats()
      } catch {
        // ignore
      } finally {
        setReplySaving(false)
      }
    },
    [token, replyText, fetchFeedback, fetchStats]
  )

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const openEdit = useCallback(
    async (id: string) => {
      if (!token) return
      setEditId(id)
      setEditError(null)
      try {
        const data = await apiFetch<RestaurantDetail>(`/api/super-admin/restaurants/${id}`, {
          token,
        })
        const r = data.restaurant
        setEditForm({
          name: r.name ?? '',
          slug: r.slug ?? '',
          currency: r.currency ?? 'USD',
          address: r.address ?? '',
          phone: r.phone ?? '',
          contactEmail: r.contactEmail ?? '',
          description: r.description ?? '',
          restaurantType: r.restaurantType ?? '',
          timezone: r.timezone ?? 'UTC',
          openingHoursNote: r.openingHoursNote ?? '',
          taxRatePercent: r.taxRatePercent ?? '',
          serviceChargePercent: r.serviceChargePercent ?? '',
          allowOrders: r.allowOrders ?? true,
          orderLeadTimeMinutes: r.orderLeadTimeMinutes ?? 15,
          aiInstructions: r.aiInstructions ?? '',
          isSuspended: r.isSuspended ?? false,
        })
      } catch (err) {
        setEditError((err as Error).message)
      }
    },
    [token]
  )

  const closeEdit = useCallback(() => {
    setEditId(null)
    setEditError(null)
    setEditSaving(false)
  }, [])

  const handleEditChange = useCallback((field: string, value: string | number | boolean) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleEditSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!token || !editId) return
      setEditSaving(true)
      setEditError(null)
      try {
        const body: Record<string, unknown> = {
          name: String(editForm.name).trim(),
          slug: String(editForm.slug).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
          currency: String(editForm.currency).trim(),
          address: String(editForm.address).trim() || undefined,
          phone: String(editForm.phone).trim() || undefined,
          contactEmail: String(editForm.contactEmail).trim() || undefined,
          description: String(editForm.description).trim() || undefined,
          restaurantType: String(editForm.restaurantType).trim() || undefined,
          timezone: String(editForm.timezone).trim() || undefined,
          openingHoursNote: String(editForm.openingHoursNote).trim() || undefined,
          allowOrders: Boolean(editForm.allowOrders),
          orderLeadTimeMinutes: Number(editForm.orderLeadTimeMinutes) || 0,
          aiInstructions: String(editForm.aiInstructions).trim() || undefined,
          isSuspended: Boolean(editForm.isSuspended),
        }
        const tax = parseFloat(String(editForm.taxRatePercent))
        if (!Number.isNaN(tax) && tax >= 0) body.taxRatePercent = tax
        const service = parseFloat(String(editForm.serviceChargePercent))
        if (!Number.isNaN(service) && service >= 0) body.serviceChargePercent = service

        await apiFetch<Restaurant>(`/api/super-admin/restaurants/${editId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(body),
        })
        closeEdit()
        fetchList()
        fetchStats()
      } catch (err) {
        setEditError((err as Error).message)
      } finally {
        setEditSaving(false)
      }
    },
    [token, editId, editForm, closeEdit, fetchList, fetchStats]
  )

  const toggleSuspend = useCallback(
    async (id: string, suspended: boolean) => {
      if (!token) return
      try {
        await apiFetch(`/api/super-admin/restaurants/${id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({ isSuspended: suspended }),
        })
        fetchList()
        fetchStats()
        if (editId === id) setEditForm((prev) => ({ ...prev, isSuspended: suspended }))
      } catch (err) {
        setError((err as Error).message)
      }
    },
    [token, editId, fetchList, fetchStats]
  )

  const cancelDelete = useCallback(() => setDeleteId(null), [])

  const doDelete = useCallback(async () => {
    if (!token || !deleteId) return
    const idToDelete = deleteId
    setDeleteId(null)
    try {
      await apiFetch(`/api/super-admin/restaurants/${idToDelete}`, {
        method: 'DELETE',
        token,
      })
      fetchList()
      fetchStats()
      if (editId === idToDelete) closeEdit()
    } catch (err) {
      setError((err as Error).message)
    }
  }, [token, deleteId, editId, closeEdit, fetchList, fetchStats])

  const handleSignOut = useCallback(() => {
    logoutSuperAdmin()
    navigate('/super-admin/login', { replace: true })
  }, [logoutSuperAdmin, navigate])

  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Super Admin</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{superAdmin?.email ?? ''}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mb-6 flex gap-0.5 rounded-lg bg-slate-100/80 p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('restaurants')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'restaurants'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Restaurants
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'stats'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stats
          </button>
        </div>

        {activeTab === 'stats' && (
        <section className="mb-8 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold text-slate-900">Platform stats</h2>
            <button
              type="button"
              onClick={() => fetchStats()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <span className="inline-block">↻</span>
              Refresh
            </button>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Overview
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="Restaurants"
                value={stats?.totalRestaurants ?? '—'}
                accent="emerald"
              />
              <StatCard
                label="Total orders"
                value={stats?.totalOrders ?? '—'}
                accent="blue"
              />
              <StatCard
                label="Orders today"
                value={stats?.ordersToday ?? '—'}
                accent="violet"
              />
              <StatCard
                label="Total revenue"
                value={
                  typeof stats?.totalRevenue === 'number'
                    ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(stats.totalRevenue)
                    : '—'
                }
                accent="slate"
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <BarChartCard
              title="Orders by period"
              data={[
                { name: 'Today', value: stats?.ordersToday ?? 0 },
                { name: 'This week', value: stats?.ordersThisWeek ?? 0 },
                { name: 'This month', value: stats?.ordersThisMonth ?? 0 },
              ]}
            />
            <BarChartCard
              title="Platform engagement (this week)"
              data={[
                { name: 'Waiter calls', value: stats?.waiterCallsHandledThisWeek ?? 0 },
                { name: 'Chat sessions', value: stats?.chatSessionsThisWeek ?? 0 },
              ]}
              barColors={['#f59e0b', '#8b5cf6']}
            />
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Operations & support
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard
                label="Open waiter calls"
                value={stats?.openWaiterCalls ?? '—'}
                accent="amber"
              />
              <StatCard
                label="Waiter calls handled"
                value={stats?.waiterCallsHandled ?? '—'}
                accent="slate"
              />
              <StatCard
                label="Avg response (min)"
                value={
                  typeof stats?.avgWaiterResponseMinutes === 'number'
                    ? stats.avgWaiterResponseMinutes.toFixed(1)
                    : '—'
                }
                accent="slate"
              />
              <StatCard
                label="Chat sessions"
                value={stats?.chatSessionsTotal ?? '—'}
                sublabel={`${stats?.chatSessionsThisWeek ?? 0} this week`}
                accent="violet"
              />
              <StatCard
                label="Feedback / bugs"
                value={stats?.totalFeedback ?? '—'}
                accent="slate"
              />
            </div>
          </div>
        </section>
        )}

        {activeTab === 'restaurants' && (
        <>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-baseline gap-2">
                <h2 className="text-base font-semibold text-slate-900">Restaurants</h2>
                <span className="text-sm text-slate-500">{total} total</span>
              </div>
              <input
                type="search"
                placeholder="Search by name or slug…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 sm:max-w-xs"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="px-5 py-12 text-center text-sm text-slate-500">Loading…</div>
            ) : list.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-slate-500">
                No restaurants found.
              </div>
            ) : (
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/60 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Slug</th>
                    <th className="px-5 py-3">Owner</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(({ restaurant, ownerEmail }) => (
                    <tr
                      key={restaurant._id}
                      className="border-b border-slate-100 transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-3 font-medium text-slate-900">{restaurant.name}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-600">{restaurant.slug}</td>
                      <td className="px-5 py-3 text-slate-600">{ownerEmail ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span
                          className={
                            restaurant.isSuspended
                              ? 'inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800'
                              : 'inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800'
                          }
                        >
                          {restaurant.isSuspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(restaurant._id)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:border-slate-300"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              toggleSuspend(restaurant._id, !restaurant.isSuspended)
                            }
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:border-slate-300"
                          >
                            {restaurant.isSuspended ? 'Resume' : 'Suspend'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(restaurant._id)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 hover:border-rose-300"
                          >
                            Delete
                          </button>
                          <a
                            href={`${baseUrl}/restaurant/${restaurant.slug}/menu`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900"
                          >
                            Guest menu
                          </a>
                          <a
                            href={`${baseUrl}/kitchen/${restaurant._id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900"
                          >
                            Kitchen
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Feedback / Bug reports</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Messages from restaurant owners (feedback and bug reports).
            </p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {feedbackLoading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">Loading…</div>
            ) : feedbackList.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                No feedback or bug reports yet.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {feedbackList.map((item) => (
                  <li key={item._id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={
                          item.type === 'bug'
                            ? 'rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-800'
                            : 'rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700'
                        }
                      >
                        {item.type === 'bug' ? 'Bug' : 'Feedback'}
                      </span>
                      <span
                        className={
                          (item.status ?? 'new') === 'replied'
                            ? 'rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800'
                            : (item.status ?? 'new') === 'read'
                              ? 'rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-800'
                              : 'rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800'
                        }
                      >
                        {(item.status ?? 'new') === 'new'
                          ? 'New'
                          : (item.status ?? 'new') === 'read'
                            ? 'Seen'
                            : 'Replied'}
                      </span>
                      <span className="font-medium text-slate-900">{item.restaurantName}</span>
                      <span className="text-slate-500">{item.ownerEmail}</span>
                      <span className="text-slate-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-700 whitespace-pre-wrap">{item.message}</p>
                    {(item.status ?? 'new') === 'replied' && item.adminReply && (
                      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                        <p className="text-[11px] font-medium text-slate-600">Your reply</p>
                        <p className="mt-0.5 text-sm text-slate-700 whitespace-pre-wrap">
                          {item.adminReply}
                        </p>
                        {item.adminRepliedAt && (
                          <p className="mt-1 text-[10px] text-slate-500">
                            {new Date(item.adminRepliedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(item.status ?? 'new') === 'new' && (
                        <button
                          type="button"
                          disabled={markingReadId === item._id}
                          onClick={() => handleMarkFeedbackRead(item._id)}
                          className="rounded bg-sky-100 px-2 py-1 text-xs font-medium text-sky-800 hover:bg-sky-200 disabled:opacity-50"
                        >
                          {markingReadId === item._id ? 'Updating…' : 'Mark as read'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingId(replyingId === item._id ? null : item._id)
                          setReplyText(item.adminReply ?? '')
                        }}
                        className="rounded bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-300"
                      >
                        {replyingId === item._id ? 'Cancel reply' : 'Reply'}
                      </button>
                    </div>
                    {replyingId === item._id && (
                      <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                        <textarea
                          rows={3}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type your reply to the owner…"
                          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
                        />
                        <div className="mt-2 flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingId(null)
                              setReplyText('')
                            }}
                            className="rounded bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-300"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={replySaving || !replyText.trim()}
                            onClick={() => handleReplySubmit(item._id)}
                            className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {replySaving ? 'Sending…' : 'Send reply'}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
        </>
        )}
      </main>

      {/* Edit modal */}
      {editId && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.target === e.currentTarget && closeEdit()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 border-b border-slate-200 bg-white px-4 py-3">
              <h2 id="edit-modal-title" className="text-sm font-semibold text-slate-900">
                Edit restaurant
              </h2>
              <button
                type="button"
                onClick={closeEdit}
                className="absolute right-4 top-3 text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4 p-4">
              {editError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {editError}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="edit-name" className={labelClass}>
                  Name
                </label>
                <input
                  id="edit-name"
                  value={editForm.name as string}
                  onChange={(e) => handleEditChange('name', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-slug" className={labelClass}>
                  Slug
                </label>
                <input
                  id="edit-slug"
                  value={editForm.slug as string}
                  onChange={(e) => handleEditChange('slug', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-currency" className={labelClass}>
                  Currency
                </label>
                <select
                  id="edit-currency"
                  value={editForm.currency as string}
                  onChange={(e) => handleEditChange('currency', e.target.value)}
                  className={inputClass}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-address" className={labelClass}>
                  Address
                </label>
                <input
                  id="edit-address"
                  value={editForm.address as string}
                  onChange={(e) => handleEditChange('address', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-phone" className={labelClass}>
                  Phone
                </label>
                <input
                  id="edit-phone"
                  value={editForm.phone as string}
                  onChange={(e) => handleEditChange('phone', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-contactEmail" className={labelClass}>
                  Contact email
                </label>
                <input
                  id="edit-contactEmail"
                  type="email"
                  value={editForm.contactEmail as string}
                  onChange={(e) => handleEditChange('contactEmail', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-restaurantType" className={labelClass}>
                  Restaurant type
                </label>
                <input
                  id="edit-restaurantType"
                  value={editForm.restaurantType as string}
                  onChange={(e) => handleEditChange('restaurantType', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Italian, Cafe"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-description" className={labelClass}>
                  Description
                </label>
                <textarea
                  id="edit-description"
                  value={editForm.description as string}
                  onChange={(e) => handleEditChange('description', e.target.value)}
                  className="min-h-[60px] w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-timezone" className={labelClass}>
                  Timezone
                </label>
                <input
                  id="edit-timezone"
                  value={editForm.timezone as string}
                  onChange={(e) => handleEditChange('timezone', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-openingHoursNote" className={labelClass}>
                  Opening hours note
                </label>
                <input
                  id="edit-openingHoursNote"
                  value={editForm.openingHoursNote as string}
                  onChange={(e) => handleEditChange('openingHoursNote', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label htmlFor="edit-taxRatePercent" className={labelClass}>
                    Tax %
                  </label>
                  <input
                    id="edit-taxRatePercent"
                    type="number"
                    min={0}
                    step={0.01}
                    value={editForm.taxRatePercent as number}
                    onChange={(e) =>
                      handleEditChange(
                        'taxRatePercent',
                        e.target.value === '' ? '' : parseFloat(e.target.value)
                      )
                    }
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-serviceChargePercent" className={labelClass}>
                    Service charge %
                  </label>
                  <input
                    id="edit-serviceChargePercent"
                    type="number"
                    min={0}
                    step={0.01}
                    value={editForm.serviceChargePercent as number}
                    onChange={(e) =>
                      handleEditChange(
                        'serviceChargePercent',
                        e.target.value === '' ? '' : parseFloat(e.target.value)
                      )
                    }
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-orderLeadTimeMinutes" className={labelClass}>
                  Order lead time (minutes)
                </label>
                <input
                  id="edit-orderLeadTimeMinutes"
                  type="number"
                  min={0}
                  value={editForm.orderLeadTimeMinutes as number}
                  onChange={(e) =>
                    handleEditChange('orderLeadTimeMinutes', parseInt(e.target.value, 10) || 0)
                  }
                  className={inputClass}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="edit-allowOrders"
                  type="checkbox"
                  checked={Boolean(editForm.allowOrders)}
                  onChange={(e) => handleEditChange('allowOrders', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <label htmlFor="edit-allowOrders" className={labelClass}>
                  Allow orders
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="edit-isSuspended"
                  type="checkbox"
                  checked={Boolean(editForm.isSuspended)}
                  onChange={(e) => handleEditChange('isSuspended', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <label htmlFor="edit-isSuspended" className={labelClass}>
                  Suspended (restaurant disabled)
                </label>
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-aiInstructions" className={labelClass}>
                  AI instructions
                </label>
                <textarea
                  id="edit-aiInstructions"
                  value={editForm.aiInstructions as string}
                  onChange={(e) => handleEditChange('aiInstructions', e.target.value)}
                  className="min-h-[60px] w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {editSaving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <h2 id="delete-modal-title" className="text-sm font-semibold text-slate-900">
              Delete restaurant?
            </h2>
            <p className="mt-2 text-xs text-slate-600">
              This will permanently delete the restaurant, its owner account, menu, tables, and
              orders. This cannot be undone.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={doDelete}
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={cancelDelete}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

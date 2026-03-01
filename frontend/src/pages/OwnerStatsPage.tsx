import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../components/AuthContext'
import { apiFetch } from '../lib/api'

interface OwnerStats {
  ordersToday: number
  ordersThisWeek: number
  ordersThisMonth: number
  totalOrders: number
  revenueToday: number
  revenueThisWeek: number
  revenueThisMonth: number
  totalRevenue: number
  avgOrderValue: number | null
  waiterCallsHandled: number
  waiterCallsHandledThisWeek: number
  avgWaiterResponseMinutes: number | null
  chatSessionsTotal: number
  chatSessionsThisWeek: number
  currency: string
}

const CARD_CLASS =
  'rounded-xl border border-slate-200 bg-white p-4 shadow-sm'

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function OwnerStatsPage() {
  const { token } = useAuth()
  const [stats, setStats] = useState<OwnerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<OwnerStats>('/api/owner/stats', { token })
      setStats(data)
    } catch (err) {
      setError((err as Error).message)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-500">Loading stats…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {error}
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const currency = stats.currency || 'USD'

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Your restaurant stats</h2>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className={CARD_CLASS}>
          <p className="text-xs font-medium text-slate-500">Orders today</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.ordersToday}</p>
        </div>
        <div className={CARD_CLASS}>
          <p className="text-xs font-medium text-slate-500">Orders this week</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.ordersThisWeek}</p>
        </div>
        <div className={CARD_CLASS}>
          <p className="text-xs font-medium text-slate-500">Orders this month</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.ordersThisMonth}</p>
        </div>
        <div className={CARD_CLASS}>
          <p className="text-xs font-medium text-slate-500">Total orders</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.totalOrders}</p>
        </div>
        <div className={CARD_CLASS}>
          <p className="text-xs font-medium text-slate-500">Revenue today</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatCurrency(stats.revenueToday, currency)}
          </p>
        </div>
        <div className={CARD_CLASS}>
          <p className="text-xs font-medium text-slate-500">Revenue this week</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatCurrency(stats.revenueThisWeek, currency)}
          </p>
        </div>
        <div className={CARD_CLASS}>
          <p className="text-xs font-medium text-slate-500">Revenue this month</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatCurrency(stats.revenueThisMonth, currency)}
          </p>
        </div>
        <div className={CARD_CLASS}>
          <p className="text-xs font-medium text-slate-500">Total revenue</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatCurrency(stats.totalRevenue, currency)}
          </p>
        </div>
        <div className={CARD_CLASS}>
          <p className="text-xs font-medium text-slate-500">Avg order value</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {stats.avgOrderValue != null
              ? formatCurrency(stats.avgOrderValue, currency)
              : '—'}
          </p>
        </div>
        <div className={CARD_CLASS}>
          <p className="text-xs font-medium text-slate-500">Waiter calls handled</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {stats.waiterCallsHandled}
          </p>
        </div>
        <div className={CARD_CLASS}>
          <p className="text-xs font-medium text-slate-500">Waiter calls (this week)</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {stats.waiterCallsHandledThisWeek}
          </p>
        </div>
        <div className={CARD_CLASS}>
          <p className="text-xs font-medium text-slate-500">Avg waiter response (min)</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {typeof stats.avgWaiterResponseMinutes === 'number'
              ? stats.avgWaiterResponseMinutes.toFixed(1)
              : '—'}
          </p>
        </div>
        <div className={CARD_CLASS}>
          <p className="text-xs font-medium text-slate-500">Chat sessions (total)</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {stats.chatSessionsTotal}
          </p>
        </div>
        <div className={CARD_CLASS}>
          <p className="text-xs font-medium text-slate-500">Chat sessions (this week)</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {stats.chatSessionsThisWeek}
          </p>
        </div>
      </section>
    </div>
  )
}

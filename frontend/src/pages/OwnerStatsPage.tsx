import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../components/AuthContext'
import { apiFetch } from '../lib/api'
import { BarChartCard, StatCard } from '../components/stats'

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
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = useCallback(async (showRefreshing = false) => {
    if (!token) return
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<OwnerStats>('/api/owner/stats', { token })
      setStats(data)
    } catch (err) {
      setError((err as Error).message)
      setStats(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleRefresh = () => fetchStats(true)

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50/50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          <p className="mt-3 text-sm text-slate-500">Loading stats…</p>
        </div>
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

  if (!stats) return null

  const currency = stats.currency || 'USD'
  const revenueFormatter = (n: number) => formatCurrency(n, currency)

  const ordersChartData = [
    { name: 'Today', value: stats.ordersToday },
    { name: 'This week', value: stats.ordersThisWeek },
    { name: 'This month', value: stats.ordersThisMonth },
  ]

  const revenueChartData = [
    { name: 'Today', value: stats.revenueToday },
    { name: 'This week', value: stats.revenueThisWeek },
    { name: 'This month', value: stats.revenueThisMonth },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-slate-900">Your restaurant stats</h2>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          <span
            className={`inline-block h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
          >
            ↻
          </span>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Overview KPIs */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Overview
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Orders today"
            value={stats.ordersToday}
            accent="emerald"
          />
          <StatCard
            label="Revenue today"
            value={formatCurrency(stats.revenueToday, currency)}
            accent="blue"
          />
          <StatCard
            label="Avg order value"
            value={
              stats.avgOrderValue != null
                ? formatCurrency(stats.avgOrderValue, currency)
                : '—'
            }
            accent="violet"
          />
          <StatCard
            label="Total orders"
            value={stats.totalOrders}
            sublabel="All time"
            accent="slate"
          />
        </div>
      </section>

      {/* Charts */}
      <section className="grid gap-6 lg:grid-cols-2">
        <BarChartCard
          title="Orders by period"
          data={ordersChartData}
        />
        <BarChartCard
          title="Revenue by period"
          data={revenueChartData}
          valueFormatter={revenueFormatter}
          barColors={['#3b82f6', '#60a5fa', '#93c5fd']}
        />
      </section>

      {/* Revenue breakdown */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Revenue
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Today"
            value={formatCurrency(stats.revenueToday, currency)}
            accent="slate"
          />
          <StatCard
            label="This week"
            value={formatCurrency(stats.revenueThisWeek, currency)}
            accent="slate"
          />
          <StatCard
            label="This month"
            value={formatCurrency(stats.revenueThisMonth, currency)}
            accent="slate"
          />
          <StatCard
            label="Total revenue"
            value={formatCurrency(stats.totalRevenue, currency)}
            accent="emerald"
          />
        </div>
      </section>

      {/* Operations */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Operations & engagement
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Waiter calls handled"
            value={stats.waiterCallsHandled}
            sublabel="All time"
            accent="amber"
          />
          <StatCard
            label="Waiter calls (this week)"
            value={stats.waiterCallsHandledThisWeek}
            accent="slate"
          />
          <StatCard
            label="Avg response time"
            value={
              typeof stats.avgWaiterResponseMinutes === 'number'
                ? `${stats.avgWaiterResponseMinutes.toFixed(1)} min`
                : '—'
            }
            accent="slate"
          />
          <StatCard
            label="Chat sessions"
            value={stats.chatSessionsTotal}
            sublabel={`${stats.chatSessionsThisWeek} this week`}
            accent="violet"
          />
        </div>
      </section>
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../components/AuthContext'
import { apiFetch } from '../lib/api'
import { StatCard } from '../components/stats'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

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

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

export default function OwnerStatsPage() {
  const { token } = useAuth()
  const [stats, setStats] = useState<OwnerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchStats = useCallback(async (showRefreshing = false) => {
    if (!token) return
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<OwnerStats>('/api/owner/stats', { token })
      setStats(data)
      setLastUpdated(new Date())
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
      <div className="space-y-8 animate-pulse">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-6 w-40 rounded-full bg-slate-200" />
          <div className="h-8 w-24 rounded-full bg-slate-200" />
        </div>

        {/* Overview skeleton */}
        <section>
          <div className="mb-3 h-3 w-24 rounded-full bg-slate-200" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={`overview-skeleton-${idx}`}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3"
              >
                <div className="h-3 w-20 rounded-full bg-slate-200" />
                <div className="mt-3 h-5 w-16 rounded-full bg-slate-200" />
                <div className="mt-1 h-3 w-12 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </section>

        {/* Charts skeleton */}
        <section className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={`charts-skeleton-${idx}`} className="rounded-xl border border-slate-200 bg-white px-4 py-4">
              <div className="h-4 w-32 rounded-full bg-slate-200" />
              <div className="mt-4 h-32 rounded-lg bg-slate-100" />
            </div>
          ))}
        </section>

        {/* Revenue skeleton */}
        <section>
          <div className="mb-3 h-3 w-24 rounded-full bg-slate-200" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={`revenue-skeleton-${idx}`} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <div className="h-3 w-16 rounded-full bg-slate-200" />
                <div className="mt-3 h-5 w-20 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        </section>

        {/* Operations skeleton */}
        <section>
          <div className="mb-3 h-3 w-40 rounded-full bg-slate-200" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={`operations-skeleton-${idx}`} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <div className="h-3 w-24 rounded-full bg-slate-200" />
                <div className="mt-3 h-5 w-16 rounded-full bg-slate-200" />
                <div className="mt-1 h-3 w-20 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </section>
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
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const weekToDateDays = Math.min(7, now.getDay() === 0 ? 7 : now.getDay())
  const weekDailyAverage = stats.ordersThisWeek / Math.max(1, weekToDateDays)
  const projectedMonthlyRevenue = (stats.revenueThisMonth / Math.max(1, dayOfMonth)) * daysInMonth
  const ordersMomentum = weekDailyAverage > 0
    ? ((stats.ordersToday - weekDailyAverage) / weekDailyAverage) * 100
    : 0
  const revenueRunRateDelta = stats.revenueThisMonth > 0
    ? ((projectedMonthlyRevenue - stats.revenueThisMonth) / stats.revenueThisMonth) * 100
    : 0
  const automationShare = stats.ordersThisWeek > 0
    ? (stats.chatSessionsThisWeek / stats.ordersThisWeek) * 100
    : 0
  const supportLoad = stats.ordersThisWeek > 0
    ? (stats.waiterCallsHandledThisWeek / stats.ordersThisWeek) * 100
    : 0
  const responseTime = stats.avgWaiterResponseMinutes
  const responseScore = typeof responseTime === 'number'
    ? Math.max(0, Math.min(100, 100 - (responseTime / 8) * 100))
    : 0
  const responseHealth = typeof responseTime === 'number'
    ? responseTime <= 2
      ? 'Excellent'
      : responseTime <= 4
        ? 'Good'
        : 'Needs attention'
    : 'Unknown'

  const periodData = [
    {
      period: 'Today',
      orders: stats.ordersToday,
      revenue: stats.revenueToday,
    },
    {
      period: 'This week',
      orders: stats.ordersThisWeek,
      revenue: stats.revenueThisWeek,
    },
    {
      period: 'This month',
      orders: stats.ordersThisMonth,
      revenue: stats.revenueThisMonth,
    },
  ]

  const channelMixData = [
    { name: 'Chat assisted', value: Math.max(0, stats.chatSessionsThisWeek) },
    { name: 'Waiter assisted', value: Math.max(0, stats.waiterCallsHandledThisWeek) },
    {
      name: 'Direct',
      value: Math.max(0, stats.ordersThisWeek - stats.chatSessionsThisWeek - stats.waiterCallsHandledThisWeek),
    },
  ]

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-4 py-3 text-white shadow-md sm:px-5 sm:py-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Executive dashboard
            </p>
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">Your restaurant performance</h2>
            <p className="max-w-2xl text-xs leading-relaxed text-slate-300 sm:text-[13px]">
              Revenue, demand, service quality, and assistant impact.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end sm:text-right">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0"
            >
              <span className={`inline-block h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}>↻</span>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <p className="text-[10px] text-slate-400">
              Updated {lastUpdated ? lastUpdated.toLocaleTimeString() : 'just now'}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Orders today"
          value={stats.ordersToday}
          sublabel={`${formatPercent(ordersMomentum)} vs weekly daily avg`}
          accent={ordersMomentum >= 0 ? 'emerald' : 'amber'}
        />
        <StatCard
          label="Revenue today"
          value={formatCurrency(stats.revenueToday, currency)}
          sublabel={`${formatCompactNumber(stats.ordersToday)} orders`}
          accent="blue"
        />
        <StatCard
          label="Projected month revenue"
          value={formatCurrency(projectedMonthlyRevenue, currency)}
          sublabel={`${formatPercent(revenueRunRateDelta)} run-rate delta`}
          accent="violet"
        />
        <StatCard
          label="Avg order value"
          value={stats.avgOrderValue != null ? formatCurrency(stats.avgOrderValue, currency) : '—'}
          sublabel={`${formatCompactNumber(stats.totalOrders)} total orders`}
          accent="slate"
        />
      </section>

      <section className="grid gap-6 2xl:grid-cols-12">
        <div className="space-y-6 2xl:col-span-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Orders + revenue trend</h3>
              <span className="text-xs text-slate-500">Multi-metric view</span>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={periodData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(value) => formatCompactNumber(Number(value))}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      const numericValue = typeof value === 'number' ? value : Number(value ?? 0)
                      if (name === 'Revenue') return [formatCurrency(numericValue, currency), name]
                      return [numericValue, name]
                    }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke="#10b981"
                    fill="url(#ordersGradient)"
                    strokeWidth={2.5}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#3b82f6"
                    fill="none"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Service channel mix</h3>
                <span className="text-xs text-slate-500">This week</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channelMixData}
                      innerRadius={55}
                      outerRadius={86}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      <Cell fill="#6366f1" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Response quality score</h3>
                <span className="text-xs text-slate-500">Live metric</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="35%"
                    outerRadius="85%"
                    data={[
                      {
                        name: 'Quality',
                        value: responseScore,
                        fill:
                          responseHealth === 'Excellent'
                            ? '#10b981'
                            : responseHealth === 'Good'
                              ? '#f59e0b'
                              : '#ef4444',
                      },
                    ]}
                    startAngle={180}
                    endAngle={0}
                  >
                    <RadialBar background dataKey="value" cornerRadius={12} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-1 text-sm text-slate-700">
                {typeof responseTime === 'number'
                  ? `${responseTime.toFixed(1)} min average response (${responseHealth})`
                  : 'No response timing available yet'}
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Period comparison table</h3>
                <span className="text-xs text-slate-500">Snapshot</span>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Orders</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-slate-500">Today</p>
                      <p className="font-semibold text-slate-900">{stats.ordersToday}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Week</p>
                      <p className="font-semibold text-slate-900">{stats.ordersThisWeek}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Month</p>
                      <p className="font-semibold text-slate-900">{stats.ordersThisMonth}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Revenue</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-slate-500">Today</p>
                      <p className="font-semibold text-slate-900">{formatCurrency(stats.revenueToday, currency)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Week</p>
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(stats.revenueThisWeek, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Month</p>
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(stats.revenueThisMonth, currency)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Operational health</h3>
              <div className="mt-4 space-y-4">
                {[
                  {
                    label: 'Automation share',
                    value: formatPercent(automationShare),
                    progress: Math.min(100, Math.max(0, automationShare)),
                    helper: `${stats.chatSessionsThisWeek} chat sessions this week`,
                  },
                  {
                    label: 'Support load',
                    value: formatPercent(supportLoad),
                    progress: Math.min(100, Math.max(0, supportLoad)),
                    helper: `${stats.waiterCallsHandledThisWeek} calls this week`,
                  },
                  {
                    label: 'Response quality',
                    value: responseHealth,
                    progress: responseScore,
                    helper:
                      typeof responseTime === 'number'
                        ? `${responseTime.toFixed(1)} min average response`
                        : 'No response data yet',
                  },
                ].map((item) => (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-700">{item.label}</p>
                      <p className="text-sm font-semibold text-slate-900">{item.value}</p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-900 transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">{item.helper}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4 2xl:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Focus recommendations</h3>
            <ul className="mt-3 space-y-3 text-sm text-slate-700">
              <li className="rounded-lg bg-slate-50 p-2.5">
                Daily orders are{' '}
                <span className="font-semibold">{ordersMomentum >= 0 ? 'above' : 'below'}</span>{' '}
                your weekly baseline.
              </li>
              <li className="rounded-lg bg-slate-50 p-2.5">
                Monthly run-rate suggests{' '}
                <span className="font-semibold">
                  {revenueRunRateDelta >= 0 ? 'growth opportunity' : 'possible slowdown'}
                </span>
                .
              </li>
              <li className="rounded-lg bg-slate-50 p-2.5">
                Keep waiter response under 3 minutes to maintain service quality.
              </li>
            </ul>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 2xl:grid-cols-1">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">All-time revenue</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(stats.totalRevenue, currency)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Calls handled</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{formatCompactNumber(stats.waiterCallsHandled)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chat sessions</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{formatCompactNumber(stats.chatSessionsTotal)}</p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../components/AuthContext'
import { apiFetch } from '../lib/api'

interface LoyaltyCustomer {
  _id: string
  phone: string
  name?: string
  visitCount: number
  totalSpent: number
  createdAt: string
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function OwnerLoyaltyPage() {
  const { token, restaurant } = useAuth()
  const [customers, setCustomers] = useState<LoyaltyCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const currency = restaurant?.currency ?? 'ILS'

  const fetchCustomers = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiFetch<LoyaltyCustomer[]>('/api/owner/loyalty', { token })
      setCustomers(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const filtered = customers.filter((c) =>
    c.phone.includes(search) || (c.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const totalCustomers = customers.length
  const totalVisits = customers.reduce((s, c) => s + c.visitCount, 0)
  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0)
  const topCustomer = customers[0]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">לקוחות נאמנים</h2>
        <p className="mt-1 text-sm text-slate-500">
          לקוחות שהזדהו עם מספר טלפון בעת ההזמנה.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-slate-500">לקוחות</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalCustomers}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-slate-500">סה"כ ביקורים</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalVisits}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-slate-500">הכנסות מלויאלטי</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {formatCurrency(totalRevenue, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-slate-500">הכי נאמן</p>
          <p className="mt-1 text-base font-bold text-slate-900 truncate">
            {topCustomer ? (topCustomer.name ?? topCustomer.phone) : '—'}
          </p>
          {topCustomer && (
            <p className="text-xs text-slate-400">{topCustomer.visitCount} ביקורים</p>
          )}
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="חפש לפי טלפון או שם..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
      />

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-slate-400">
          {search ? 'לא נמצאו לקוחות מתאימים' : 'אין לקוחות נאמנים עדיין'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">שם</th>
                <th className="px-4 py-3">טלפון</th>
                <th className="px-4 py-3 text-center">ביקורים</th>
                <th className="px-4 py-3 text-right">סה"כ הוציא</th>
                <th className="px-4 py-3 text-right">לקוח מאז</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c, i) => (
                <tr key={c._id} className="bg-white hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {c.name ?? <span className="text-slate-400 italic">—</span>}
                    {i === 0 && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">⭐ VIP</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono">{c.phone}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.visitCount >= 10
                        ? 'bg-emerald-100 text-emerald-700'
                        : c.visitCount >= 5
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {c.visitCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {formatCurrency(c.totalSpent, currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400">
                    {new Date(c.createdAt).toLocaleDateString('he-IL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

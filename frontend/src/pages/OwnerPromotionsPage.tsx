import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../components/AuthContext'
import { apiFetch } from '../lib/api'

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

interface Promotion {
  _id: string
  title: string
  description?: string
  discountType: 'percent' | 'fixed'
  discountValue: number
  activeFrom?: string
  activeTo?: string
  activeDays?: number[]
  minOrderAmount?: number
  couponCode?: string
  active: boolean
}

interface FormState {
  title: string
  description: string
  discountType: 'percent' | 'fixed'
  discountValue: string
  activeFrom: string
  activeTo: string
  activeDays: number[]
  minOrderAmount: string
  couponCode: string
}

const emptyForm: FormState = {
  title: '',
  description: '',
  discountType: 'percent',
  discountValue: '',
  activeFrom: '',
  activeTo: '',
  activeDays: [],
  minOrderAmount: '',
  couponCode: '',
}

export default function OwnerPromotionsPage() {
  const { token, restaurant } = useAuth()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPromotions = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiFetch<Promotion[]>('/api/owner/promotions', { token })
      setPromotions(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchPromotions() }, [fetchPromotions])

  async function handleSave() {
    if (!form.title.trim()) { setError('נדרש כותרת'); return }
    const discountValue = parseFloat(form.discountValue)
    if (isNaN(discountValue) || discountValue < 0) { setError('ערך הנחה לא תקין'); return }

    setSaving(true)
    setError(null)
    try {
      await apiFetch('/api/owner/promotions', {
        method: 'POST',
        token,
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          discountType: form.discountType,
          discountValue,
          activeFrom: form.activeFrom || undefined,
          activeTo: form.activeTo || undefined,
          activeDays: form.activeDays,
          minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : 0,
          couponCode: form.couponCode || undefined,
        }),
      })
      setShowForm(false)
      setForm(emptyForm)
      await fetchPromotions()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(promo: Promotion) {
    try {
      await apiFetch(`/api/owner/promotions/${promo._id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ active: !promo.active }),
      })
      await fetchPromotions()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('למחוק את המבצע?')) return
    try {
      await apiFetch(`/api/owner/promotions/${id}`, { method: 'DELETE', token })
      await fetchPromotions()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  function toggleDay(d: number) {
    setForm((f) => ({
      ...f,
      activeDays: f.activeDays.includes(d)
        ? f.activeDays.filter((x) => x !== d)
        : [...f.activeDays, d],
    }))
  }

  const currency = restaurant?.currency ?? 'ILS'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">מבצעים ושעות שמחות</h2>
          <p className="mt-1 text-sm text-slate-500">
            צור הנחות אוטומטיות, קודי קופון, ומבצעי שעות שמחות.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(true); setError(null) }}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
        >
          + מבצע חדש
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-800">מבצע חדש</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">כותרת *</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Happy Hour 14:00-16:00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">קוד קופון (אופציונלי)</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={form.couponCode}
                onChange={(e) => setForm((f) => ({ ...f, couponCode: e.target.value }))}
                placeholder="SUMMER10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">תיאור (אופציונלי)</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="20% הנחה על כל המשקאות"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">סוג הנחה</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={form.discountType}
                onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as 'percent' | 'fixed' }))}
              >
                <option value="percent">אחוז (%)</option>
                <option value="fixed">סכום קבוע ({currency})</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                ערך {form.discountType === 'percent' ? '(%)' : `(${currency})`}
              </label>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={form.discountValue}
                onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                placeholder="10"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">פעיל מ-</label>
              <input
                type="time"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={form.activeFrom}
                onChange={(e) => setForm((f) => ({ ...f, activeFrom: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">עד</label>
              <input
                type="time"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={form.activeTo}
                onChange={(e) => setForm((f) => ({ ...f, activeTo: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">מינימום הזמנה</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={form.minOrderAmount}
                onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">ימים פעילים (ריק = כל הימים)</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    form.activeDays.includes(idx)
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'שומר...' : 'צור מבצע'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(emptyForm); setError(null) }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Promotions list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl border border-slate-200 bg-slate-50 animate-pulse" />
          ))}
        </div>
      ) : promotions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-slate-400">
          אין מבצעים עדיין — צור את המבצע הראשון!
        </div>
      ) : (
        <div className="space-y-3">
          {promotions.map((p) => (
            <div
              key={p._id}
              className={`rounded-xl border p-4 transition-colors ${
                p.active ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800">{p.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.discountType === 'percent'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {p.discountType === 'percent' ? `${p.discountValue}%` : `${p.discountValue} ${currency}`}
                    </span>
                    {p.couponCode && (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-mono text-violet-700">
                        {p.couponCode}
                      </span>
                    )}
                    {p.activeFrom && p.activeTo && (
                      <span className="text-xs text-slate-400">{p.activeFrom}–{p.activeTo}</span>
                    )}
                    {p.activeDays && p.activeDays.length > 0 && (
                      <span className="text-xs text-slate-400">
                        {p.activeDays.map((d) => DAYS[d]).join(', ')}
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p className="mt-1 text-sm text-slate-500">{p.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleActive(p)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      p.active
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-rose-100 hover:text-rose-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700'
                    }`}
                  >
                    {p.active ? 'פעיל' : 'כבוי'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p._id)}
                    className="rounded-full px-3 py-1 text-xs font-medium text-rose-500 hover:bg-rose-50 transition-colors"
                  >
                    מחק
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

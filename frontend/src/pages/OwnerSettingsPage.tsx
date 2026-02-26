import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../components/AuthContext'
import { apiFetch } from '../lib/api'
import type { Restaurant } from '../components/types'

export default function OwnerSettingsPage() {
  const { restaurant, token, updateRestaurant } = useAuth()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name)
      setCurrency(restaurant.currency ?? 'USD')
    }
  }, [restaurant])

  if (!restaurant || !token) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-700">
        Loading restaurant settings…
      </div>
    )
  }

  const publicUrl = `/restaurant/${restaurant.slug}/menu`

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const updated = await apiFetch<Restaurant>(`/api/restaurants/${restaurant._id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ name: name.trim(), currency }),
      })
      updateRestaurant(updated)
      setSuccess('Settings saved')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setSuccess('Public menu link copied')
      setError(null)
    } catch {
      setError('Failed to copy link')
      setSuccess(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Restaurant details</h2>
        <p className="mt-1 text-xs text-slate-500">
          Update your restaurant&apos;s basic information and currency.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-sm">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              {success}
            </div>
          )}
          <div className="space-y-1">
            <label htmlFor="name" className="text-xs font-medium text-slate-700">
              Restaurant name
            </label>
            <input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="Restaurant name"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="currency" className="text-xs font-medium text-slate-700">
              Currency
            </label>
            <select
              id="currency"
              name="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="ILS">ILS (₪)</option>
            </select>
          </div>
          <button
            type="submit"
            className="mt-2 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm">
        <h2 className="text-sm font-semibold text-slate-900">Public menu link</h2>
        <p className="mt-1 text-xs text-slate-500">
          Share this link with your guests so they can view the menu and order from their table.
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs">
          <code className="flex-1 truncate rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">
            {publicUrl}
          </code>
          <button
            type="button"
            className="rounded-full bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white hover:bg-slate-800"
            onClick={handleCopyLink}
          >
            Copy link
          </button>
        </div>
      </div>
    </div>
  )
}


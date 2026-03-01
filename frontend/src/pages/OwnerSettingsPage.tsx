import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { apiFetch } from '../lib/api'
import type { Restaurant } from '../components/types'

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'ILS', label: 'ILS (₪)' },
] as const

const RESTAURANT_TYPES = [
  { value: '', label: 'Select type…' },
  { value: 'Italian', label: 'Italian' },
  { value: 'Mexican', label: 'Mexican' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Chinese', label: 'Chinese' },
  { value: 'American', label: 'American' },
  { value: 'Mediterranean', label: 'Mediterranean' },
  { value: 'Indian', label: 'Indian' },
  { value: 'Thai', label: 'Thai' },
  { value: 'Cafe', label: 'Cafe' },
  { value: 'Fast food', label: 'Fast food' },
  { value: 'Fine dining', label: 'Fine dining' },
  { value: 'Bar', label: 'Bar' },
  { value: 'Bakery', label: 'Bakery' },
  { value: 'Pizza', label: 'Pizza' },
  { value: 'Other', label: 'Other' },
] as const

const OPENING_HOURS_PRESETS = [
  { label: 'Every day 11:00–22:00', value: 'Every day 11:00–22:00' },
  { label: 'Mon–Fri 09:00–17:00', value: 'Mon–Fri 09:00–17:00, Sat–Sun closed' },
  { label: 'Mon–Sat 08:00–23:00', value: 'Mon–Sat 08:00–23:00, Sun closed' },
  { label: 'Mon–Fri 11–22, Sat–Sun 10–23', value: 'Mon–Fri 11:00–22:00, Sat–Sun 10:00–23:00' },
  { label: 'Lunch & dinner (12–15, 18–22)', value: 'Mon–Sun 12:00–15:00 & 18:00–22:00' },
  { label: '24/7', value: 'Open 24/7' },
  { label: 'Breakfast & lunch (07–15)', value: 'Mon–Sun 07:00–15:00' },
] as const

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Jerusalem',
  'Asia/Tokyo',
  'Australia/Sydney',
]

export default function OwnerSettingsPage() {
  const { owner, restaurant, token, updateRestaurant, logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    description: '',
    restaurantType: '',
    currency: 'USD',
    address: '',
    phone: '',
    contactEmail: '',
    timezone: 'UTC',
    openingHoursNote: '',
    taxRatePercent: '' as number | '',
    serviceChargePercent: '' as number | '',
    allowOrders: true,
    orderLeadTimeMinutes: 15,
    aiInstructions: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (restaurant) {
      setForm({
        name: restaurant.name,
        description: restaurant.description ?? '',
        restaurantType: restaurant.restaurantType ?? '',
        currency: restaurant.currency ?? 'USD',
        address: restaurant.address ?? '',
        phone: restaurant.phone ?? '',
        contactEmail: restaurant.contactEmail ?? '',
        timezone: restaurant.timezone ?? 'UTC',
        openingHoursNote: restaurant.openingHoursNote ?? '',
        taxRatePercent:
          restaurant.taxRatePercent != null ? restaurant.taxRatePercent : '',
        serviceChargePercent:
          restaurant.serviceChargePercent != null
            ? restaurant.serviceChargePercent
            : '',
        allowOrders: restaurant.allowOrders ?? true,
        orderLeadTimeMinutes: restaurant.orderLeadTimeMinutes ?? 15,
        aiInstructions: restaurant.aiInstructions ?? '',
      })
    }
  }, [restaurant])

  if (!restaurant || !token) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-700">
        Loading restaurant settings…
      </div>
    )
  }

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/restaurant/${restaurant.slug}/menu`

  const handleChange = (field: keyof typeof form, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        currency: form.currency,
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        description: form.description.trim() || undefined,
        restaurantType: form.restaurantType.trim() || undefined,
        timezone: form.timezone || undefined,
        openingHoursNote: form.openingHoursNote.trim() || undefined,
        allowOrders: form.allowOrders,
        orderLeadTimeMinutes: form.orderLeadTimeMinutes,
      }
      if (typeof form.taxRatePercent === 'number') body.taxRatePercent = form.taxRatePercent
      if (typeof form.serviceChargePercent === 'number')
        body.serviceChargePercent = form.serviceChargePercent
      body.aiInstructions = form.aiInstructions.trim()
      const updated = await apiFetch<Restaurant>(`/api/restaurants/${restaurant._id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(body),
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

  const inputClass =
    'w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400'
  const labelClass = 'text-xs font-medium text-slate-700'

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:hidden">
        <h2 className="text-sm font-semibold text-slate-900">Account</h2>
        <p className="mt-1 text-xs text-slate-500">
          Signed in as this account. Sign out below to use a different one.
        </p>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <p className="truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
            {owner?.email ?? '—'}
          </p>
          <button
            type="button"
            className="rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
            onClick={() => {
              logout()
              navigate('/owner/login', { replace: true })
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Restaurant details</h2>
          <p className="mt-1 text-xs text-slate-500">
            Basic information shown to guests.
          </p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="space-y-1">
              <label htmlFor="name" className={labelClass}>
                Restaurant name
              </label>
              <input
                id="name"
                name="name"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={inputClass}
                placeholder="Restaurant name"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="description" className={labelClass}>
                Short description
              </label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="min-h-[80px] w-full resize-y rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="e.g. Cozy Italian bistro in the heart of the city"
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="restaurantType" className={labelClass}>
                Type of restaurant
              </label>
              <select
                id="restaurantType"
                name="restaurantType"
                value={form.restaurantType}
                onChange={(e) => handleChange('restaurantType', e.target.value)}
                className={inputClass}
              >
                {RESTAURANT_TYPES.map((t) => (
                  <option key={t.value || 'blank'} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="currency" className={labelClass}>
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={form.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className={inputClass}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Contact</h2>
          <p className="mt-1 text-xs text-slate-500">
            Address and contact details for your restaurant.
          </p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="space-y-1">
              <label htmlFor="address" className={labelClass}>
                Address
              </label>
              <input
                id="address"
                name="address"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className={inputClass}
                placeholder="Street, city, postal code"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="phone" className={labelClass}>
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={inputClass}
                placeholder="+1 234 567 8900"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="contactEmail" className={labelClass}>
                Contact email
              </label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={(e) => handleChange('contactEmail', e.target.value)}
                className={inputClass}
                placeholder="contact@restaurant.com"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Opening hours</h2>
          <p className="mt-1 text-xs text-slate-500">
            Timezone and when you&apos;re open. Pick a preset or type your own.
          </p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="space-y-1">
              <label htmlFor="timezone" className={labelClass}>
                Timezone
              </label>
              <select
                id="timezone"
                name="timezone"
                value={form.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                className={inputClass}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Quick pick</label>
              <div className="flex flex-wrap gap-2">
                {OPENING_HOURS_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleChange('openingHoursNote', preset.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      form.openingHoursNote === preset.value
                        ? 'border-slate-800 bg-slate-800 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="openingHoursNote" className={labelClass}>
                Opening hours (edit or type your own)
              </label>
              <input
                id="openingHoursNote"
                name="openingHoursNote"
                value={form.openingHoursNote}
                onChange={(e) => handleChange('openingHoursNote', e.target.value)}
                className={inputClass}
                placeholder="e.g. Mon–Fri 11:00–22:00, Sat–Sun 10:00–23:00"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Orders</h2>
          <p className="mt-1 text-xs text-slate-500">
            Control whether guests can place orders and default lead time.
          </p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <input
                id="allowOrders"
                name="allowOrders"
                type="checkbox"
                checked={form.allowOrders}
                onChange={(e) => handleChange('allowOrders', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              />
              <label htmlFor="allowOrders" className={labelClass}>
                Accept orders from the menu
              </label>
            </div>
            <div className="space-y-1">
              <label htmlFor="orderLeadTimeMinutes" className={labelClass}>
                Default order lead time (minutes)
              </label>
              <input
                id="orderLeadTimeMinutes"
                name="orderLeadTimeMinutes"
                type="number"
                min={0}
                max={120}
                value={form.orderLeadTimeMinutes}
                onChange={(e) =>
                  handleChange('orderLeadTimeMinutes', parseInt(e.target.value, 10) || 0)
                }
                className={inputClass}
              />
              <p className="text-[11px] text-slate-500">
                How many minutes until the order is expected (e.g. 15).
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <h2 className="text-sm font-semibold text-slate-900">AI waiter instructions</h2>
          <p className="mt-1 text-xs text-slate-500">
            Customize how the AI behaves: tone, what to emphasize, or extra rules. Leave blank to use defaults.
          </p>
          <div className="mt-4 space-y-1">
            <label htmlFor="aiInstructions" className={labelClass}>
              Custom instructions
            </label>
            <textarea
              id="aiInstructions"
              name="aiInstructions"
              value={form.aiInstructions}
              onChange={(e) => handleChange('aiInstructions', e.target.value)}
              className="min-h-[100px] w-full resize-y rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="e.g. Be casual and brief. Always mention if a dish is gluten-free. Suggest our house special when they're unsure."
              rows={4}
            />
            <p className="text-[11px] text-slate-500">
              The AI still only answers from the menu; use this to control style and priorities.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Tax & service charge</h2>
          <p className="mt-1 text-xs text-slate-500">
            Optional. Used for display or calculations if you use them.
          </p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="space-y-1">
              <label htmlFor="taxRatePercent" className={labelClass}>
                Tax rate (%)
              </label>
              <input
                id="taxRatePercent"
                name="taxRatePercent"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={form.taxRatePercent === '' ? '' : form.taxRatePercent}
                onChange={(e) => {
                  const v = e.target.value
                  handleChange('taxRatePercent', v === '' ? '' : parseFloat(v) || 0)
                }}
                className={inputClass}
                placeholder="e.g. 8.5"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="serviceChargePercent" className={labelClass}>
                Service charge (%)
              </label>
              <input
                id="serviceChargePercent"
                name="serviceChargePercent"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={form.serviceChargePercent === '' ? '' : form.serviceChargePercent}
                onChange={(e) => {
                  const v = e.target.value
                  handleChange('serviceChargePercent', v === '' ? '' : parseFloat(v) || 0)
                }}
                className={inputClass}
                placeholder="e.g. 10"
              />
            </div>
          </div>
        </div>

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
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save all settings'}
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm">
        <h2 className="text-sm font-semibold text-slate-900">Public menu link</h2>
        <p className="mt-1 text-xs text-slate-500">
          Share this link with your guests so they can view the menu and order from their
          table.
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

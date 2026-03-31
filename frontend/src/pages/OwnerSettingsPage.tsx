import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { apiFetch } from '../lib/api'
import type { Restaurant } from '../components/types'
import MapLocationPicker from '../components/MapLocationPicker'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

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
    printerEnabled: false,
    printerName: '',
    businessPlanEnabled: false,
    businessPlanTitle: 'עסקית',
    businessPlanDescription: '',
    businessPlanTimeNote: '',
    businessPlanPrice: '' as number | '',
    websiteUrl: '',
    instagramUrl: '',
    facebookUrl: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [mapPickerOpen, setMapPickerOpen] = useState(false)

  useEffect(() => {
    if (!success) return
    const timeout = setTimeout(() => {
      setSuccess(null)
    }, 4000)
    return () => clearTimeout(timeout)
  }, [success])

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
        printerEnabled: restaurant.printerEnabled ?? false,
        printerName: restaurant.printerName ?? '',
        businessPlanEnabled: restaurant.businessPlanEnabled ?? false,
        businessPlanTitle: restaurant.businessPlanTitle ?? 'עסקית',
        businessPlanDescription: restaurant.businessPlanDescription ?? '',
        businessPlanTimeNote: restaurant.businessPlanTimeNote ?? '',
        businessPlanPrice:
          restaurant.businessPlanPrice != null ? restaurant.businessPlanPrice : '',
        websiteUrl: restaurant.websiteUrl ?? '',
        instagramUrl: restaurant.instagramUrl ?? '',
        facebookUrl: restaurant.facebookUrl ?? '',
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

  const openMapPicker = () => setMapPickerOpen(true)

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
      body.printerEnabled = form.printerEnabled
      body.printerName = form.printerName.trim() || undefined
      body.businessPlanEnabled = form.businessPlanEnabled
      body.businessPlanTitle = form.businessPlanTitle.trim() || undefined
      body.businessPlanDescription = form.businessPlanDescription.trim() || undefined
      body.businessPlanTimeNote = form.businessPlanTimeNote.trim() || undefined
      if (typeof form.businessPlanPrice === 'number') {
        body.businessPlanPrice = form.businessPlanPrice
      }
      body.websiteUrl = form.websiteUrl.trim() || undefined
      body.instagramUrl = form.instagramUrl.trim() || undefined
      body.facebookUrl = form.facebookUrl.trim() || undefined
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

  const handleLogoFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!restaurant || !token) return
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('logo', file)

    setLogoUploading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`${API_BASE}/api/restaurants/${restaurant._id}/logo`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      })
      const json = (await res.json()) as Restaurant & { message?: string }
      if (!res.ok) {
        throw new Error(json.message ?? 'Failed to upload logo')
      }
      updateRestaurant(json)
      setSuccess('Logo updated')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLogoUploading(false)
      // Allow selecting the same file again if needed
      e.target.value = ''
    }
  }

  const handleRemoveLogo = async () => {
    if (!restaurant || !token) return
    setLogoUploading(true)
    setError(null)
    setSuccess(null)
    try {
      const updated = await apiFetch<Restaurant>(`/api/restaurants/${restaurant._id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ logoUrl: '' }),
      })
      updateRestaurant(updated)
      setSuccess('Logo removed')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLogoUploading(false)
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

  const isPristine =
    form.name.trim() === restaurant.name &&
    (form.description ?? '').trim() === (restaurant.description ?? '') &&
    (form.restaurantType ?? '') === (restaurant.restaurantType ?? '') &&
    form.currency === (restaurant.currency ?? 'USD') &&
    (form.address ?? '') === (restaurant.address ?? '') &&
    (form.phone ?? '') === (restaurant.phone ?? '') &&
    (form.contactEmail ?? '') === (restaurant.contactEmail ?? '') &&
    (form.timezone ?? 'UTC') === (restaurant.timezone ?? 'UTC') &&
    (form.openingHoursNote ?? '') === (restaurant.openingHoursNote ?? '') &&
    form.allowOrders === (restaurant.allowOrders ?? true) &&
    form.orderLeadTimeMinutes === (restaurant.orderLeadTimeMinutes ?? 15) &&
    form.taxRatePercent ===
      (restaurant.taxRatePercent != null ? restaurant.taxRatePercent : '') &&
    form.serviceChargePercent ===
      (restaurant.serviceChargePercent != null ? restaurant.serviceChargePercent : '') &&
    (form.aiInstructions ?? '').trim() === (restaurant.aiInstructions ?? '').trim() &&
    form.printerEnabled === (restaurant.printerEnabled ?? false) &&
    (form.printerName ?? '') === (restaurant.printerName ?? '') &&
    form.businessPlanEnabled === (restaurant.businessPlanEnabled ?? false) &&
    (form.businessPlanTitle ?? 'עסקית') ===
      (restaurant.businessPlanTitle ?? 'עסקית') &&
    (form.businessPlanDescription ?? '') ===
      (restaurant.businessPlanDescription ?? '') &&
    (form.businessPlanTimeNote ?? '') ===
      (restaurant.businessPlanTimeNote ?? '') &&
    form.businessPlanPrice ===
      (restaurant.businessPlanPrice != null ? restaurant.businessPlanPrice : '') &&
    (form.websiteUrl ?? '') === (restaurant.websiteUrl ?? '') &&
    (form.instagramUrl ?? '') === (restaurant.instagramUrl ?? '') &&
    (form.facebookUrl ?? '') === (restaurant.facebookUrl ?? '')

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-slate-900">
              Owner settings
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Tidy up how your restaurant looks to guests and how orders flow.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 sm:gap-3">
            <div className="hidden rounded-full bg-slate-50 px-3 py-1 sm:block">
              <span className="font-medium text-slate-800">
                {restaurant.name ?? 'Restaurant'}
              </span>
            </div>
            <div className="rounded-full bg-slate-50 px-2.5 py-1 sm:px-3">
              <span className="font-medium text-slate-800">{form.currency}</span>
            </div>
            <div
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 sm:px-3 ${
                form.allowOrders
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              <span>{form.allowOrders ? 'Orders on' : 'Orders off'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile account card */}
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] items-start">
        {/* Main settings form */}
        <form onSubmit={handleSubmit} className="space-y-4 lg:order-1">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:py-4">
            <h2 className="text-sm font-semibold text-slate-900">Restaurant details</h2>
            <p className="mt-1 text-xs text-slate-500">
              Basic information shown to guests.
            </p>
            <div className="mt-3 space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
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
              <div className="space-y-1">
                <span className={labelClass}>Logo (optional)</span>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    {restaurant.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={restaurant.logoUrl}
                        alt={`${restaurant.name} logo`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (restaurant.name?.[0] ?? 'R')
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoFileChange}
                      />
                      <span>{logoUploading ? 'Uploading…' : 'Upload logo'}</span>
                    </label>
                    {restaurant.logoUrl && (
                      <button
                        type="button"
                        className="text-[11px] font-medium text-rose-600 hover:text-rose-700"
                        onClick={handleRemoveLogo}
                        disabled={logoUploading}
                      >
                        Remove logo
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  Shown on the guest menu. Use a square JPG or PNG up to 5MB.
                </p>
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
                  className="min-h-[72px] w-full resize-y rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="e.g. Cozy Italian bistro in the heart of the city"
                  rows={3}
                />
              </div>
            </div>
          </div>


          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:py-4">
            <h2 className="text-sm font-semibold text-slate-900">Contact</h2>
            <p className="mt-1 text-xs text-slate-500">
              Address and contact details for your restaurant.
            </p>
            <div className="mt-3 space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="address" className={labelClass}>
                    Address
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      id="address"
                      name="address"
                      value={form.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      className={inputClass}
                      placeholder="Street, city, postal code"
                    />
                    <button
                      type="button"
                      onClick={openMapPicker}
                      className="shrink-0 self-center rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                      title="Pick on map"
                      aria-label="Pick location on map"
                    >
                      🗺️ Map
                    </button>
                  </div>
                  <MapLocationPicker
                    open={mapPickerOpen}
                    onClose={() => setMapPickerOpen(false)}
                    onSelect={(address) => handleChange('address', address)}
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
              </div>
              <div className="space-y-1 sm:max-w-sm">
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

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:py-4">
            <h2 className="text-sm font-semibold text-slate-900">Online presence</h2>
            <p className="mt-1 text-xs text-slate-500">
              Social links shown in the footer of your guest menu.
            </p>
            <div className="mt-3 space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="websiteUrl" className={labelClass}>
                    Website
                  </label>
                  <input
                    id="websiteUrl"
                    name="websiteUrl"
                    type="url"
                    value={form.websiteUrl}
                    onChange={(e) => handleChange('websiteUrl', e.target.value)}
                    className={inputClass}
                    placeholder="https://yourrestaurant.com"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="instagramUrl" className={labelClass}>
                    Instagram
                  </label>
                  <input
                    id="instagramUrl"
                    name="instagramUrl"
                    type="url"
                    value={form.instagramUrl}
                    onChange={(e) => handleChange('instagramUrl', e.target.value)}
                    className={inputClass}
                    placeholder="https://instagram.com/yourpage"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="facebookUrl" className={labelClass}>
                    Facebook
                  </label>
                  <input
                    id="facebookUrl"
                    name="facebookUrl"
                    type="url"
                    value={form.facebookUrl}
                    onChange={(e) => handleChange('facebookUrl', e.target.value)}
                    className={inputClass}
                    placeholder="https://facebook.com/yourpage"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:py-4">
            <h2 className="text-sm font-semibold text-slate-900">Opening hours</h2>
            <p className="mt-1 text-xs text-slate-500">
              Timezone and when you&apos;re open. Pick a preset or type your own.
            </p>
            <div className="mt-3 space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
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
                  <label htmlFor="openingHoursNote" className={labelClass}>
                    Opening hours
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
              <div className="space-y-1">
                <label className={labelClass}>Quick pick</label>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {OPENING_HOURS_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => handleChange('openingHoursNote', preset.value)}
                      className={`rounded-full border px-2.5 py-1.5 text-[11px] sm:px-3 sm:text-xs font-medium transition-colors ${
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

          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Advanced settings</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Printer and AI behavior. You can leave these as they are.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800"
                onClick={() => setShowAdvanced((prev) => !prev)}
              >
                {showAdvanced ? 'Hide advanced' : 'Show advanced'}
              </button>
            </div>
          </div>

          {showAdvanced && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <h2 className="text-sm font-semibold text-slate-900">Printer</h2>
                <details className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700">
                  <summary className="cursor-pointer list-none font-medium text-slate-800">
                    How to connect your printer
                  </summary>
                  <ol className="mt-1.5 list-decimal list-inside space-y-1 text-slate-600">
                    <li>
                      Open the <strong>Kitchen</strong> page on the computer that is next to (or
                      connected to) your receipt/kitchen printer.
                    </li>
                    <li>
                      On that computer, set your kitchen printer as the{' '}
                      <strong>default printer</strong> (in System Settings on Mac, or Settings →
                      Devices → Printers on Windows).
                    </li>
                    <li>
                      When a new order appears, click <strong>Print</strong> on the order card. The
                      browser will use the default printer, or you can pick the printer in the
                      print dialog.
                    </li>
                  </ol>
                  <p className="mt-2 text-slate-500">
                    There is no separate “printer pairing” in this app—the connection is through
                    the computer’s default printer.
                  </p>
                </details>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <input
                      id="printerEnabled"
                      name="printerEnabled"
                      type="checkbox"
                      checked={form.printerEnabled}
                      onChange={(e) => handleChange('printerEnabled', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    />
                    <label htmlFor="printerEnabled" className={labelClass}>
                      Enable order printing (show Print button in Kitchen)
                    </label>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="printerName" className={labelClass}>
                      Printer name (optional)
                    </label>
                    <input
                      id="printerName"
                      name="printerName"
                      type="text"
                      value={form.printerName}
                      onChange={(e) => handleChange('printerName', e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Kitchen receipt printer"
                    />
                    <p className="text-[11px] text-slate-500">
                      For your reference only—reminds you which printer you set as default on the
                      Kitchen computer.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <h2 className="text-sm font-semibold text-slate-900">AI waiter instructions</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Customize how the AI behaves: tone, what to emphasize, or extra rules. Leave
                  blank to use defaults.
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
                    The AI still only answers from the menu; use this to control style and
                    priorities.
                  </p>
                </div>
              </div>

              <div className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm sm:block">
                <h2 className="text-sm font-semibold text-slate-900">Account</h2>
                <p className="mt-1 text-xs text-slate-500">You are signed in as:</p>
                <p className="mt-2 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  {owner?.email ?? '—'}
                </p>
                <button
                  type="button"
                  className="mt-3 w-full rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                  onClick={() => {
                    logout()
                    navigate('/owner/login', { replace: true })
                  }}
                >
                  Sign out
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm">
                <h2 className="text-sm font-semibold text-slate-900">Public menu link</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Share this link with your guests so they can view the menu and order from their
                  table.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="min-w-0 flex-1 truncate rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800">
                    {publicUrl}
                  </code>
                  <button
                    type="button"
                    className="w-full shrink-0 rounded-full bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white hover:bg-slate-800 sm:w-auto"
                    onClick={handleCopyLink}
                  >
                    Copy link
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Tax & service charge – commented out for now
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
        */}

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
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              disabled={saving || isPristine}
            >
              {saving ? 'Saving…' : 'Save all settings'}
            </button>
          </div>
        </form>

        {/* Sidebar is rendered above the form (lg:order-2 puts it right on desktop) */}
      </div>
    </div>
  )
}

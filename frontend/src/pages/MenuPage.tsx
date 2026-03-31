import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { io, type Socket } from 'socket.io-client'
import { CartProvider, useCart } from '../components/CartContext'
import type { BusinessPlan, MenuCategory, Restaurant } from '../components/types'
import MenuItemCard from '../components/MenuItemCard'
import CartSummary from '../components/CartSummary'
import ChatPanel from '../components/ChatPanel'
import OrderConfirmationModal from '../components/OrderConfirmationModal'
import CartDrawer from '../components/CartDrawer'
import BillPanel from '../components/BillPanel'
import MascotAssistantTrigger from '../components/MascotAssistantTrigger'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

let socket: Socket | null = null

type OrderStatus = 'new' | 'preparing' | 'ready'

interface MenuResponse {
  restaurant: Restaurant
  categories: MenuCategory[]
  businessPlans?: BusinessPlan[]
}

function WebsiteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm6.9 8h-3.12a14.2 14.2 0 0 0-1.34-5A7.03 7.03 0 0 1 18.9 11ZM12 5.02c.83.95 1.72 2.82 2.08 5.98H9.92C10.28 7.84 11.17 5.97 12 5.02ZM9.56 6a14.2 14.2 0 0 0-1.34 5H5.1A7.03 7.03 0 0 1 9.56 6ZM5.1 13h3.12a14.2 14.2 0 0 0 1.34 5A7.03 7.03 0 0 1 5.1 13ZM12 18.98c-.83-.95-1.72-2.82-2.08-5.98h4.16c-.36 3.16-1.25 5.03-2.08 5.98ZM14.44 18a14.2 14.2 0 0 0 1.34-5h3.12A7.03 7.03 0 0 1 14.44 18Z"
        fill="currentColor"
      />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3Zm0 1.8a2.7 2.7 0 0 0-2.7 2.7v9a2.7 2.7 0 0 0 2.7 2.7h9a2.7 2.7 0 0 0 2.7-2.7v-9a2.7 2.7 0 0 0-2.7-2.7h-9Zm9.45 1.35a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1ZM12 8.4a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2Zm0 1.8a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Z"
        fill="currentColor"
      />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M13.5 21v-7.2h2.4l.36-2.8h-2.76V9.2c0-.81.23-1.36 1.4-1.36H16.5V5.3a21.1 21.1 0 0 0-2.28-.12c-2.25 0-3.78 1.37-3.78 3.9V11H8v2.8h2.44V21h3.06Z"
        fill="currentColor"
      />
    </svg>
  )
}

function SocialIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        d="M18 16a3 3 0 0 0-2.39 1.19l-6.12-3.06a3.02 3.02 0 0 0 0-2.26l6.12-3.06A3 3 0 1 0 15 7a2.98 2.98 0 0 0 .15.93L9.03 11a3 3 0 1 0 0 2l6.12 3.07A2.98 2.98 0 0 0 15 17a3 3 0 1 0 3-1Z"
        fill="currentColor"
      />
    </svg>
  )
}

function getCurrencySymbol(currency?: string) {
  switch ((currency ?? 'USD').toUpperCase()) {
    case 'EUR':
      return '€'
    case 'GBP':
      return '£'
    case 'ILS':
      return '₪'
    case 'USD':
    default:
      return '$'
  }
}

function MenuPageInner() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<MenuResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [billOpen, setBillOpen] = useState(false)
  const [itemDetailOpen, setItemDetailOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<'all' | string>('all')
  const [socialMenuOpen, setSocialMenuOpen] = useState(false)
  const [dismissedStatusKey, setDismissedStatusKey] = useState<string | null>(null)
  const [dismissStatusHydrated, setDismissStatusHydrated] = useState(false)
  const tableFromUrl = searchParams.get('table') ?? undefined
  const tableKey = tableFromUrl ?? 'default'
  const [manualTable, setManualTable] = useState('')

  const effectiveTable = tableFromUrl
  const latestOrderIdRef = useRef<string | null>(null)
  const socialMenuRef = useRef<HTMLDivElement | null>(null)
  const [latestOrderId, setLatestOrderId] = useState<string | null>(null)
  const [latestOrderStatus, setLatestOrderStatus] = useState<OrderStatus | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!slug) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/api/restaurants/${slug}/menu`)
        const json = (await res.json()) as MenuResponse & { message?: string }
        if (!res.ok) {
          throw new Error(json.message ?? 'Failed to load menu')
        }
        setData(json)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [slug])

  useEffect(() => {
    const loadLatestOrderStatus = async () => {
      if (!data?.restaurant?._id || !effectiveTable) {
        latestOrderIdRef.current = null
        setLatestOrderId(null)
        setLatestOrderStatus(null)
        return
      }
      try {
        const res = await fetch(`${API_BASE}/api/restaurants/${data.restaurant._id}/orders`)
        const orders = (await res.json()) as {
          _id: string
          status: OrderStatus
          tableNumber?: string
        }[]
        if (!res.ok) {
          return
        }
        const forTable = orders.filter((o) => o.tableNumber === effectiveTable)
        if (forTable.length === 0) {
          latestOrderIdRef.current = null
          setLatestOrderId(null)
          setLatestOrderStatus(null)
          return
        }
        const latest = forTable[0]
        latestOrderIdRef.current = latest._id
        setLatestOrderId(latest._id)
        setLatestOrderStatus(latest.status)
      } catch {
        // ignore status loading errors on the guest side
      }
    }
    void loadLatestOrderStatus()
  }, [data?.restaurant?._id, effectiveTable])

  useEffect(() => {
    if (!data?.restaurant?._id) return

    socket = io(API_BASE, { transports: ['websocket'] })
    socket.emit('join-restaurant', data.restaurant._id)

    socket.on('order:new', (order: { _id: string; status: OrderStatus; tableNumber?: string }) => {
      if (effectiveTable && order.tableNumber === effectiveTable) {
        latestOrderIdRef.current = order._id
        setLatestOrderId(order._id)
        setLatestOrderStatus(order.status)
      }
    })

    socket.on('order:updated', (payload: { orderId: string; status: OrderStatus }) => {
      if (latestOrderIdRef.current && latestOrderIdRef.current === payload.orderId) {
        setLatestOrderStatus(payload.status)
      }
    })

    return () => {
      socket?.off('order:new')
      socket?.off('order:updated')
      socket?.disconnect()
      socket = null
    }
  }, [data?.restaurant?._id, tableFromUrl])

  useEffect(() => {
    if (!socialMenuOpen) return

    const handleOutsideClick = (event: MouseEvent) => {
      if (socialMenuRef.current && !socialMenuRef.current.contains(event.target as Node)) {
        setSocialMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [socialMenuOpen])

  const currentStatusKey =
    latestOrderId && latestOrderStatus ? `${latestOrderId}:${latestOrderStatus}` : null
  const shouldShowStatusBanner = currentStatusKey !== null && dismissedStatusKey !== currentStatusKey
  const statusDismissStorageKey = `ai-waiter:dismissed-order-status:${slug ?? 'unknown'}:${effectiveTable ?? 'default'}`

  useEffect(() => {
    if (typeof window === 'undefined') return
    setDismissStatusHydrated(false)
    try {
      const stored = window.localStorage.getItem(statusDismissStorageKey)
      setDismissedStatusKey(stored ?? null)
    } catch {
      // ignore storage read errors
    } finally {
      setDismissStatusHydrated(true)
    }
  }, [statusDismissStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!dismissStatusHydrated) return
    try {
      if (dismissedStatusKey) {
        window.localStorage.setItem(statusDismissStorageKey, dismissedStatusKey)
      } else {
        window.localStorage.removeItem(statusDismissStorageKey)
      }
    } catch {
      // ignore storage write errors
    }
  }, [dismissStatusHydrated, dismissedStatusKey, statusDismissStorageKey])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
          <div className="h-8 w-32 animate-pulse rounded-full bg-slate-200" />
          <div className="space-y-3">
            <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-md px-4 py-6">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate-600">{error ?? 'Menu not found.'}</p>
        </div>
      </div>
    )
  }

  const currencySymbol = getCurrencySymbol(data.restaurant.currency)

  const query = searchQuery.trim().toLowerCase()
  const searchedCategories = query
    ? data.categories
        .map((cat) => ({
          ...cat,
          items: cat.items.filter(
            (item) =>
              item.name.toLowerCase().includes(query) ||
              (item.description && item.description.toLowerCase().includes(query)) ||
              item.tags?.some((t) => t.toLowerCase().includes(query))
          )
        }))
        .filter((cat) => cat.items.length > 0)
    : data.categories

  const filteredCategories =
    selectedCategoryId === 'all'
      ? searchedCategories
      : searchedCategories.filter((cat) => cat._id === selectedCategoryId)

  const hasPlans = (data.businessPlans?.length ?? 0) > 0
  const PLANS_ID = '__business_plans__'
  const hasMultipleCategories = data.categories.length > 1 || hasPlans

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-900">
      {/* Table confirmation modal — shown when no table param in URL */}
      {!effectiveTable && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm rounded-t-3xl bg-white px-6 pb-10 pt-6 shadow-2xl sm:rounded-3xl sm:pb-8">
            <div className="mb-5 flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-2xl">
                🪑
              </div>
              <h2 className="text-lg font-bold text-slate-900">Which table are you at?</h2>
              <p className="text-sm text-slate-500">
                Enter your table number to place orders and track your meal.
              </p>
            </div>
            <form
              onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault()
                const trimmed = manualTable.trim()
                if (!trimmed) return
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev)
                  next.set('table', trimmed)
                  return next
                }, { replace: true })
              }}
            >
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 5"
                value={manualTable}
                autoFocus
                onChange={(e) => setManualTable(e.target.value)}
                className="mb-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-center text-2xl font-bold tracking-widest text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-400 focus:bg-white"
              />
              <button
                type="submit"
                disabled={!manualTable.trim()}
                className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40"
              >
                Confirm table
              </button>
            </form>
            <p className="mt-4 text-center text-[11px] text-slate-400">
              Scan the QR code at your table to skip this step next time.
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-md px-4 pb-4 pt-6">
        <header className="relative z-30 mb-4 px-3 pt-1 text-center">
          {(data.restaurant.websiteUrl || data.restaurant.instagramUrl || data.restaurant.facebookUrl) && (
            <div ref={socialMenuRef} className="absolute right-0 top-1">
              <button
                type="button"
                onClick={() => setSocialMenuOpen((prev) => !prev)}
                aria-label="Open social links"
                aria-expanded={socialMenuOpen}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <SocialIcon />
              </button>
              {socialMenuOpen && (
                <div className="absolute right-0 z-40 mt-2 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white p-1.5 shadow-md">
                  {data.restaurant.websiteUrl && (
                    <a
                      href={data.restaurant.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open website"
                      onClick={() => setSocialMenuOpen(false)}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    >
                      <WebsiteIcon />
                    </a>
                  )}
                  {data.restaurant.instagramUrl && (
                    <a
                      href={data.restaurant.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open Instagram"
                      onClick={() => setSocialMenuOpen(false)}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-pink-500 transition-colors hover:bg-pink-50 hover:text-purple-600 focus:outline-none focus:ring-2 focus:ring-pink-200"
                    >
                      <InstagramIcon />
                    </a>
                  )}
                  {data.restaurant.facebookUrl && (
                    <a
                      href={data.restaurant.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open Facebook"
                      onClick={() => setSocialMenuOpen(false)}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#1877F2] transition-colors hover:bg-blue-50 hover:text-[#0f5dcc] focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <FacebookIcon />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
          {data.restaurant.logoUrl && (
            <div className="mx-auto mb-3 h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.restaurant.logoUrl}
                alt={`${data.restaurant.name} logo`}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          {shouldShowStatusBanner && latestOrderStatus === 'new' && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800">
              <p>Your order was sent to the kitchen.</p>
              <button
                type="button"
                aria-label="Dismiss order status"
                onClick={() => currentStatusKey && setDismissedStatusKey(currentStatusKey)}
                className="rounded p-0.5 text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-900"
              >
                ×
              </button>
            </div>
          )}
          {shouldShowStatusBanner && latestOrderStatus === 'preparing' && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-sky-50 px-2.5 py-1.5 text-[11px] font-medium text-sky-800">
              <p>Your order is being prepared.</p>
              <button
                type="button"
                aria-label="Dismiss order status"
                onClick={() => currentStatusKey && setDismissedStatusKey(currentStatusKey)}
                className="rounded p-0.5 text-sky-700 transition-colors hover:bg-sky-100 hover:text-sky-900"
              >
                ×
              </button>
            </div>
          )}
          {shouldShowStatusBanner && latestOrderStatus === 'ready' && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-800">
              <p>Your order is ready.</p>
              <button
                type="button"
                aria-label="Dismiss order status"
                onClick={() => currentStatusKey && setDismissedStatusKey(currentStatusKey)}
                className="rounded p-0.5 text-emerald-700 transition-colors hover:bg-emerald-100 hover:text-emerald-900"
              >
                ×
              </button>
            </div>
          )}
        </header>
        <div className="sticky top-0 z-20 mb-3 -mx-1 bg-slate-50 px-1 pt-1 pb-2">
          {/* <div className="mb-1 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setSearchOpen((prev) => !prev)
                if (searchOpen) {
                  setSearchQuery('')
                }
              }}
              aria-label={searchOpen ? 'Close search' : 'Open search'}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 shadow-sm hover:border-slate-300"
            >
              <span aria-hidden="true">🔍</span>
            </button>
          </div> */}
          {searchOpen && (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label htmlFor="menu-search" className="sr-only">
                  Search menu
                </label>
                <input
                  id="menu-search"
                  type="search"
                  placeholder="Search dishes…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false)
                  setSearchQuery('')
                }}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-300"
              >
                Close
              </button>
            </div>
          )}
          {hasMultipleCategories && (
            <div className="mt-2">
              <nav className="flex gap-1.5 overflow-x-auto pb-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId('all')}
                  className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    selectedCategoryId === 'all'
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  All
                </button>
                {hasPlans && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId(PLANS_ID)}
                    className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      selectedCategoryId === PLANS_ID
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    עסקיות
                  </button>
                )}
                {data.categories.map((cat) => (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat._id)}
                    className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      selectedCategoryId === cat._id
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </div>
        {/* Category quick-jump nav – commented out for now
        <nav className="sticky top-12 z-20 mb-4 flex justify-center gap-2 overflow-x-auto bg-transparent pb-1 pt-1 text-xs">
          {filteredCategories.map((cat) => (
            <button
              key={cat._id}
              type="button"
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 shadow-sm"
              onClick={() => {
                const el = document.getElementById(`cat-${cat._id}`)
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }}
            >
              {cat.name}
            </button>
          ))}
        </nav>
        */}
        <main className="space-y-6 pb-4">
          {/* Plans category — shown only when explicitly selected */}
          {hasPlans && selectedCategoryId === PLANS_ID && (
            <section id={`cat-${PLANS_ID}`} className="scroll-mt-24">
              <BusinessPlansSection
                plans={data.businessPlans!}
                currencySymbol={currencySymbol}
              />
            </section>
          )}
          {filteredCategories.length === 0 && selectedCategoryId !== PLANS_ID ? (
            <p className="py-6 text-center text-sm text-slate-500">
              No items match &quot;{searchQuery}&quot;. Try a different search.
            </p>
          ) : selectedCategoryId === PLANS_ID ? null : (
            filteredCategories.map((cat) => (
              <section key={cat._id} id={`cat-${cat._id}`} className="scroll-mt-24">
                <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-800 uppercase">
                  {cat.name}
                </h2>
                <div className="space-y-2">
                  {cat.items.map((item) => (
                    <MenuItemCard
                      key={item._id}
                      item={item}
                      currencySymbol={currencySymbol}
                      onDetailOpen={() => setItemDetailOpen(true)}
                      onDetailClose={() => setItemDetailOpen(false)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </main>
        <div className="pb-28" />
      </div>
      {!itemDetailOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-center px-4 pb-4">
          <div className="flex w-full max-w-md items-center gap-2 rounded-full bg-slate-900 text-slate-50 shadow-lg shadow-slate-900/40 px-2 py-2">
            <button
              type="button"
              className="flex-1 whitespace-nowrap rounded-full border border-slate-700 bg-slate-800 px-3 py-2 text-[11px] font-medium text-slate-50 shadow-sm hover:bg-slate-700"
              onClick={() => setBillOpen(true)}
            >
              View bill
            </button>
            <div className="shrink-0">
              <CartSummary
                currencySymbol={currencySymbol}
                variant="dark"
                onOpenCart={() => {
                  setChatOpen(false)
                  setCartOpen(true)
                }}
              />
            </div>
          </div>
        </div>
      )}
      {!itemDetailOpen && !cartOpen && !confirmOpen && !billOpen && (
        <MascotAssistantTrigger
          mode="floating"
          active={chatOpen}
          onClick={() => {
            setCartOpen(false)
            setChatOpen((prev) => !prev)
          }}
          label={chatOpen ? 'Close Servo assistant' : 'Talk to Servo assistant'}
        />
      )}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onConfirmOrder={() => {
          setCartOpen(false)
          setConfirmOpen(true)
        }}
        restaurantId={data.restaurant._id}
        currencySymbol={currencySymbol}
        menuItems={data?.categories?.flatMap((c) => c.items) ?? []}
      />
      <ChatPanel
        restaurantId={data.restaurant._id}
        tableKey={tableKey}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        currencySymbol={currencySymbol}
      />
      {billOpen && (
        <BillPanel
          restaurantId={data.restaurant._id}
          open={billOpen}
          onClose={() => setBillOpen(false)}
          tableNumber={effectiveTable}
          currencySymbol={currencySymbol}
        />
      )}
      {confirmOpen && (
        <OrderConfirmationModal
          restaurantId={data.restaurant._id}
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirmed={() => {
            // Status will be updated via sockets / fetch; no extra flag needed here
          }}
          initialTable={effectiveTable}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  )
}

export default function MenuPage() {
  return (
    <CartProvider>
      <MenuPageInner />
    </CartProvider>
  )
}

function BusinessPlansSection({
  plans,
  currencySymbol,
}: {
  plans: BusinessPlan[]
  currencySymbol: string
}) {
  const { addItem } = useCart()

  const handleAddPlanToCart = (plan: BusinessPlan) => {
    if (!plan.items.length) return
    addItem(
      {
        _id: `business-plan:${plan._id}`,
        name: plan.name || 'Business meal',
        description: plan.description ?? '',
        price: plan.price,
        allergens: [],
        tags: ['Business meal'],
        imageUrl: undefined,
      },
      1,
      undefined,
      {
        bundleItems: plan.items.map((entry) => ({
          menuItemId: entry._id,
          quantity: entry.quantity && entry.quantity > 0 ? entry.quantity : 1,
        })),
      }
    )
  }

  if (!plans.length) return null

  const now = new Date()

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-slate-800 uppercase">עסקיות</h2>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          Special deal
        </span>
      </div>
      <div className="space-y-3">
        {plans.map((plan) => {
          const available = isBusinessPlanCurrentlyAvailable(plan.timeNote ?? '', now)
          return (
            <div
              key={plan._id}
              className={`overflow-hidden rounded-2xl border transition ${
                available
                  ? 'border-slate-200 bg-white shadow-sm'
                  : 'border-slate-100 bg-slate-50 opacity-60'
              }`}
            >
              {/* Card header: name + price + availability badge */}
              <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-2">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {plan.name || 'עסקית'}
                  </h3>
                  {plan.timeNote && (
                    <p className="mt-0.5 text-[11px] text-slate-500">{plan.timeNote}</p>
                  )}
                  {!available && (
                    <span className="mt-1 inline-block rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                      Not available right now
                    </span>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-xl font-bold text-slate-900 tabular-nums">
                    {currencySymbol}{plan.price.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Description */}
              {plan.description && (
                <p className="px-4 pb-2 text-xs text-slate-500 leading-relaxed">
                  {plan.description}
                </p>
              )}

              {/* Included items as pills */}
              {plan.items.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                  {plan.items.map((item) => (
                    <span
                      key={item._id}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-100 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                    >
                      {item.quantity > 1 && (
                        <span className="font-bold text-slate-800">{item.quantity}×</span>
                      )}
                      {item.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Add button */}
              <div className="border-t border-slate-100 px-4 py-3">
                <button
                  type="button"
                  disabled={!available}
                  onClick={() => {
                    if (!available) return
                    handleAddPlanToCart(plan)
                  }}
                  className={`w-full rounded-xl py-2.5 text-sm font-semibold transition ${
                    available
                      ? 'bg-slate-900 text-white hover:bg-slate-700'
                      : 'cursor-not-allowed bg-slate-200 text-slate-400'
                  }`}
                >
                  {available ? 'Add to order' : 'Not available'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function isBusinessPlanCurrentlyAvailable(timeNote: string, now: Date): boolean {
  const trimmed = timeNote.trim()
  if (!trimmed) return true

  const day = now.getDay() // 0-6, Sun-Sat
  const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes()

  const parseTime = (t: string): number | null => {
    const [h, m] = t.split(':')
    const hh = Number(h)
    const mm = Number(m ?? '0')
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null
    return hh * 60 + mm
  }

  const dayIndexFromToken = (token: string): number | null => {
    const lower = token.toLowerCase()
    if (lower.startsWith('sun')) return 0
    if (lower.startsWith('mon')) return 1
    if (lower.startsWith('tue')) return 2
    if (lower.startsWith('wed')) return 3
    if (lower.startsWith('thu')) return 4
    if (lower.startsWith('fri')) return 5
    if (lower.startsWith('sat')) return 6
    if (lower.startsWith('weekday')) return -1 // special handled below
    return null
  }

  const normalize = trimmed
    .replace(/\s+/g, ' ')
    .replace(/[–—]/g, '-')

  // Expect something like "Sun-Thu 12:00-16:00" or "Weekdays 11:30-16:00"
  const match = normalize.match(/^([^0-9]+)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/)
  if (!match) {
    // If we can't confidently parse, don't block the plan.
    return true
  }

  const dayPart = match[1].trim()
  const startStr = match[2]
  const endStr = match[3]

  const startMinutes = parseTime(startStr)
  const endMinutes = parseTime(endStr)
  if (startMinutes == null || endMinutes == null) return true

  const days: number[] = []
  const segments = dayPart.split(',').map((s) => s.trim())

  for (const seg of segments) {
    if (!seg) continue
    if (/^weekdays?/i.test(seg)) {
      // Mon-Fri
      days.push(1, 2, 3, 4, 5)
      continue
    }
    const [fromToken, toToken] = seg.split('-').map((s) => s.trim())
    const fromIdx = dayIndexFromToken(fromToken)
    const toIdx = toToken ? dayIndexFromToken(toToken) : fromIdx
    if (fromIdx == null || toIdx == null) continue
    if (fromIdx <= toIdx) {
      for (let d = fromIdx; d <= toIdx; d++) days.push(d)
    } else {
      // e.g. Fri-Mon
      for (let d = fromIdx; d <= 6; d++) days.push(d)
      for (let d = 0; d <= toIdx; d++) days.push(d)
    }
  }

  if (!days.length) return true

  return (
    days.includes(day) &&
    minutesSinceMidnight >= startMinutes &&
    minutesSinceMidnight <= endMinutes
  )
}


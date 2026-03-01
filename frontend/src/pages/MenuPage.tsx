import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { io, type Socket } from 'socket.io-client'
import { CartProvider } from '../components/CartContext'
import type { MenuCategory, Restaurant } from '../components/types'
import MenuItemCard from '../components/MenuItemCard'
import CartSummary from '../components/CartSummary'
import ChatPanel from '../components/ChatPanel'
import OrderConfirmationModal from '../components/OrderConfirmationModal'
import CartDrawer from '../components/CartDrawer'
import BillPanel from '../components/BillPanel'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

let socket: Socket | null = null

type OrderStatus = 'new' | 'preparing' | 'ready'

interface MenuResponse {
  restaurant: Restaurant
  categories: MenuCategory[]
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
  const [searchParams] = useSearchParams()
  const [data, setData] = useState<MenuResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [billOpen, setBillOpen] = useState(false)
  const [itemDetailOpen, setItemDetailOpen] = useState(false)
  const tableFromUrl = searchParams.get('table') ?? undefined
  const tableKey = tableFromUrl ?? 'default'
  const latestOrderIdRef = useRef<string | null>(null)
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
      if (!data?.restaurant?._id || !tableFromUrl) {
        latestOrderIdRef.current = null
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
        const forTable = orders.filter((o) => o.tableNumber === tableFromUrl)
        if (forTable.length === 0) {
          latestOrderIdRef.current = null
          setLatestOrderStatus(null)
          return
        }
        const latest = forTable[0]
        latestOrderIdRef.current = latest._id
        setLatestOrderStatus(latest.status)
      } catch {
        // ignore status loading errors on the guest side
      }
    }
    void loadLatestOrderStatus()
  }, [data?.restaurant?._id, tableFromUrl])

  useEffect(() => {
    if (!data?.restaurant?._id) return

    socket = io(API_BASE, { transports: ['websocket'] })
    socket.emit('join-restaurant', data.restaurant._id)

    socket.on('order:new', (order: { _id: string; status: OrderStatus; tableNumber?: string }) => {
      if (tableFromUrl && order.tableNumber === tableFromUrl) {
        latestOrderIdRef.current = order._id
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

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-900">
      <div className="mx-auto max-w-md px-4 pb-4 pt-6">
        <header className="mb-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm shadow-slate-200/40">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              {data.restaurant.name}
            </h1>
            {tableFromUrl && (
              <span className="shrink-0 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                Table {tableFromUrl}
              </span>
            )}
          </div>
          {latestOrderStatus === 'new' && (
            <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800">
              Your order was sent to the kitchen.
            </p>
          )}
          {latestOrderStatus === 'preparing' && (
            <p className="mt-2 rounded-md bg-sky-50 px-2.5 py-1.5 text-[11px] font-medium text-sky-800">
              Your order is being prepared.
            </p>
          )}
          {latestOrderStatus === 'ready' && (
            <p className="mt-2 rounded-md bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-800">
              Your order is ready.
            </p>
          )}
        </header>
        <nav className="sticky top-0 z-20 mb-4 flex justify-center gap-2 overflow-x-auto bg-transparent pb-1 pt-1 text-xs">
          {data.categories.map((cat) => (
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
        <main className="space-y-6 pb-4">
          {data.categories.map((cat) => (
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
          ))}
        </main>
      </div>
      {!itemDetailOpen && (
      <div className="fixed bottom-4 left-0 right-0 z-30 flex justify-center px-4">
        <div className="flex w-full max-w-md items-center gap-2 rounded-full bg-slate-900 text-slate-50 shadow-lg shadow-slate-900/40 px-3 py-2">
          <button
            type="button"
            className="flex-1 rounded-full border border-slate-700 bg-slate-800 px-3 py-2 text-[11px] font-medium text-slate-50 shadow-sm hover:bg-slate-700"
            onClick={() => {
              setCartOpen(false)
              setChatOpen((prev) => !prev)
            }}
          >
            Ask before ordering
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-700 bg-slate-800 px-3 py-2 text-[11px] font-medium text-slate-50 shadow-sm hover:bg-slate-700"
            onClick={() => setBillOpen(true)}
          >
            View bill
          </button>
          <div className="ml-auto">
            <CartSummary
              currencySymbol={currencySymbol}
              onOpenCart={() => {
                setChatOpen(false)
                setCartOpen(true)
              }}
            />
          </div>
        </div>
      </div>
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
          tableNumber={tableFromUrl}
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
          initialTable={tableFromUrl}
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


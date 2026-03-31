import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { io, type Socket } from 'socket.io-client'
import KitchenOrderCard, { type KitchenOrder } from '../components/KitchenOrderCard'
import emptyCartIllustration from '../assets/empty-cart-illustration.png'
import { useAuth } from '../components/AuthContext'
import { apiFetch } from '../lib/api'
import type { Restaurant } from '../components/types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

let socket: Socket | null = null

interface WaiterCall {
  _id: string
  restaurantId: string
  tableNumber?: string
  notes?: string
  status: 'open' | 'handled'
  createdAt: string
}

interface RestaurantTable {
  _id: string
  restaurantId: string
  name: string
  number: string
  status: 'active' | 'inactive'
}

export default function KitchenDashboardPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>()
  const { restaurant, token, updateRestaurant } = useAuth()
  const [pausingOrders, setPausingOrders] = useState(false)
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([])
  const [restaurantTables, setRestaurantTables] = useState<RestaurantTable[]>([])
  const [activeTab, setActiveTab] = useState<'orders' | 'tables' | 'history'>(() => {
    if (typeof window === 'undefined') return 'orders'
    const key = restaurantId ? `kitchenActiveTab:${restaurantId}` : 'kitchenActiveTab'
    const saved = window.localStorage.getItem(key)
    if (saved === 'orders' || saved === 'tables' || saved === 'history') {
      return saved
    }
    return 'orders'
  })
  const [createTableOpen, setCreateTableOpen] = useState(false)
  const [newTableNumber, setNewTableNumber] = useState('')
  const [newTableName, setNewTableName] = useState('')
  const [creatingTable, setCreatingTable] = useState(false)
  const [createTableError, setCreateTableError] = useState<string | null>(null)
  const [bulkCreateOpen, setBulkCreateOpen] = useState(false)
  const [bulkStartNumber, setBulkStartNumber] = useState('')
  const [bulkEndNumber, setBulkEndNumber] = useState('')
  const [bulkCreating, setBulkCreating] = useState(false)
  const [bulkCreateError, setBulkCreateError] = useState<string | null>(null)
  const [historyOrders, setHistoryOrders] = useState<KitchenOrder[]>([])
  const [historyLoading, setHistoryLoading] = useState(() => {
    if (typeof window === 'undefined') return false
    const key = restaurantId ? `kitchenActiveTab:${restaurantId}` : 'kitchenActiveTab'
    return window.localStorage.getItem(key) === 'history'
  })
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [tablesLoading, setTablesLoading] = useState(true)
  const [historyTableNumber, setHistoryTableNumber] = useState<string>('')
  const [historyStatus, setHistoryStatus] = useState<'all' | 'new' | 'preparing' | 'ready'>('all')
  const [historyFrom, setHistoryFrom] = useState<string>('')
  const [historyTo, setHistoryTo] = useState<string>('')
  const [collapsedTables, setCollapsedTables] = useState<Set<string>>(new Set())
  const [selectedTableKeys, setSelectedTableKeys] = useState<Set<string>>(new Set())
  const [mergedClearLoading, setMergedClearLoading] = useState(false)
  const lastInitialOrdersFetchAtRef = useRef(0)
  const lastTablesFetchAtRef = useRef(0)
  const pollBackoffUntilRef = useRef(0)

  const toggleTableCollapsed = (tableKey: string) => {
    setCollapsedTables((prev) => {
      const next = new Set(prev)
      if (next.has(tableKey)) {
        next.delete(tableKey)
      } else {
        next.add(tableKey)
      }
      return next
    })
  }

  const toggleTableSelected = (tableKey: string) => {
    setSelectedTableKeys((prev) => {
      const next = new Set(prev)
      if (next.has(tableKey)) {
        next.delete(tableKey)
      } else {
        next.add(tableKey)
      }
      return next
    })
  }

  // Persist merged table selection so guest bill panels can show a combined bill
  useEffect(() => {
    if (!restaurantId || activeTab !== 'tables') return
    const controller = new AbortController()

    const syncMerge = async () => {
      try {
        const tableNumbers: string[] = []
        selectedTableKeys.forEach((key) => {
          if (key === 'no-table') return
          tableNumbers.push(key)
        })

        await fetch(`${API_BASE}/api/restaurants/${restaurantId}/merged-tables`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tables: tableNumbers }),
          signal: controller.signal,
        })
      } catch {
        // ignore background sync errors
      }
    }

    void syncMerge()

    return () => {
      controller.abort()
    }
  }, [restaurantId, activeTab, selectedTableKeys])

  useEffect(() => {
    if (!restaurantId) return
    try {
      window.localStorage.setItem(`kitchenActiveTab:${restaurantId}`, activeTab)
    } catch {
      // ignore localStorage errors
    }
  }, [activeTab, restaurantId])

  useEffect(() => {
    const load = async () => {
      if (!restaurantId) return
      const now = Date.now()
      // React StrictMode in dev can run effects twice on mount; avoid duplicate immediate calls.
      if (now - lastInitialOrdersFetchAtRef.current < 1200) return
      lastInitialOrdersFetchAtRef.current = now
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/api/restaurants/${restaurantId}/orders`)
        const data = (await res.json()) as KitchenOrder[] & { message?: string }
        if (res.status === 429) {
          setError('Rate limited. Retrying automatically in a few seconds.')
          pollBackoffUntilRef.current = Date.now() + 15000
          return
        }
        if (!res.ok) {
          throw new Error(data.message ?? 'Failed to load orders')
        }
        setOrders(data)
        const waiterRes = await fetch(
          `${API_BASE}/api/restaurants/${restaurantId}/waiter-calls`
        )
        const waiterData = (await waiterRes.json()) as WaiterCall[] & { message?: string }
        if (waiterRes.status === 429) {
          setError('Rate limited. Retrying automatically in a few seconds.')
          pollBackoffUntilRef.current = Date.now() + 15000
          return
        }
        if (!waiterRes.ok) {
          throw new Error(waiterData.message ?? 'Failed to load waiter calls')
        }
        setWaiterCalls(waiterData)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [restaurantId])

  // Lightweight polling as a safety net in case sockets fail
  useEffect(() => {
    if (!restaurantId || activeTab !== 'orders') return

    const intervalId = window.setInterval(async () => {
      if (Date.now() < pollBackoffUntilRef.current) return
      try {
        const res = await fetch(`${API_BASE}/api/restaurants/${restaurantId}/orders`)
        const data = (await res.json()) as KitchenOrder[] & { message?: string }
        if (res.status === 429) {
          pollBackoffUntilRef.current = Date.now() + 15000
          return
        }
        if (res.ok) {
          setOrders(data)
        }
        const waiterRes = await fetch(
          `${API_BASE}/api/restaurants/${restaurantId}/waiter-calls`
        )
        const waiterData = (await waiterRes.json()) as WaiterCall[] & { message?: string }
        if (waiterRes.status === 429) {
          pollBackoffUntilRef.current = Date.now() + 15000
          return
        }
        if (waiterRes.ok) {
          setWaiterCalls(waiterData)
        }
      } catch {
        // ignore background polling errors
      }
    }, 4000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [restaurantId, activeTab])

  useEffect(() => {
    const loadTables = async () => {
      if (!restaurantId) return
      const now = Date.now()
      // Avoid duplicate initial table request from StrictMode dev effect replay.
      if (now - lastTablesFetchAtRef.current < 1200) return
      lastTablesFetchAtRef.current = now
      setTablesLoading(true)
      try {
        const res = await fetch(`${API_BASE}/api/restaurants/${restaurantId}/tables`)
        const data = (await res.json()) as RestaurantTable[] & { message?: string }
        if (res.status === 429) {
          return
        }
        if (!res.ok) {
          throw new Error(data.message ?? 'Failed to load tables')
        }
        setRestaurantTables(data)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err)
      } finally {
        setTablesLoading(false)
      }
    }
    void loadTables()
  }, [restaurantId])

  useEffect(() => {
    if (!restaurantId) return

    socket = io(API_BASE, { transports: ['websocket'] })
    socket.emit('join-restaurant', restaurantId)

    socket.on('order:new', (order: KitchenOrder) => {
      setOrders((prev) => [order, ...prev])
    })

    socket.on('order:updated', (payload: { orderId: string; status: KitchenOrder['status'] }) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === payload.orderId ? { ...o, status: payload.status } : o))
      )
    })

    socket.on('waiter:call', (payload: WaiterCall) => {
      setWaiterCalls((prev) => [payload, ...prev])
    })

    socket.on('waiter:call:handled', (payload: { callId: string }) => {
      setWaiterCalls((prev) => prev.filter((call) => call._id !== payload.callId))
    })

    return () => {
      socket?.off('order:new')
      socket?.off('order:updated')
      socket?.off('waiter:call')
      socket?.off('waiter:call:handled')
      socket?.disconnect()
      socket = null
    }
  }, [restaurantId])

  const changeStatus = async (orderId: string, status: KitchenOrder['status']) => {
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        throw new Error('Failed to update status')
      }
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status } : o))
      )
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
    }
  }

  const markWaiterCallHandled = async (callId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/waiter-calls/${callId}/handled`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        throw new Error('Failed to mark waiter call as handled')
      }
      setWaiterCalls((prev) => prev.filter((call) => call._id !== callId))
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
    }
  }

  const tables = useMemo(() => {
    const byKey = new Map<
      string,
      {
        key: string
        label: string
        orders: KitchenOrder[]
        waiterCalls: WaiterCall[]
      }
    >()

    restaurantTables.forEach((table) => {
      byKey.set(table.number, {
        key: table.number,
        label: table.name || `Table ${table.number}`,
        orders: [],
        waiterCalls: [],
      })
    })

    const ensureTable = (key: string, tableNumber?: string) => {
      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          label: tableNumber ? `Table ${tableNumber}` : 'No table',
          orders: [],
          waiterCalls: [],
        })
      }
    }

    orders.forEach((order) => {
      const key = order.tableNumber ?? 'no-table'
      ensureTable(key, order.tableNumber)
      byKey.get(key)!.orders.push(order)
    })

    waiterCalls.forEach((call) => {
      const key = call.tableNumber ?? 'no-table'
      ensureTable(key, call.tableNumber)
      byKey.get(key)!.waiterCalls.push(call)
    })

    const getLatestOrderTime = (table: {
      orders: KitchenOrder[]
    }): number | null => {
      if (table.orders.length === 0) return null
      return table.orders.reduce((latest, order) => {
        const time = new Date(order.createdAt).getTime()
        return time > latest ? time : latest
      }, 0)
    }

    const getNumericTableNumber = (key: string): number | null => {
      const n = Number.parseInt(key, 10)
      return Number.isNaN(n) ? null : n
    }

    return Array.from(byKey.values()).sort((a, b) => {
      const aLatest = getLatestOrderTime(a)
      const bLatest = getLatestOrderTime(b)

      if (aLatest !== null && bLatest !== null && aLatest !== bLatest) {
        return bLatest - aLatest
      }

      if (aLatest !== null && bLatest === null) return -1
      if (aLatest === null && bLatest !== null) return 1

      const aNum = getNumericTableNumber(a.key)
      const bNum = getNumericTableNumber(b.key)

      if (aNum !== null && bNum !== null && aNum !== bNum) {
        return aNum - bNum
      }

      if (aNum !== null && bNum === null) return -1
      if (aNum === null && bNum !== null) return 1

      return a.label.localeCompare(b.label)
    })
  }, [orders, waiterCalls, restaurantTables])

  const mergedSelection = useMemo(() => {
    if (selectedTableKeys.size === 0) return null
    const selected = new Set(selectedTableKeys)
    const selectedTables = tables.filter((t) => selected.has(t.key))
    if (selectedTables.length === 0) return null

    const mergedOrders = selectedTables.flatMap((t) => t.orders)
    const totalAmount = mergedOrders.reduce((sum, order) => {
      const orderTotal = order.items.reduce(
        (itemSum, item) => itemSum + (item.menuItem?.price ?? 0) * item.quantity,
        0
      )
      return sum + orderTotal
    }, 0)

    const tableLabels = selectedTables.map((t) => t.label)
    const tableNumbers = selectedTables
      .map((t) => (t.key === 'no-table' ? undefined : t.orders[0]?.tableNumber))
      .filter((n): n is string => Boolean(n))

    return {
      orders: mergedOrders,
      totalAmount,
      tableLabels,
      tableNumbers,
    }
  }, [selectedTableKeys, tables])

  const clearTableOrders = async (tableNumber?: string) => {
    if (!restaurantId) return
    try {
      const params = new URLSearchParams()
      if (tableNumber) {
        params.set('tableNumber', tableNumber)
      }
      const url =
        params.size > 0
          ? `${API_BASE}/api/restaurants/${restaurantId}/orders?${params.toString()}`
          : `${API_BASE}/api/restaurants/${restaurantId}/orders`

      const res = await fetch(url, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to close table')
      }

      setOrders((prev) =>
        prev.filter((order) =>
          tableNumber ? order.tableNumber !== tableNumber : Boolean(order.tableNumber)
        )
      )
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
    }
  }

  const clearMergedTables = async () => {
    if (!restaurantId || !mergedSelection || mergedSelection.tableNumbers.length === 0) return
    setMergedClearLoading(true)
    try {
      for (const tableNumber of mergedSelection.tableNumbers) {
        // Reuse existing clear logic per table
        await clearTableOrders(tableNumber)
      }
      setSelectedTableKeys(new Set())
    } finally {
      setMergedClearLoading(false)
    }
  }

  const createTable = async () => {
    if (!restaurantId) return
    const trimmedNumber = newTableNumber.trim()
    const trimmedName = newTableName.trim()
    if (!trimmedNumber) {
      setCreateTableError('Table number is required')
      return
    }
    setCreatingTable(true)
    setCreateTableError(null)
    try {
      const res = await fetch(`${API_BASE}/api/restaurants/${restaurantId}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: trimmedNumber,
          name: trimmedName || `Table ${trimmedNumber}`,
        }),
      })
      const data = (await res.json()) as RestaurantTable & { message?: string }
      if (!res.ok) {
        throw new Error(data.message ?? 'Failed to create table')
      }
      setRestaurantTables((prev) => [...prev, data])
      setNewTableNumber('')
      setNewTableName('')
      setCreateTableOpen(false)
    } catch (err) {
      setCreateTableError((err as Error).message)
    } finally {
      setCreatingTable(false)
    }
  }

  const createTablesBulk = async () => {
    if (!restaurantId) return
    const startValue = bulkStartNumber.trim()
    const endValue = bulkEndNumber.trim()
    const start = Number.parseInt(startValue, 10)
    const end = Number.parseInt(endValue, 10)

    if (!startValue || !endValue || Number.isNaN(start) || Number.isNaN(end)) {
      setBulkCreateError('Both start and end table numbers are required')
      return
    }

    if (start <= 0 || end <= 0) {
      setBulkCreateError('Table numbers must be positive')
      return
    }

    if (start > end) {
      setBulkCreateError('Start number must be less than or equal to end number')
      return
    }

    setBulkCreating(true)
    setBulkCreateError(null)

    try {
      const createdTables: RestaurantTable[] = []

      for (let n = start; n <= end; n++) {
        const tableNumber = String(n)
        const res = await fetch(`${API_BASE}/api/restaurants/${restaurantId}/tables`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            number: tableNumber,
            name: `Table ${tableNumber}`,
          }),
        })

        if (res.status === 409) {
          continue
        }

        const data = (await res.json()) as RestaurantTable & { message?: string }

        if (!res.ok) {
          throw new Error(data.message ?? 'Failed to create tables')
        }

        createdTables.push(data)
      }

      if (createdTables.length === 0) {
        setBulkCreateError('No tables were created. They may already exist.')
        return
      }

      setRestaurantTables((prev) => [...prev, ...createdTables])
      setBulkStartNumber('')
      setBulkEndNumber('')
      setBulkCreateOpen(false)
    } catch (err) {
      setBulkCreateError((err as Error).message)
    } finally {
      setBulkCreating(false)
    }
  }

  const loadHistory = async () => {
    if (!restaurantId) return
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const params = new URLSearchParams()
      if (historyTableNumber) {
        params.set('tableNumber', historyTableNumber)
      }
      if (historyStatus !== 'all') {
        params.set('status', historyStatus)
      }
      if (historyFrom) {
        params.set('from', historyFrom)
      }
      if (historyTo) {
        params.set('to', historyTo)
      }
      params.set('includeClosed', 'true')
      const url =
        params.size > 0
          ? `${API_BASE}/api/restaurants/${restaurantId}/orders?${params.toString()}`
          : `${API_BASE}/api/restaurants/${restaurantId}/orders`
      const res = await fetch(url)
      const data = (await res.json()) as KitchenOrder[] & { message?: string }
      if (!res.ok) {
        throw new Error(data.message ?? 'Failed to load order history')
      }
      setHistoryOrders(data)
    } catch (err) {
      setHistoryError((err as Error).message)
      setHistoryOrders([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab !== 'history') return
    void loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const isAcceptingOrders = restaurant?.allowOrders !== false

  const handleToggleOrders = async () => {
    if (!restaurant || !token) return
    setPausingOrders(true)
    try {
      const updated = await apiFetch<Restaurant>(`/api/restaurants/${restaurant._id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ allowOrders: !isAcceptingOrders }),
      })
      updateRestaurant(updated)
    } catch {
      // ignore; the UI will just stay in its previous state
    } finally {
      setPausingOrders(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-4">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {restaurant && restaurantId === restaurant._id && restaurant.name
                ? `${restaurant.name} · Kitchen`
                : 'Kitchen'}
            </h1>
            <p className="text-xs text-slate-500">
              Incoming orders and waiter calls in real time.
            </p>
          </div>
          {restaurant && restaurantId === restaurant._id && token && (
            <button
              type="button"
              onClick={() => { void handleToggleOrders() }}
              disabled={pausingOrders}
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
                isAcceptingOrders
                  ? 'bg-emerald-100 text-emerald-800 hover:bg-red-100 hover:text-red-700'
                  : 'bg-red-100 text-red-700 hover:bg-emerald-100 hover:text-emerald-800'
              }`}
              title={isAcceptingOrders ? 'Click to pause new orders' : 'Click to resume accepting orders'}
            >
              {pausingOrders
                ? '…'
                : isAcceptingOrders
                  ? 'Orders: ON'
                  : 'Orders: PAUSED'}
            </button>
          )}
        </header>
        <div className="mb-4 flex gap-2 rounded-full bg-slate-100 p-1 text-xs">
          <button
            type="button"
            className={`flex-1 rounded-full px-3 py-1 font-medium ${
              activeTab === 'orders'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600'
            }`}
            onClick={() => setActiveTab('orders')}
          >
            Orders
          </button>
          <button
            type="button"
            className={`flex-1 rounded-full px-3 py-1 font-medium ${
              activeTab === 'tables'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600'
            }`}
            onClick={() => setActiveTab('tables')}
          >
            Tables
          </button>
          <button
            type="button"
            className={`flex-1 rounded-full px-3 py-1 font-medium ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600'
            }`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </div>
        {activeTab === 'orders' && loading && (
          <div className="mt-3 space-y-3" aria-busy="true" aria-label="Loading orders">
            <div className="h-14 rounded-2xl bg-slate-200/80 animate-pulse" />
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="h-4 w-16 rounded bg-slate-200 animate-pulse" />
                    <div className="h-5 w-14 rounded-full bg-slate-200 animate-pulse" />
                  </div>
                  <ul className="mb-3 space-y-2">
                    <li className="h-3 w-full rounded bg-slate-200 animate-pulse" />
                    <li className="h-3 w-5/6 rounded bg-slate-200 animate-pulse" />
                    <li className="h-3 w-2/3 rounded bg-slate-200 animate-pulse" />
                  </ul>
                  <div className="flex justify-between">
                    <div className="h-3 w-12 rounded bg-slate-200 animate-pulse" />
                    <div className="flex gap-1">
                      <div className="h-6 w-12 rounded-full bg-slate-200 animate-pulse" />
                      <div className="h-6 w-16 rounded-full bg-slate-200 animate-pulse" />
                      <div className="h-6 w-12 rounded-full bg-slate-200 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'orders' && !loading && waiterCalls.length > 0 && (
          <section className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
            <h2 className="mb-2 text-sm font-semibold text-amber-900">Waiter calls</h2>
            <div className="space-y-2">
              {waiterCalls.map((call) => (
                <div
                  key={call._id}
                  className="flex items-start justify-between gap-3 rounded-xl bg-white/70 px-3 py-2 text-xs"
                >
                  <div>
                    <div className="text-[11px] font-semibold text-amber-900">
                      {call.tableNumber ? `Table ${call.tableNumber}` : 'Unknown table'}
                    </div>
                    <div className="text-[11px] text-amber-800">
                      Called at{' '}
                      {new Date(call.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    {call.notes && (
                      <div className="mt-1 text-[11px] text-amber-900">Notes: {call.notes}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="self-center rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[11px] font-medium text-amber-900 hover:bg-amber-200"
                    onClick={() => void markWaiterCallHandled(call._id)}
                  >
                    Mark handled
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
        {activeTab === 'orders' && !loading && (
          <>
            {error && <p className="text-sm text-rose-500">{error}</p>}
            {!error && orders.length === 0 && (
              <div className="mt-4 flex min-h-[calc(100vh-180px)] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/80 px-6 py-10 text-center">
                <img
                  src={emptyCartIllustration}
                  alt="No orders yet illustration"
                  className="mb-4 h-32 w-auto opacity-95"
                />
                <h2 className="text-sm font-semibold text-slate-900">No orders yet</h2>
                <p className="mt-1 text-xs text-slate-500">
                  New customer orders will appear here the moment they come in.
                </p>
              </div>
            )}
            {!error && orders.length > 0 && (
              <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {orders.map((order) => (
                  <KitchenOrderCard
                    key={order._id}
                    order={order}
                    onChangeStatus={(status) => void changeStatus(order._id, status)}
                  />
                ))}
              </div>
            )}
          </>
        )}
        {activeTab === 'tables' && (loading || tablesLoading) && (
          <div className="mt-3 space-y-3" aria-busy="true" aria-label="Loading tables">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
              <div className="flex gap-2">
                <div className="h-8 w-20 rounded-full bg-slate-200 animate-pulse" />
                <div className="h-8 w-24 rounded-full bg-slate-200 animate-pulse" />
              </div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-slate-200 animate-pulse" />
                    <div className="flex-1">
                      <div className="mb-1 h-4 w-28 rounded bg-slate-200 animate-pulse" />
                      <div className="h-3 w-32 rounded bg-slate-100 animate-pulse" />
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    <div className="h-16 rounded-xl bg-slate-100 animate-pulse" />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-24 rounded-xl bg-slate-100 animate-pulse" />
                      <div className="h-24 rounded-xl bg-slate-100 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'tables' && !loading && !tablesLoading && (
          <div className="mt-3 space-y-3">
            {mergedSelection && mergedSelection.tableLabels.length > 1 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-sm">
                <h2 className="mb-1 text-sm font-semibold text-slate-900">
                  Combined bill for {mergedSelection.tableLabels.join(', ')}
                </h2>
                <p className="mb-2 text-[11px] text-slate-600">
                  This merges orders from the selected tables into a single bill for payment.
                </p>
                <p className="mb-3 text-[11px] font-medium text-slate-900">
                  Total amount (menu prices sum): {mergedSelection.totalAmount.toFixed(2)}
                </p>
                <button
                  type="button"
                  className="rounded-full bg-slate-900 px-4 py-1.5 text-[11px] font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  disabled={mergedClearLoading}
                  onClick={() => void clearMergedTables()}
                >
                  {mergedClearLoading ? 'Clearing tables…' : 'Mark paid & clear selected tables'}
                </button>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <p className="text-slate-600">Manage tables</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                  onClick={() => {
                    setCreateTableError(null)
                    setCreateTableOpen(true)
                  }}
                >
                  + New table
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                  onClick={() => {
                    setBulkCreateError(null)
                    setBulkCreateOpen(true)
                  }}
                >
                  Bulk create
                </button>
              </div>
            </div>
            {createTableOpen && (
              <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-sm">
                <h2 className="mb-2 text-sm font-semibold text-slate-900">Create new table</h2>
                <div className="mb-2 grid gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium text-slate-700">Table number</span>
                    <input
                      type="text"
                      className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="e.g. 5"
                      value={newTableNumber}
                      onChange={(e) => setNewTableNumber(e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium text-slate-700">Display name</span>
                    <input
                      type="text"
                      className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="Defaults to “Table {number}”"
                      value={newTableName}
                      onChange={(e) => setNewTableName(e.target.value)}
                    />
                  </label>
                </div>
                {createTableError && (
                  <p className="mb-2 text-[11px] text-rose-500">{createTableError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-full px-3 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
                    onClick={() => {
                      if (creatingTable) return
                      setCreateTableOpen(false)
                      setNewTableNumber('')
                      setNewTableName('')
                      setCreateTableError(null)
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-slate-900 px-4 py-1 text-[11px] font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                    disabled={creatingTable}
                    onClick={() => void createTable()}
                  >
                    {creatingTable ? 'Creating…' : 'Create table'}
                  </button>
                </div>
              </div>
            )}
            {bulkCreateOpen && (
              <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-sm">
                <h2 className="mb-2 text-sm font-semibold text-slate-900">Bulk create tables</h2>
                <div className="mb-2 grid gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium text-slate-700">
                      From table number
                    </span>
                    <input
                      type="text"
                      className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="e.g. 1"
                      value={bulkStartNumber}
                      onChange={(e) => setBulkStartNumber(e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium text-slate-700">
                      To table number
                    </span>
                    <input
                      type="text"
                      className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="e.g. 10"
                      value={bulkEndNumber}
                      onChange={(e) => setBulkEndNumber(e.target.value)}
                    />
                  </label>
                </div>
                {bulkCreateError && (
                  <p className="mb-2 text-[11px] text-rose-500">{bulkCreateError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-full px-3 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
                    onClick={() => {
                      if (bulkCreating) return
                      setBulkCreateOpen(false)
                      setBulkStartNumber('')
                      setBulkEndNumber('')
                      setBulkCreateError(null)
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-slate-900 px-4 py-1 text-[11px] font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                    disabled={bulkCreating}
                    onClick={() => void createTablesBulk()}
                  >
                    {bulkCreating ? 'Creating…' : 'Create tables'}
                  </button>
                </div>
              </div>
            )}
            {tables.length === 0 && (
              <div className="mt-4 flex min-h-[calc(100vh-180px)] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/80 px-6 py-8 text-center">
                <img
                  src={emptyCartIllustration}
                  alt="No tables yet illustration"
                  className="mb-4 h-24 w-auto opacity-95"
                />
                <h2 className="text-sm font-semibold text-slate-900">No tables yet</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Create tables so you can organize and track incoming orders.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-slate-900 px-4 py-1.5 text-[11px] font-medium text-white hover:bg-slate-800"
                    onClick={() => {
                      setCreateTableError(null)
                      setCreateTableOpen(true)
                    }}
                  >
                    + New table
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                    onClick={() => {
                      setBulkCreateError(null)
                      setBulkCreateOpen(true)
                    }}
                  >
                    Bulk create
                  </button>
                </div>
              </div>
            )}
            {tables.map((table) => {
              const activeOrders = table.orders.filter((o) => o.status !== 'ready')
              const readyOrders = table.orders.filter((o) => o.status === 'ready')
              const isCollapsed = collapsedTables.has(table.key)
              return (
                <div
                  key={table.key}
                  className="rounded-2xl border border-slate-200 bg-white text-sm shadow-sm overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2 p-3">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => toggleTableCollapsed(table.key)}
                      aria-expanded={!isCollapsed}
                    >
                      <span
                        className={`shrink-0 text-slate-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                        aria-hidden
                      >
                        ▶
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-slate-900">
                          {table.label}
                        </h2>
                        <p className="text-[11px] text-slate-500">
                          {table.orders.length} orders · {table.waiterCalls.length} waiter calls
                        </p>
                      </div>
                    </button>
                    {table.orders.length > 0 && (
                      <button
                        type="button"
                        className="shrink-0 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          void clearTableOrders(
                            table.key === 'no-table' ? undefined : table.orders[0]?.tableNumber
                          )
                        }}
                      >
                        Clear table
                      </button>
                    )}
                    <div className="shrink-0 pl-1">
                      <label className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900"
                          checked={selectedTableKeys.has(table.key)}
                          onChange={(e) => {
                            e.stopPropagation()
                            toggleTableSelected(table.key)
                          }}
                        />
                        <span>Merge</span>
                      </label>
                    </div>
                  </div>
                  {!isCollapsed && (
                    <div className="border-t border-slate-100 px-3 pb-3 pt-2">
                  {table.waiterCalls.length > 0 && (
                    <div className="mb-2 rounded-xl bg-amber-50 px-2 py-2">
                      <p className="mb-1 text-[11px] font-semibold text-amber-900">
                        Waiter calls
                      </p>
                      <div className="space-y-1">
                        {table.waiterCalls.map((call) => (
                          <div
                            key={call._id}
                            className="flex items-center justify-between gap-2 rounded-lg bg-white/80 px-2 py-1 text-[11px]"
                          >
                            <span className="text-amber-900">
                              Called at{' '}
                              {new Date(call.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <button
                              type="button"
                              className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900 hover:bg-amber-200"
                              onClick={() => void markWaiterCallHandled(call._id)}
                            >
                              Mark handled
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {table.orders.length > 0 && (
                    <div className="space-y-2">
                      {activeOrders.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold text-slate-800">
                            Active orders
                          </p>
                          <div className="grid gap-2 md:grid-cols-2">
                            {activeOrders.map((order) => (
                              <KitchenOrderCard
                                key={order._id}
                                order={order}
                                onChangeStatus={(status) =>
                                  void changeStatus(order._id, status)
                                }
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      {readyOrders.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold text-slate-800">
                            Ready orders
                          </p>
                          <div className="grid gap-2 md:grid-cols-2">
                            {readyOrders.map((order) => (
                              <KitchenOrderCard
                                key={order._id}
                                order={order}
                                onChangeStatus={(status) =>
                                  void changeStatus(order._id, status)
                                }
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {activeTab === 'history' && historyLoading && (
          <div className="mt-3 space-y-3 text-xs" aria-busy="true" aria-label="Loading history">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-2 h-4 w-28 rounded bg-slate-200 animate-pulse" />
              <div className="mb-3 grid gap-2 sm:grid-cols-4">
                <div className="h-8 rounded-xl bg-slate-200 animate-pulse" />
                <div className="h-8 rounded-xl bg-slate-200 animate-pulse" />
                <div className="h-8 rounded-xl bg-slate-200 animate-pulse" />
                <div className="h-8 rounded-xl bg-slate-200 animate-pulse" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
                <div className="h-8 w-24 rounded-full bg-slate-200 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="h-3 w-16 rounded bg-slate-200 animate-pulse" />
                    <div className="h-5 w-14 rounded-full bg-slate-200 animate-pulse" />
                  </div>
                  <div className="mb-2 h-3 w-24 rounded bg-slate-100 animate-pulse" />
                  <ul className="space-y-1">
                    <li className="h-3 w-full rounded bg-slate-100 animate-pulse" />
                    <li className="h-3 w-3/4 rounded bg-slate-100 animate-pulse" />
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'history' && !historyLoading && (
          <div className="mt-3 space-y-3 text-xs">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">Order history</h2>
              <div className="mb-3 grid gap-2 sm:grid-cols-4">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-slate-700">Table</span>
                  <select
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-900 outline-none"
                    value={historyTableNumber}
                    onChange={(e) => setHistoryTableNumber(e.target.value)}
                  >
                    <option value="">All tables</option>
                    {restaurantTables.map((table) => (
                      <option key={table._id} value={table.number}>
                        {table.name}
                      </option>
                    ))}
                    <option value="__no-table__" disabled>
                      {/* placeholder for future no-table filter */}
                    </option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-slate-700">Status</span>
                  <select
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-900 outline-none"
                    value={historyStatus}
                    onChange={(e) =>
                      setHistoryStatus(e.target.value as 'all' | 'new' | 'preparing' | 'ready')
                    }
                  >
                    <option value="all">All</option>
                    <option value="new">New</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-slate-700">From</span>
                  <input
                    type="date"
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-900 outline-none"
                    value={historyFrom}
                    onChange={(e) => setHistoryFrom(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-slate-700">To</span>
                  <input
                    type="date"
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-900 outline-none"
                    value={historyTo}
                    onChange={(e) => setHistoryTo(e.target.value)}
                  />
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-slate-500">
                  {historyLoading
                    ? 'Loading...'
                    : historyOrders.length > 0
                      ? `${historyOrders.length} orders`
                      : 'No orders for selected filters.'}
                </div>
                <button
                  type="button"
                  className="rounded-full bg-slate-900 px-4 py-1 text-[11px] font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  disabled={historyLoading}
                  onClick={() => void loadHistory()}
                >
                  Apply filters
                </button>
              </div>
              {historyError && (
                <p className="mt-2 text-[11px] text-rose-500">{historyError}</p>
              )}
            </div>
            <div className="space-y-2">
              {historyOrders.map((order) => (
                <div
                  key={order._id}
                  className="rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-sm"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-500">
                        #{order._id.slice(-5)}
                      </span>
                      {order.tableNumber && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">
                          Table {order.tableNumber}
                        </span>
                      )}
                    </div>
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      {order.status}
                    </span>
                  </div>
                  <div className="mb-1 text-[11px] text-slate-500">
                    {new Date(order.createdAt).toLocaleString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </div>
                  <ul className="mt-1 space-y-1 text-[11px] text-slate-800">
                    {order.items.map((item) => (
                      <li key={item._id} className="flex justify-between gap-2">
                        <span>
                          <span className="font-semibold">{item.quantity}×</span>{' '}
                          {item.menuItem?.name ?? 'Unknown item'}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {order.notes && (
                    <p className="mt-1 text-[11px] text-amber-700">Note: {order.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


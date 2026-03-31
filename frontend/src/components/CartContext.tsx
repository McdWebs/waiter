import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { CartItem, MenuItem } from './types'

interface CartContextValue {
  items: CartItem[]
  addItem: (
    item: MenuItem,
    quantity?: number,
    notes?: string,
    options?: { bundleItems?: { menuItemId: string; quantity: number }[] }
  ) => void
  updateItem: (menuItemId: string, quantity: number, notes?: string) => void
  removeItem: (menuItemId: string) => void
  clear: () => void
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

function getCartStorageKey() {
  if (typeof window === 'undefined') return 'ai-waiter:cart'
  try {
    const url = new URL(window.location.href)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const restaurantIndex = pathParts.indexOf('restaurant')
    const slug =
      restaurantIndex !== -1 && pathParts[restaurantIndex + 1]
        ? pathParts[restaurantIndex + 1]
        : 'unknown'
    const table = url.searchParams.get('table') ?? 'default'
    return `ai-waiter:cart:${slug}:${table}`
  } catch {
    return 'ai-waiter:cart'
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [storageKey] = useState(() => getCartStorageKey())

  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = window.localStorage.getItem(storageKey)
      if (!stored) return []
      const parsed = JSON.parse(stored) as CartItem[]
      if (!Array.isArray(parsed)) return []
      return parsed
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items))
    } catch {
      // ignore persistence errors
    }
  }, [items, storageKey])

  const addItem = (
    item: MenuItem,
    quantity = 1,
    notes?: string,
    options?: { bundleItems?: { menuItemId: string; quantity: number }[] }
  ) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.menuItemId === item._id)
      if (existing) {
        return prev.map((p) =>
          p.menuItemId === item._id
            ? { ...p, quantity: p.quantity + quantity, notes: notes ?? p.notes }
            : p
        )
      }
      return [
        ...prev,
        {
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          quantity,
          notes,
          imageUrl: item.imageUrl,
          bundleItems: options?.bundleItems,
        },
      ]
    })
  }

  const updateItem = (menuItemId: string, quantity: number, notes?: string) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.menuItemId === menuItemId ? { ...item, quantity, notes: notes ?? item.notes } : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const removeItem = (menuItemId: string) => {
    setItems((prev) => prev.filter((item) => item.menuItemId !== menuItemId))
  }

  const clear = () => setItems([])

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <CartContext.Provider
      value={{ items, addItem, updateItem, removeItem, clear, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider')
  }
  return ctx
}


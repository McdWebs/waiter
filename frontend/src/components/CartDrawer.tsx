import { useState, useRef, useEffect, useMemo } from 'react'
import { useCart } from './CartContext'
import type { SuggestedItem } from './types'
import emptyCartIllustration from '../assets/empty-cart-illustration.png'
import MascotAssistantTrigger from './MascotAssistantTrigger'

interface MenuItemImage {
  _id: string
  imageUrl?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onConfirmOrder: () => void
  restaurantId: string
  currencySymbol: string
  /** All menu items (from categories) so we can resolve imageUrl for cart items that don't have it (e.g. from localStorage). */
  menuItems?: MenuItemImage[]
}

interface CartChatMessage {
  role: 'user' | 'assistant'
  content: string
  suggestions?: SuggestedItem[]
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

export default function CartDrawer({
  open,
  onClose,
  onConfirmOrder,
  restaurantId,
  currencySymbol,
  menuItems = [],
}: Props) {
  const { items, totalPrice, updateItem, removeItem, addItem } = useCart()
  const imageByMenuId = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of menuItems) {
      if (m.imageUrl) map.set(m._id, m.imageUrl)
    }
    return map
  }, [menuItems])
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<CartChatMessage[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = window.localStorage.getItem(
        `ai-waiter:cart-chat:${restaurantId}`
      )
      if (!stored) return []
      const parsed = JSON.parse(stored) as CartChatMessage[]
      if (!Array.isArray(parsed)) return []
      return parsed
    } catch {
      return []
    }
  })
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatListRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) {
      setChatOpen(false)
      setChatInput('')
      setChatLoading(false)
    }
  }, [open])

  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight
    }
  }, [chatMessages, chatOpen])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const original = document.body.style.overflow
    if (open) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `ai-waiter:cart-chat:${restaurantId}`,
        JSON.stringify(chatMessages)
      )
    } catch {
      // ignore persistence errors
    }
  }, [chatMessages, restaurantId])

  const sendCartMessage = async () => {
    if (!chatInput.trim()) return
    const userMessage: CartChatMessage = { role: 'user', content: chatInput.trim() }
    setChatMessages((prev) => [...prev, userMessage])
    setChatInput('')
    setChatLoading(true)
    try {
      const summary =
        items.length === 0
          ? undefined
          : items
              .map(
                (i) =>
                  `${i.quantity} x ${i.name} (${currencySymbol}${i.price.toFixed(2)})`
              )
              .join(', ')

      const apiMessages: CartChatMessage[] = [
        ...(chatMessages.length === 0
          ? [
              {
                role: 'user',
                content:
                  'You are helping me adjust my current order in the cart. ' +
                  'Explain clearly what you recommend to ADD or SWAP in simple, short sentences, ' +
                  'like: “Add X to your order” or “Swap Y for Z”. I will confirm by tapping buttons.',
              } satisfies CartChatMessage,
            ]
          : []),
        ...chatMessages,
        userMessage,
      ]

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          messages: apiMessages,
          cartSummary: summary,
        }),
      })
      const data = (await res.json()) as {
        reply?: string
        suggestions?: SuggestedItem[]
        message?: string
      }
      if (!res.ok) {
        throw new Error(data.message ?? 'Chat failed')
      }
      if (data.reply) {
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.reply!, suggestions: data.suggestions },
        ])
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong while contacting the assistant.',
        },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div
      className={`fixed inset-0 z-40 flex justify-end bg-black/30 transition-opacity ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
    >
      <div
        className={`flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform pointer-events-auto ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Your order</h2>
          <button
            type="button"
            className="text-xs text-slate-500 hover:text-slate-800"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 text-xs">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center">
              <div className="mb-1 h-28 w-40">
                <img
                  src={emptyCartIllustration}
                  alt="Empty cart"
                  className="h-full w-full object-contain"
                />
              </div>
              <p className="text-xs font-medium text-slate-800">Your cart is still empty</p>
              <p className="text-[11px] text-slate-500">
                Browse the menu and tap <span className="font-semibold">Add</span> to start building
                your order.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const imageUrl = item.imageUrl ?? imageByMenuId.get(item.menuItemId)
                return (
                <div
                  key={item.menuItemId}
                  className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50/90 to-orange-50/80"
                        aria-hidden
                      >
                        <svg
                          className="h-6 w-6 text-amber-300/90"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-900">{item.name}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {currencySymbol}
                      {(item.price * item.quantity).toFixed(2)}{' '}
                      <span className="text-slate-400">
                        ({item.quantity} × {currencySymbol}
                        {item.price.toFixed(2)})
                      </span>
                    </div>
                    {item.notes && (
                      <div className="mt-1 text-[11px] text-slate-500">Note: {item.notes}</div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="inline-flex items-center rounded-full border border-slate-300 bg-white">
                      <button
                        type="button"
                        className="px-2 py-1 text-[11px] text-slate-700"
                        onClick={() => updateItem(item.menuItemId, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="px-2 text-[11px] text-slate-900">{item.quantity}</span>
                      <button
                        type="button"
                        className="px-2 py-1 text-[11px] text-slate-700"
                        onClick={() => updateItem(item.menuItemId, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="text-[10px] text-slate-500 hover:text-rose-500"
                      onClick={() => removeItem(item.menuItemId)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
        <div className="border-t border-slate-200 px-4 py-3 text-xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium text-slate-900">Total</span>
            <span className="font-semibold text-slate-900">
              {currencySymbol}
              {totalPrice.toFixed(2)}
            </span>
          </div>
          <div className="mb-2 flex flex-col gap-2">
            <MascotAssistantTrigger
              mode="inline"
              active={chatOpen}
              loading={chatLoading}
              onClick={() => setChatOpen((open) => !open)}
              label={chatOpen ? 'Hide Servo order assistant' : 'Talk to Servo about this order'}
            />
            <button
              type="button"
              className="w-full rounded-full bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600"
              disabled={items.length === 0}
              onClick={onConfirmOrder}
            >
              Confirm order
            </button>
          </div>
          {chatOpen && (
            <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-800">
              <div
                ref={chatListRef}
                className="mb-2 max-h-32 space-y-1 overflow-y-auto pr-1"
              >
                {chatMessages.length === 0 && (
                  <p className="text-[11px] text-slate-500">
                    Ask about allergens, swap a dish, or get a recommendation before you send the
                    order.
                  </p>
                )}
                {chatMessages.map((m, idx) => (
                  <div key={idx} className="space-y-1">
                    <div
                      className={`flex ${
                        m.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-2 py-1 text-[11px] leading-relaxed ${
                          m.role === 'user'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-slate-900'
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                    {m.role === 'assistant' &&
                      m.suggestions &&
                      m.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2 pl-4">
                          {m.suggestions.map((s) => {
                            const inCart = items.some(
                              (i) => i.menuItemId === s._id
                            )
                            return (
                              <button
                                key={s._id}
                                type="button"
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] text-slate-700 shadow-sm hover:bg-emerald-50"
                                onClick={() => addItem(s, s.quantity)}
                              >
                                <span className="font-medium">{s.name}</span>
                                <span className="text-slate-400">
                                  {inCart ? 'Added · tap to add again' : 'Tap to add to order'}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1 rounded-xl bg-white px-2 py-1 text-[11px] text-slate-500">
                      <span className="sr-only">Assistant is typing</span>
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <input
                  className="flex-1 rounded-full border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Ask something about this order…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void sendCartMessage()
                    }
                  }}
                />
                <button
                  type="button"
                  className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                  disabled={chatLoading}
                  onClick={() => void sendCartMessage()}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


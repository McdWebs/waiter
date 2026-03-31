import { useEffect, useRef, useState } from 'react'
import { useCart } from './CartContext'
import type { SuggestedItem } from './types'

interface Message {
  role: 'user' | 'assistant'
  content: string
  suggestions?: SuggestedItem[]
}

interface Props {
  restaurantId: string
  tableKey?: string
  open: boolean
  onClose: () => void
  currencySymbol: string
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

export default function ChatPanel({ restaurantId, tableKey, open, onClose, currencySymbol }: Props) {
  const { items, addItem } = useCart()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [avatarSrc, setAvatarSrc] = useState('/mascot/images/servo_talking_chat.png')
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  if (!open) return null

  const startNewChat = () => {
    setMessages([])
    try {
      const storageKey = `ai-waiter:chat:${restaurantId}:${tableKey ?? 'default'}`
      window.localStorage.removeItem(storageKey)
    } catch {
      // ignore persistence errors
    }
  }

  const cartSummary =
    items.length === 0
      ? undefined
      : items
          .map(
            (item) =>
              `${item.quantity} x ${item.name} (${currencySymbol}${item.price.toFixed(2)})`
          )
          .join(', ')

  const sendMessage = async () => {
    if (!input.trim()) return
    const userMessage: Message = { role: 'user', content: input.trim() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          messages: [...messages, userMessage],
          cartSummary,
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
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.reply!, suggestions: data.suggestions },
        ])
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong while contacting the assistant.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const quickAsk = (text: string) => {
    setInput(text)
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 z-40 flex justify-center px-4">
      <div className="flex w-full max-w-md max-h-[60vh] flex-col overflow-hidden rounded-3xl border border-emerald-500/50 bg-white shadow-2xl shadow-emerald-500/25">
        <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/90 px-4 py-3 rounded-t-3xl">
          <div className="flex items-center gap-2">
            <div className="h-11 w-11 overflow-visible">
              <img
                src={avatarSrc}
                alt=""
                className="h-full w-full object-contain"
                onError={() => setAvatarSrc('/mascot/images/servo_base_image.png')}
              />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Talk to Servo</h2>
              <p className="text-[10px] text-emerald-700">Your table-side assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-[11px] text-emerald-700 hover:text-emerald-900"
              onClick={startNewChat}
            >
              New chat
            </button>
            <button
              type="button"
              className="text-xs text-slate-600 hover:text-slate-900"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3" ref={listRef}>
          {messages.length === 0 && (
            <p className="text-xs text-slate-500">
              Try: &quot;What&apos;s vegan?&quot;, &quot;Any spicy mains without nuts?&quot;, or
              &quot;Build me a balanced meal for two&quot;.
            </p>
          )}
          <div className="space-y-2">
            {messages.map((m, idx) => (
              <div key={idx} className="space-y-1">
                <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-900'
                    }`}
                  >
                    {m.role === 'assistant'
                      ? m.content.split('\n').map((line, idx) => (
                          <p
                            // eslint-disable-next-line react/no-array-index-key
                            key={idx}
                            className={
                              idx === 0
                                ? 'mb-1 font-medium'
                                : 'text-[11px] text-slate-800 last:mb-0'
                            }
                          >
                            {line}
                          </p>
                        ))
                      : m.content}
                  </div>
                </div>
                {m.role === 'assistant' && m.suggestions && m.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pl-6">
                    {m.suggestions.map((s) => {
                      const inCart = items.some((i) => i.menuItemId === s._id)
                      return (
                        <button
                          key={s._id}
                          type="button"
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] shadow-sm ${
                            inCart
                              ? 'border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-emerald-50'
                          }`}
                          onClick={() => addItem(s, s.quantity)}
                        >
                          <span className="font-medium">{s.name}</span>
                          <span className={inCart ? 'text-emerald-100/90' : 'text-slate-400'}>
                            {inCart
                              ? 'Added · tap to add again'
                              : `×${s.quantity} · ${currencySymbol}${s.price.toFixed(2)}`}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl bg-slate-100 px-3 py-2 text-xs text-slate-500">
                  <span className="sr-only">Assistant is typing</span>
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-slate-200 px-4 py-2">
          <div className="mb-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-700"
              onClick={() => quickAsk('Show me vegan options')}
            >
              Vegan options
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-700"
              onClick={() => quickAsk('No nuts, what do you recommend?')}
            >
              No nuts
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-700"
              onClick={() => quickAsk('Spicy dishes for two?')}
            >
              Spicy dishes
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              className="flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="Ask a question about the menu…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void sendMessage()
                }
              }}
            />
            <button
              type="button"
              className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 hover:bg-emerald-700"
              disabled={loading}
              onClick={() => void sendMessage()}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


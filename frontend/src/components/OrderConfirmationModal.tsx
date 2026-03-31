import { useCart } from './CartContext'
import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

interface Props {
  restaurantId: string
  open: boolean
  onClose: () => void
  onConfirmed: () => void
  initialTable?: string
}

export default function OrderConfirmationModal({
  restaurantId,
  open,
  onClose,
  onConfirmed,
  initialTable,
  currencySymbol = '$',
}: Props & { currencySymbol?: string }) {
  const { items, totalPrice, clear } = useCart()
  const [tableNumber, setTableNumber] = useState(initialTable ?? '')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const submitOrder = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const payloadItemsMap = new Map<string, { quantity: number; notes?: string }>()
      for (const item of items) {
        if (item.bundleItems && item.bundleItems.length > 0) {
          for (const bundled of item.bundleItems) {
            const existing = payloadItemsMap.get(bundled.menuItemId)
            const nextQty = bundled.quantity * item.quantity
            payloadItemsMap.set(bundled.menuItemId, {
              quantity: (existing?.quantity ?? 0) + nextQty,
              notes: existing?.notes ?? item.notes,
            })
          }
          continue
        }
        const existing = payloadItemsMap.get(item.menuItemId)
        payloadItemsMap.set(item.menuItemId, {
          quantity: (existing?.quantity ?? 0) + item.quantity,
          notes: existing?.notes ?? item.notes,
        })
      }

      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          tableNumber: tableNumber || undefined,
          notes: notes || undefined,
          items: Array.from(payloadItemsMap.entries()).map(([menuItemId, value]) => ({
            menuItemId,
            quantity: value.quantity,
            notes: value.notes,
          })),
        }),
      })
      const data = (await res.json()) as { orderId?: string; message?: string }
      if (!res.ok) {
        throw new Error(data.message ?? 'Failed to submit order')
      }
      clear()
      onConfirmed()
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40 sm:items-center">
      <div className="w-full rounded-t-3xl bg-white p-4 sm:mx-auto sm:max-w-md sm:rounded-3xl sm:border sm:border-slate-200 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Review your order</h2>
          <button
            type="button"
            className="text-xs text-slate-500 hover:text-slate-800"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="max-h-64 space-y-2 overflow-y-auto border-y border-slate-200 py-2 text-xs">
          {items.map((item) => (
            <div key={item.menuItemId} className="flex justify-between gap-2">
              <div>
                <div className="font-medium text-slate-900">
                  {item.quantity} × {item.name}
                </div>
                {item.notes && <div className="text-[10px] text-slate-500">Note: {item.notes}</div>}
              </div>
              <div className="text-right text-slate-900">
                {currencySymbol}
                {(item.price * item.quantity).toFixed(2)}
              </div>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-xs font-semibold text-slate-900">
            <span>Total</span>
            <span>
              {currencySymbol}
              {totalPrice.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {initialTable ? (
            <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800">
              Table {tableNumber || initialTable}
            </div>
          ) : (
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="Table number or name (optional)"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
            />
          )}
          <textarea
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="Any notes for the kitchen (optional)"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {error && <p className="text-xs text-rose-500">{error}</p>}
          <button
            type="button"
            className="mt-1 w-full rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            disabled={submitting}
            onClick={() => void submitOrder()}
          >
            {submitting ? 'Sending…' : 'Send to kitchen'}
          </button>
        </div>
      </div>
    </div>
  )
}


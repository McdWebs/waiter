import type { MenuItem } from './types'
import { useCart } from './CartContext'
import { useState } from 'react'

interface Props {
  item: MenuItem
  currencySymbol: string
  onDetailOpen?: () => void
  onDetailClose?: () => void
}

export default function MenuItemCard({ item, currencySymbol, onDetailOpen, onDetailClose }: Props) {
  const { addItem, items, updateItem } = useCart()
  const [showDetails, setShowDetails] = useState(false)

  const openDetails = () => {
    setShowDetails(true)
    onDetailOpen?.()
  }
  const closeDetails = () => {
    setShowDetails(false)
    onDetailClose?.()
  }
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  const inCart = items.find((cartItem) => cartItem.menuItemId === item._id)
  const isAvailable = item.available ?? true

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className={`w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition cursor-pointer ${
          isAvailable ? 'hover:border-emerald-200 hover:shadow-md' : 'opacity-60'
        }`}
        onClick={openDetails}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openDetails()
          }
        }}
      >
        {item.imageUrl ? (
          <div className="relative h-40 w-full overflow-hidden">
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-900 line-clamp-2">{item.name}</div>
            <p className="mt-1 text-xs text-slate-600 line-clamp-2">{item.description}</p>
            {item.tags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs font-medium text-slate-500">
              {currencySymbol}
              {item.price.toFixed(2)}
            </div>
            {isAvailable ? (
              <>
                <button
                  type="button"
                  className="mt-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    addItem(item, 1)
                  }}
                >
                  Add
                </button>
                {inCart ? (
                  <div className="mt-1 flex items-center justify-end gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">
                    <span>In cart</span>
                    <button
                      type="button"
                      className="h-4 w-4 rounded-full border border-slate-400 text-[11px] leading-[14px]"
                      onClick={(e) => {
                        e.stopPropagation()
                        updateItem(item._id, inCart.quantity - 1)
                      }}
                    >
                      −
                    </button>
                    <span className="min-w-[1.25rem] text-center font-semibold">
                      {inCart.quantity}
                    </span>
                    <button
                      type="button"
                      className="h-4 w-4 rounded-full border border-slate-400 text-[11px] leading-[14px]"
                      onClick={(e) => {
                        e.stopPropagation()
                        updateItem(item._id, inCart.quantity + 1)
                      }}
                    >
                      +
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="mt-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500">
                Unavailable
              </div>
            )}
          </div>
        </div>
      </div>

      {showDetails ? (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40 sm:items-center">
          <div className="w-full rounded-t-3xl bg-white sm:max-w-md sm:rounded-3xl sm:mx-auto shadow-xl overflow-hidden">
            {item.imageUrl ? (
              <div className="relative h-48 w-full">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}
            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-slate-900">{item.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                </div>
                <button
                  type="button"
                  className="text-sm text-slate-500 hover:text-slate-800"
                  onClick={closeDetails}
                >
                  Close
                </button>
              </div>
              {item.allergens.length > 0 ? (
                <p className="mt-2 text-xs text-amber-700">
                  Allergens: {item.allergens.join(', ')}
                </p>
              ) : null}
              <div className="mt-3 flex items-center justify-between">
                <div className="inline-flex items-center rounded-full border border-slate-300 bg-white">
                  <button
                    type="button"
                    className="px-3 py-1 text-sm text-slate-700"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={!isAvailable}
                  >
                    −
                  </button>
                  <span className="px-3 text-sm text-slate-900">{quantity}</span>
                  <button
                    type="button"
                    className="px-3 py-1 text-sm text-slate-700"
                    onClick={() => setQuantity((q) => q + 1)}
                    disabled={!isAvailable}
                  >
                    +
                  </button>
                </div>
                <div className="text-lg font-semibold text-emerald-700">
                  {currencySymbol}
                  {(item.price * quantity).toFixed(2)}
                </div>
              </div>
              <textarea
                className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="Add a note for this item (optional)"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="mt-3 flex items-center justify-between">
                {!isAvailable && (
                  <span className="text-xs font-medium text-rose-600">
                    This item is currently unavailable.
                  </span>
                )}
                <button
                  type="button"
                  className={`ml-auto rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm ${
                    isAvailable
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-slate-400 cursor-not-allowed'
                  }`}
                  disabled={!isAvailable}
                  onClick={() => {
                    if (!isAvailable) return
                    addItem(item, quantity, notes || undefined)
                    setQuantity(1)
                    setNotes('')
                    closeDetails()
                  }}
                >
                  Add to cart
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}


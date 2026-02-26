import { useCart } from './CartContext'

interface Props {
  onOpenCart: () => void
  currencySymbol: string
}

export default function CartSummary({ onOpenCart, currencySymbol }: Props) {
  const { totalItems, totalPrice } = useCart()

  if (totalItems === 0) return null

  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
      onClick={onOpenCart}
    >
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-semibold text-white">
        {totalItems}
      </span>
      <span>
        Cart · {currencySymbol}
        {totalPrice.toFixed(2)}
      </span>
    </button>
  )
}


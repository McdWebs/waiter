import { useCart } from './CartContext'

interface Props {
  onOpenCart: () => void
  currencySymbol: string
  variant?: 'light' | 'dark'
}

export default function CartSummary({ onOpenCart, currencySymbol, variant = 'light' }: Props) {
  const { totalItems, totalPrice } = useCart()

  if (totalItems === 0) return null

  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-2 text-xs font-medium shadow-sm transition-colors ${
        variant === 'dark'
          ? 'border-slate-700 bg-slate-800 text-slate-50 hover:bg-slate-700'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
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


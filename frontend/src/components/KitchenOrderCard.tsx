interface KitchenOrderItem {
  _id: string
  quantity: number
  notes?: string
  menuItem: {
    name: string
  } | null
}

export interface KitchenOrder {
  _id: string
  restaurantId: string
  status: 'new' | 'preparing' | 'ready'
  createdAt: string
  tableNumber?: string
  notes?: string
  items: KitchenOrderItem[]
}

interface Props {
  order: KitchenOrder
  onChangeStatus: (status: KitchenOrder['status']) => void
}

export default function KitchenOrderCard({ order, onChangeStatus }: Props) {
  const created = new Date(order.createdAt)
  const minsAgo = Math.max(
    0,
    Math.round((Date.now() - created.getTime()) / 1000 / 60)
  )

  const statusBadgeClasses: Record<KitchenOrder['status'], string> = {
    new: 'bg-slate-700 text-white',
    preparing: 'bg-amber-500 text-white',
    ready: 'bg-emerald-600 text-white',
  }

  const cardClasses: Record<KitchenOrder['status'], string> = {
    new: 'border-slate-300 bg-slate-100 shadow-slate-200/80',
    preparing: 'border-amber-300 bg-amber-50/80 shadow-amber-100/70',
    ready: 'border-emerald-300 bg-emerald-50/80 shadow-emerald-100/70',
  }

  return (
    <div
      className={`rounded-2xl p-4 text-sm text-slate-900 shadow-sm transition-colors ${cardClasses[order.status]}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500">
            #{order._id.slice(-5)}
          </span>
          {order.tableNumber && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">
              Table {order.tableNumber}
            </span>
          )}
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClasses[order.status]}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
          {order.status}
        </span>
      </div>
      <ul className="mb-2 space-y-1 text-xs">
        {order.items.map((item) => (
          <li key={item._id} className="flex justify-between gap-2">
            <span>
              <span className="font-semibold">{item.quantity}×</span>{' '}
              {item.menuItem?.name ?? 'Unknown item'}
              {item.notes && (
                <span className="ml-1 text-[10px] text-slate-500">
                  ({item.notes})
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      {order.notes && (
        <p className="mb-2 text-[11px] text-amber-700">Note: {order.notes}</p>
      )}
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>{minsAgo} min ago</span>
        <div className="flex gap-1">
          {order.status !== 'new' && (
            <button
              type="button"
              className="rounded-full border border-slate-300 px-2 py-0.5 bg-white text-slate-700 hover:bg-slate-50"
              onClick={() => onChangeStatus('new')}
            >
              New
            </button>
          )}
          {order.status !== 'preparing' && (
            <button
              type="button"
              className="rounded-full border border-slate-300 px-2 py-0.5 bg-white text-slate-700 hover:bg-slate-50"
              onClick={() => onChangeStatus('preparing')}
            >
              Preparing
            </button>
          )}
          {order.status !== 'ready' && (
            <button
              type="button"
              className="rounded-full border border-slate-300 px-2 py-0.5 bg-white text-slate-700 hover:bg-slate-50"
              onClick={() => onChangeStatus('ready')}
            >
              Ready
            </button>
          )}
        </div>
      </div>
    </div>
  )
}


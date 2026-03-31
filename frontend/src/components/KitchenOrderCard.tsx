interface KitchenOrderItem {
  _id: string
  quantity: number
  notes?: string
  menuItem: {
    name: string
    price?: number
  } | null
}

export interface KitchenOrder {
  _id: string
  restaurantId: string
  status: 'new' | 'preparing' | 'ready'
  createdAt: string
  tableNumber?: string
  waiterName?: string
  notes?: string
  items: KitchenOrderItem[]
}

interface Props {
  order: KitchenOrder
  onChangeStatus: (status: KitchenOrder['status']) => void
  /** When set, show Print button (e.g. when restaurant has printer enabled). */
  showPrint?: boolean
}

function printOrder(order: KitchenOrder) {
  const created = new Date(order.createdAt)
  const timeStr = created.toLocaleString()
  const itemsHtml = order.items
    .map(
      (item) =>
        `<tr><td>${item.quantity}×</td><td>${escapeHtml(item.menuItem?.name ?? 'Unknown')}${item.notes ? ` (${escapeHtml(item.notes)})` : ''}</td></tr>`
    )
    .join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Order #${order._id.slice(-5)}</title><style>
    body { font-family: system-ui, sans-serif; font-size: 14px; padding: 16px; max-width: 320px; }
    h1 { font-size: 18px; margin: 0 0 8px 0; }
    .meta { color: #666; font-size: 12px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 4px 0; border-bottom: 1px solid #eee; }
    .notes { margin-top: 12px; padding: 8px; background: #fef3c7; font-size: 12px; border-radius: 8px; }
  </style></head><body>
    <h1>Order #${order._id.slice(-5)}</h1>
    <div class="meta">${order.tableNumber ? `Table ${escapeHtml(order.tableNumber)}` : 'No table'} · ${escapeHtml(timeStr)}</div>
    <table><tbody>${itemsHtml}</tbody></table>
    ${order.notes ? `<div class="notes"><strong>Note:</strong> ${escapeHtml(order.notes)}</div>` : ''}
  </body></html>`

  const iframe = document.createElement('iframe')
  iframe.setAttribute('style', 'position:absolute;width:0;height:0;border:0;visibility:hidden')
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    return
  }
  doc.open()
  doc.write(html)
  doc.close()
  iframe.contentWindow?.focus()
  iframe.contentWindow?.print()
  const removeIframe = () => {
    try {
      document.body.removeChild(iframe)
    } catch {
      // ignore
    }
  }
  iframe.contentWindow?.addEventListener('afterprint', removeIframe)
  setTimeout(removeIframe, 1000)
}

function escapeHtml(s: string): string {
  const el = document.createElement('div')
  el.textContent = s
  return el.innerHTML
}

export default function KitchenOrderCard({ order, onChangeStatus, showPrint = true }: Props) {
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
          {order.waiterName && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-700">
              Waiter: {order.waiterName}
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
        <div className="flex flex-wrap items-center gap-1">
          {showPrint && (
            <button
              type="button"
              className="rounded-full border border-slate-300 px-2 py-0.5 bg-white text-slate-700 hover:bg-slate-50"
              onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              printOrder(order)
            }}
            >
              Print
            </button>
          )}
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


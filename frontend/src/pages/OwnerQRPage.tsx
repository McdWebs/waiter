import { useState } from 'react'
import QRCode from 'qrcode'
import { useAuth } from '../components/AuthContext'

const FRONTEND_BASE = import.meta.env.VITE_FRONTEND_BASE_URL ?? window.location.origin

export default function OwnerQRPage() {
  const { restaurant } = useAuth()
  const [tableCount, setTableCount] = useState(10)
  const [generated, setGenerated] = useState(false)
  const [qrUrls, setQrUrls] = useState<{ table: number; url: string; dataUrl: string }[]>([])
  const [loading, setLoading] = useState(false)

  const slug = restaurant?.slug ?? ''

  async function generateQRCodes() {
    if (!slug) return
    setLoading(true)
    const results: { table: number; url: string; dataUrl: string }[] = []

    for (let t = 1; t <= tableCount; t++) {
      const url = `${FRONTEND_BASE}/restaurant/${slug}/menu?table=${t}`
      const dataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
      })
      results.push({ table: t, url, dataUrl })
    }

    setQrUrls(results)
    setGenerated(true)
    setLoading(false)
  }

  function downloadAll() {
    qrUrls.forEach(({ table, dataUrl }) => {
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `table-${table}-qr.png`
      a.click()
    })
  }

  function downloadSingle(dataUrl: string, table: number) {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `table-${table}-qr.png`
    a.click()
  }

  function printAll() {
    const win = window.open('', '_blank')
    if (!win) return
    const html = `
      <html>
        <head>
          <title>QR Codes – ${restaurant?.name ?? 'Restaurant'}</title>
          <style>
            body { font-family: sans-serif; background: #fff; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; padding: 24px; }
            .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; page-break-inside: avoid; }
            .card img { width: 180px; height: 180px; }
            .card p { margin: 8px 0 0; font-weight: bold; font-size: 18px; }
            .card small { font-size: 11px; color: #64748b; word-break: break-all; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div class="grid">
            ${qrUrls.map(({ table, dataUrl, url }) => `
              <div class="card">
                <img src="${dataUrl}" alt="QR Table ${table}" />
                <p>שולחן ${table}</p>
                <small>${url}</small>
              </div>
            `).join('')}
          </div>
          <script>window.onload = () => window.print()<\/script>
        </body>
      </html>
    `
    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">QR Codes לשולחנות</h2>
        <p className="mt-1 text-sm text-slate-500">
          צור QR code לכל שולחן — הלקוח סורק וישר מגיע לתפריט עם מספר השולחן.
        </p>
      </div>

      {/* Config card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          כמה שולחנות יש לך?
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={200}
            value={tableCount}
            onChange={(e) => setTableCount(Math.max(1, Math.min(200, Number(e.target.value))))}
            className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          <button
            type="button"
            onClick={generateQRCodes}
            disabled={loading || !slug}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'מייצר...' : 'צור QR Codes'}
          </button>
        </div>
        {!slug && (
          <p className="mt-2 text-xs text-rose-500">לא נמצא slug למסעדה.</p>
        )}
      </div>

      {/* Results */}
      {generated && qrUrls.length > 0 && (
        <>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={downloadAll}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              ⬇ הורד הכל (PNG)
            </button>
            <button
              type="button"
              onClick={printAll}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              🖨 הדפס הכל
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {qrUrls.map(({ table, dataUrl }) => (
              <div
                key={table}
                className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <img src={dataUrl} alt={`QR Table ${table}`} className="w-36 h-36" />
                <p className="mt-2 text-sm font-bold text-slate-800">שולחן {table}</p>
                <button
                  type="button"
                  onClick={() => downloadSingle(dataUrl, table)}
                  className="mt-2 text-xs text-slate-400 hover:text-slate-700 underline transition-colors"
                >
                  הורד
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

import { parseBulkMenuText } from "./bulkMenu";

interface BulkImportModalProps {
  open: boolean;
  bulkImportText: string;
  setBulkImportText: (t: string) => void;
  bulkImportProgress: { done: number; total: number } | null;
  saving: boolean;
  currencySymbol: string;
  onClose: () => void;
  onImport: (parsed: ReturnType<typeof parseBulkMenuText>) => void;
}

export function BulkImportModal({
  open,
  bulkImportText,
  setBulkImportText,
  bulkImportProgress,
  saving,
  currencySymbol,
  onClose,
  onImport,
}: BulkImportModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto overscroll-contain sm:items-center">
      <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl my-4 sm:my-0">
        <h2 className="text-sm font-semibold text-slate-900">
          Bulk import from text
        </h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Paste your menu text below. A line without a dash is treated as a
          category name. A line like{" "}
          <span className="font-mono font-medium text-slate-700">
            Pinko — ₪53
          </span>{" "}
          is treated as an item.
        </p>
        <textarea
          className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400 font-mono leading-relaxed"
          rows={10}
          placeholder={`Cocktails\nPinko — ₪53\nNigori Mule — ₪58\n\nDesserts\nChocolate Fondant — ₪42`}
          value={bulkImportText}
          onChange={(e) => setBulkImportText(e.target.value)}
          disabled={bulkImportProgress !== null}
        />

        {(() => {
          if (!bulkImportText.trim()) return null;
          const parsed = parseBulkMenuText(bulkImportText);
          if (parsed.length === 0) {
            return (
              <p className="mt-2 text-[11px] text-amber-600">
                No valid categories or items detected yet. Make sure items use a
                dash (—) separator.
              </p>
            );
          }
          const totalItems = parsed.reduce((s, c) => s + c.items.length, 0);
          return (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 space-y-2 max-h-52 overflow-y-auto">
              <p className="text-[11px] font-semibold text-emerald-800">
                Preview — {parsed.length}{" "}
                {parsed.length === 1 ? "category" : "categories"}, {totalItems}{" "}
                {totalItems === 1 ? "item" : "items"}
              </p>
              {parsed.map((cat, i) => (
                <div key={i}>
                  <p className="text-[11px] font-semibold text-slate-800">
                    {cat.categoryName}
                  </p>
                  <ul className="mt-0.5 space-y-0.5 pl-3">
                    {cat.items.map((item, j) => (
                      <li
                        key={j}
                        className="text-[10px] text-slate-600 flex justify-between"
                      >
                        <span>{item.name}</span>
                        <span className="font-medium text-slate-800">
                          {currencySymbol}
                          {item.price.toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          );
        })()}

        {bulkImportProgress !== null && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-medium text-slate-700">
              Importing… {bulkImportProgress.done} / {bulkImportProgress.total}{" "}
              items
            </p>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200">
              <div
                className="h-1.5 rounded-full bg-emerald-500 transition-all"
                style={{
                  width: `${bulkImportProgress.total > 0 ? (bulkImportProgress.done / bulkImportProgress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2 text-xs">
          <button
            type="button"
            className="min-h-[44px] touch-manipulation rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            disabled={bulkImportProgress !== null}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="min-h-[44px] touch-manipulation rounded-full bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            disabled={
              saving ||
              bulkImportProgress !== null ||
              !bulkImportText.trim() ||
              parseBulkMenuText(bulkImportText).length === 0
            }
            onClick={() => {
              const parsed = parseBulkMenuText(bulkImportText);
              if (parsed.length === 0) return;
              onImport(parsed);
            }}
          >
            {bulkImportProgress !== null
              ? `Importing… (${bulkImportProgress.done}/${bulkImportProgress.total})`
              : (() => {
                  const parsed = parseBulkMenuText(bulkImportText);
                  if (!bulkImportText.trim() || parsed.length === 0)
                    return "Import";
                  const totalItems = parsed.reduce(
                    (s, c) => s + c.items.length,
                    0,
                  );
                  return `Import ${totalItems} item${totalItems === 1 ? "" : "s"} in ${parsed.length} categor${parsed.length === 1 ? "y" : "ies"}`;
                })()}
          </button>
        </div>
      </div>
    </div>
  );
}

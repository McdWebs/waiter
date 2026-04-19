import { DEFAULT_ALLERGENS, DEFAULT_TAGS } from "./constants";

interface AddItemModalProps {
  categoryName: string;
  saving: boolean;
  newItemImagePreview: string | null;
  setNewItemImagePreview: (v: string | null) => void;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}

export function AddItemModal({
  categoryName,
  saving,
  newItemImagePreview,
  setNewItemImagePreview,
  onClose,
  onSubmit,
}: AddItemModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto overscroll-contain sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl my-4 sm:my-0 max-h-[90vh] overflow-y-auto">
        <h2 className="text-sm font-semibold text-slate-900">Add item</h2>
        <p className="mt-1 text-[11px] text-slate-600">
          Create a new menu item in{" "}
          <span className="font-semibold">{categoryName}</span>.
        </p>
        <form
          className="mt-3 space-y-2 text-xs"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const formData = new FormData(form);
            if (!newItemImagePreview) {
              formData.delete("image");
            }
            void (async () => {
              await onSubmit(formData);
            })();
          }}
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              name="name"
              required
              className="min-h-[44px] flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="Item name"
            />
            <input
              name="price"
              type="number"
              min={0.01}
              step="0.01"
              className="min-h-[44px] w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-right text-xs text-slate-900 outline-none placeholder:text-slate-400 sm:w-24"
              placeholder="Price"
            />
          </div>
          <textarea
            name="description"
            rows={2}
            required
            className="min-h-[80px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="Short description"
          />
          <div className="space-y-2">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-700">
                Allergens (choose or add custom)
              </span>
              <div className="flex flex-wrap gap-1">
                {DEFAULT_ALLERGENS.map((allergen) => (
                  <label
                    key={allergen}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-700"
                  >
                    <input
                      type="checkbox"
                      name="allergenDefaults"
                      value={allergen}
                      className="h-3 w-3 rounded border-slate-300 text-emerald-600"
                    />
                    <span>{allergen}</span>
                  </label>
                ))}
              </div>
              <input
                name="allergensCustom"
                className="mt-1 w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="Custom allergens (comma separated, optional)"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-700">
                Tags (choose or add custom)
              </span>
              <div className="flex flex-wrap gap-1">
                {DEFAULT_TAGS.map((tag) => (
                  <label
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-700"
                  >
                    <input
                      type="checkbox"
                      name="tagDefaults"
                      value={tag}
                      className="h-3 w-3 rounded border-slate-300 text-emerald-600"
                    />
                    <span>{tag}</span>
                  </label>
                ))}
              </div>
              <input
                name="tagsCustom"
                className="mt-1 w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="Custom tags (comma separated, optional)"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-700">
                Item photo (optional)
              </span>
              <label className="group flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-[11px] text-slate-600 hover:border-emerald-400 hover:bg-emerald-50/40">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-semibold text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700">
                  JPG/PNG
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-slate-800 group-hover:text-emerald-800">
                    Upload item image
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Square image works best · max 5MB
                  </span>
                  {newItemImagePreview && (
                    <span className="mt-1 text-[10px] text-emerald-700">
                      Preview selected below
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      setNewItemImagePreview(url);
                    } else {
                      setNewItemImagePreview(null);
                    }
                  }}
                />
              </label>
              {newItemImagePreview && (
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="h-12 w-12 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    <img
                      src={newItemImagePreview}
                      alt="New item preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    className="text-[11px] font-medium text-rose-600 hover:text-rose-700"
                    onClick={() => {
                      setNewItemImagePreview(null);
                    }}
                  >
                    Remove image
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="min-h-[44px] touch-manipulation rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
              disabled={saving}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] touch-manipulation rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              disabled={saving}
            >
              Add item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

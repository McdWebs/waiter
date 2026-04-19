import { useState, type FormEvent } from "react";
import type {
  BusinessPlan,
  MenuCategory,
  MenuItem,
} from "../../components/types";

export interface BusinessPlanEditorProps {
  plan: BusinessPlan;
  categories: MenuCategory[];
  currencySymbol: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (payload: {
    _id?: string;
    name: string;
    description?: string;
    timeNote?: string;
    price: number;
    active: boolean;
    items: { menuItemId: string; quantity: number }[];
  }) => void;
}

export function BusinessPlanEditor({
  plan,
  categories,
  currencySymbol,
  saving,
  onCancel,
  onSave,
}: BusinessPlanEditorProps) {
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description ?? "");
  const [timeNote, setTimeNote] = useState(plan.timeNote ?? "");
  const [price, setPrice] = useState(plan.price);
  const [active, setActive] = useState(plan.active ?? true);
  const [items, setItems] = useState<
    { menuItemId: string; quantity: number }[]
  >(plan.items.map((it) => ({ menuItemId: it._id, quantity: it.quantity })));
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?._id ?? "",
  );
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);

  const selectedCategory = categories.find((c) => c._id === selectedCategoryId);
  const selectedCategoryItems = selectedCategory?.items ?? [];

  const addItemToPlan = () => {
    if (!selectedItemId) return;
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (p) => p.menuItemId === selectedItemId,
      );
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + (selectedQuantity || 1),
        };
        return next;
      }
      return [
        ...prev,
        { menuItemId: selectedItemId, quantity: selectedQuantity || 1 },
      ];
    });
  };

  const resolveItem = (menuItemId: string): MenuItem | undefined => {
    for (const cat of categories) {
      const found = cat.items.find((it) => it._id === menuItemId);
      if (found) return found;
    }
    return undefined;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Name is required");
      return;
    }
    if (!timeNote.trim()) {
      alert("Please set when this business plan is available.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      alert("Price must be a non-negative number");
      return;
    }
    if (items.length === 0) {
      alert("Please add at least one menu item to the plan.");
      return;
    }
    onSave({
      _id: plan._id || undefined,
      name: name.trim(),
      description: description.trim() || undefined,
      timeNote: timeNote.trim() || undefined,
      price,
      active,
      items,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 text-xs">
      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1 space-y-1">
            <label className="text-[11px] font-medium text-slate-700">
              Plan name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-h-[40px] w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="e.g. Lunch עסקית"
            />
          </div>
          <div className="w-full space-y-1 sm:w-32">
            <label className="text-[11px] font-medium text-slate-700">
              Price
            </label>
            <div className="flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1.5">
              <span className="text-[11px] text-slate-500">
                {currencySymbol}
              </span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={Number.isNaN(price) ? "" : price}
                onChange={(e) => {
                  const v = e.target.value;
                  setPrice(v === "" ? 0 : parseFloat(v) || 0);
                }}
                className="w-full border-none bg-transparent p-0 text-right text-xs text-slate-900 outline-none"
              />
            </div>
          </div>
        </div>
        <label className="inline-flex items-center gap-2 text-[11px] text-slate-700">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-3 w-3 rounded border-slate-300 text-emerald-600"
          />
          <span>Show this business plan on the guest menu</span>
        </label>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-medium text-slate-700">
          What&apos;s included (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="min-h-[64px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400"
          placeholder="Short description shown to guests."
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-medium text-slate-700">
          When it&apos;s available
        </label>
        <input
          value={timeNote}
          onChange={(e) => setTimeNote(e.target.value)}
          className="min-h-[40px] w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400"
          placeholder="e.g. Sun–Thu 12:00–16:00"
        />
        <div className="mt-1 flex flex-wrap gap-1.5">
          {[
            "Sun–Thu 12:00–16:00",
            "Mon–Fri 12:00–15:00",
            "Weekdays 11:30–16:00",
          ].map((preset) => (
            <button
              key={preset}
              type="button"
              className={`rounded-full border px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
                timeNote === preset
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
              }`}
              onClick={() => setTimeNote(preset)}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-slate-700">
            Included menu items
          </span>
          <span className="text-[10px] text-slate-500">
            {items.length} selected
          </span>
        </div>
        {categories.length === 0 ? (
          <p className="text-[11px] text-slate-500">
            Add at least one category and item to your menu first.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setSelectedItemId("");
                }}
                className="min-h-[36px] flex-1 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="min-h-[36px] flex-1 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none"
              >
                <option value="">Select dish…</option>
                {selectedCategoryItems.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name} ({currencySymbol}
                    {item.price.toFixed(2)})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={selectedQuantity}
                onChange={(e) =>
                  setSelectedQuantity(
                    Math.max(1, parseInt(e.target.value || "1", 10)),
                  )
                }
                className="min-h-[36px] w-16 rounded-full border border-slate-300 bg-white px-2 py-1.5 text-center text-xs text-slate-900 outline-none"
              />
              <div className="flex sm:w-auto">
                <button
                  type="button"
                  className="min-h-[36px] w-full rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 sm:w-auto"
                  disabled={!selectedItemId}
                  onClick={addItemToPlan}
                >
                  Add
                </button>
              </div>
            </div>
            {items.length > 0 && (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white px-2 py-1.5">
                {items.map((entry) => {
                  const menuItem = resolveItem(entry.menuItemId);
                  if (!menuItem) return null;
                  return (
                    <li
                      key={entry.menuItemId}
                      className="flex items-center justify-between gap-2 text-[11px] text-slate-700"
                    >
                      <div className="min-w-0">
                        <span className="font-medium">
                          {entry.quantity}× {menuItem.name}
                        </span>
                        <span className="ml-1 text-slate-500">
                          ({currencySymbol}
                          {menuItem.price.toFixed(2)})
                        </span>
                      </div>
                      <button
                        type="button"
                        className="text-[10px] text-rose-600 hover:text-rose-700"
                        onClick={() =>
                          setItems((prev) =>
                            prev.filter(
                              (p) => p.menuItemId !== entry.menuItemId,
                            ),
                          )
                        }
                      >
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          className="min-h-[40px] rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          disabled={saving}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="min-h-[40px] rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save business plan"}
        </button>
      </div>
    </form>
  );
}

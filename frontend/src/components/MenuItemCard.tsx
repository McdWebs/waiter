import type { MenuItem } from "./types";
import { useCart } from "./CartContext";
import { useState } from "react";

interface Props {
  item: MenuItem;
  currencySymbol: string;
  onDetailOpen?: () => void;
  onDetailClose?: () => void;
}

export default function MenuItemCard({
  item,
  currencySymbol,
  onDetailOpen,
  onDetailClose,
}: Props) {
  const { addItem, items, updateItem } = useCart();
  const [showDetails, setShowDetails] = useState(false);

  const openDetails = () => {
    setShowDetails(true);
    onDetailOpen?.();
  };
  const closeDetails = () => {
    setShowDetails(false);
    onDetailClose?.();
  };
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const inCart = items.find((cartItem) => cartItem.menuItemId === item._id);
  const isAvailable = item.available ?? true;

  const cardImageHeight = "h-20";
  const placeholderImage = (
    <div
      className={`flex w-full items-center justify-center bg-gradient-to-br from-amber-50/90 to-orange-50/80 ${cardImageHeight}`}
      aria-hidden
    >
      <svg
        className="h-8 w-8 text-amber-300/90"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  );

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className={`group flex w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white text-left shadow-sm transition cursor-pointer ${
          isAvailable
            ? "hover:border-emerald-300/80 hover:shadow-md"
            : "opacity-60"
        }`}
        onClick={openDetails}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openDetails();
          }
        }}
      >
        <div
          className={`relative w-24 shrink-0 overflow-hidden bg-slate-100 ${cardImageHeight}`}
        >
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.05]"
            />
          ) : (
            placeholderImage
          )}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-900 truncate">
              {item.name}
            </h3>
            <div className="mt-0.5 text-xs font-medium text-slate-600">
              {currencySymbol}
              {item.price.toFixed(2)}
            </div>
            {(item.tags?.length ?? 0) > 0 ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="shrink-0 self-center">
            {isAvailable ? (
              inCart ? (
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">
                  <button
                    type="button"
                    className="flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateItem(item._id, inCart.quantity - 1);
                    }}
                  >
                    −
                  </button>
                  <span className="min-w-[1rem] text-center font-semibold">
                    {inCart.quantity}
                  </span>
                  <button
                    type="button"
                    className="flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateItem(item._id, inCart.quantity + 1);
                    }}
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    addItem(item, 1);
                  }}
                >
                  Add
                </button>
              )
            ) : (
              <span className="text-[10px] font-medium text-slate-400">
                Unavailable
              </span>
            )}
          </div>
        </div>
      </div>

      {showDetails ? (
        <div
          className="fixed inset-0 z-30 flex items-end bg-black/50 backdrop-blur-sm sm:items-center"
          onClick={closeDetails}
        >
          <div
            className="w-full max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white sm:max-w-md sm:rounded-3xl sm:mx-auto shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full bg-slate-100 flex items-center justify-center">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="max-h-[60vh] max-w-full w-auto object-contain"
                />
              ) : (
                <div className="flex h-52 w-full items-center justify-center bg-gradient-to-br from-amber-50/90 to-orange-50/80">
                  <svg
                    className="h-20 w-20 text-amber-300/90"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {item.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.description}
                  </p>
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
                  Allergens: {item.allergens.join(", ")}
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
                  <span className="px-3 text-sm text-slate-900">
                    {quantity}
                  </span>
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
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-slate-400 cursor-not-allowed"
                  }`}
                  disabled={!isAvailable}
                  onClick={() => {
                    if (!isAvailable) return;
                    addItem(item, quantity, notes || undefined);
                    setQuantity(1);
                    setNotes("");
                    closeDetails();
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
  );
}

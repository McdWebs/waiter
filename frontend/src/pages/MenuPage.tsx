import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import { CartProvider, useCart } from "../components/CartContext";
import type {
  BusinessPlan,
  MenuCategory,
  Restaurant,
} from "../components/types";
import MenuItemCard from "../components/MenuItemCard";
import CartSummary from "../components/CartSummary";
import ChatPanel from "../components/ChatPanel";
import OrderConfirmationModal from "../components/OrderConfirmationModal";
import CartDrawer from "../components/CartDrawer";
import BillPanel from "../components/BillPanel";
import {
  registerServiceWorker,
  requestNotificationPermission,
  showLocalNotification,
} from "../utils/notifications";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

let socket: Socket | null = null;

type OrderStatus = "new" | "preparing" | "ready";

interface MenuResponse {
  restaurant: Restaurant;
  categories: MenuCategory[];
  businessPlans?: BusinessPlan[];
}

function getCurrencySymbol(currency?: string) {
  switch ((currency ?? "USD").toUpperCase()) {
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "ILS":
      return "₪";
    case "USD":
    default:
      return "$";
  }
}

function MenuPageInner() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<MenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [itemDetailOpen, setItemDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<"all" | string>(
    "all",
  );
  const tableFromUrl = searchParams.get("table") ?? undefined;
  const tableKey = tableFromUrl ?? "default";
  const latestOrderIdRef = useRef<string | null>(null);
  const [latestOrderStatus, setLatestOrderStatus] =
    useState<OrderStatus | null>(null);

  // Register service worker + request notification permission on mount
  useEffect(() => {
    void registerServiceWorker();
    void requestNotificationPermission();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/restaurants/${slug}/menu`);
        const json = (await res.json()) as MenuResponse & { message?: string };
        if (!res.ok) {
          throw new Error(json.message ?? "Failed to load menu");
        }
        setData(json);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [slug]);

  useEffect(() => {
    const loadLatestOrderStatus = async () => {
      if (!data?.restaurant?._id || !tableFromUrl) {
        latestOrderIdRef.current = null;
        setLatestOrderStatus(null);
        return;
      }
      try {
        const res = await fetch(
          `${API_BASE}/api/restaurants/${data.restaurant._id}/orders`,
        );
        const orders = (await res.json()) as {
          _id: string;
          status: OrderStatus;
          tableNumber?: string;
        }[];
        if (!res.ok) {
          return;
        }
        const forTable = orders.filter((o) => o.tableNumber === tableFromUrl);
        if (forTable.length === 0) {
          latestOrderIdRef.current = null;
          setLatestOrderStatus(null);
          return;
        }
        const latest = forTable[0];
        latestOrderIdRef.current = latest._id;
        setLatestOrderStatus(latest.status);
      } catch {
        // ignore status loading errors on the guest side
      }
    };
    void loadLatestOrderStatus();
  }, [data?.restaurant?._id, tableFromUrl]);

  useEffect(() => {
    if (!data?.restaurant?._id) return;

    socket = io(API_BASE, { transports: ["websocket"] });
    socket.emit("join-restaurant", data.restaurant._id);

    socket.on(
      "order:new",
      (order: { _id: string; status: OrderStatus; tableNumber?: string }) => {
        if (tableFromUrl && order.tableNumber === tableFromUrl) {
          latestOrderIdRef.current = order._id;
          setLatestOrderStatus(order.status);
        }
      },
    );

    socket.on(
      "order:updated",
      (payload: { orderId: string; status: OrderStatus }) => {
        if (
          latestOrderIdRef.current &&
          latestOrderIdRef.current === payload.orderId
        ) {
          setLatestOrderStatus(payload.status);
          // 🔔 Notify guest when order is ready
          if (payload.status === "ready") {
            showLocalNotification(
              "ההזמנה שלך מוכנה! 🎉",
              "אפשר לבוא לאסוף את ההזמנה",
            );
          }
        }
      },
    );

    return () => {
      socket?.off("order:new");
      socket?.off("order:updated");
      socket?.disconnect();
      socket = null;
    };
  }, [data?.restaurant?._id, tableFromUrl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
          <div className="h-8 w-32 animate-pulse rounded-full bg-slate-200" />
          <div className="space-y-3">
            <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-md px-4 py-6">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate-600">
            {error ?? "Menu not found."}
          </p>
        </div>
      </div>
    );
  }

  const currencySymbol = getCurrencySymbol(data.restaurant.currency);

  const query = searchQuery.trim().toLowerCase();
  const searchedCategories = query
    ? data.categories
        .map((cat) => ({
          ...cat,
          items: cat.items.filter(
            (item) =>
              item.name.toLowerCase().includes(query) ||
              (item.description &&
                item.description.toLowerCase().includes(query)) ||
              item.tags?.some((t) => t.toLowerCase().includes(query)),
          ),
        }))
        .filter((cat) => cat.items.length > 0)
    : data.categories;

  const filteredCategories =
    selectedCategoryId === "all"
      ? searchedCategories
      : searchedCategories.filter((cat) => cat._id === selectedCategoryId);

  const hasMultipleCategories = data.categories.length > 1;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-900">
      <div className="mx-auto max-w-md px-4 pb-4 pt-6">
        <header className="relative mb-2 px-3 pt-1">
          <div className="flex items-center justify-center">
            {data.restaurant.logoUrl && (
              <div className="h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.restaurant.logoUrl}
                  alt={`${data.restaurant.name} logo`}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>
          {tableFromUrl && (
            <div className="absolute inset-y-2 right-3 flex items-center">
              <span className="shrink-0 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                Table {tableFromUrl}
              </span>
            </div>
          )}
          {latestOrderStatus === "new" && (
            <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800">
              Your order was sent to the kitchen.
            </p>
          )}
          {latestOrderStatus === "preparing" && (
            <p className="mt-2 rounded-md bg-sky-50 px-2.5 py-1.5 text-[11px] font-medium text-sky-800">
              Your order is being prepared.
            </p>
          )}
          {latestOrderStatus === "ready" && (
            <p className="mt-2 rounded-md bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-800">
              Your order is ready.
            </p>
          )}
        </header>
        <div className="sticky top-0 z-20 mb-3 -mx-1 bg-slate-50 px-1 pt-1 pb-2">
          {/* <div className="mb-1 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setSearchOpen((prev) => !prev)
                if (searchOpen) {
                  setSearchQuery('')
                }
              }}
              aria-label={searchOpen ? 'Close search' : 'Open search'}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 shadow-sm hover:border-slate-300"
            >
              <span aria-hidden="true">🔍</span>
            </button>
          </div> */}
          {searchOpen && (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label htmlFor="menu-search" className="sr-only">
                  Search menu
                </label>
                <input
                  id="menu-search"
                  type="search"
                  placeholder="Search dishes…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-300"
              >
                Close
              </button>
            </div>
          )}
          {hasMultipleCategories && (
            <div className="mt-2">
              <nav className="flex gap-1.5 overflow-x-auto pb-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId("all")}
                  className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    selectedCategoryId === "all"
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  All
                </button>
                {data.categories.map((cat) => (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat._id)}
                    className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      selectedCategoryId === cat._id
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </div>
        {/* Category quick-jump nav – commented out for now
        <nav className="sticky top-12 z-20 mb-4 flex justify-center gap-2 overflow-x-auto bg-transparent pb-1 pt-1 text-xs">
          {filteredCategories.map((cat) => (
            <button
              key={cat._id}
              type="button"
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 shadow-sm"
              onClick={() => {
                const el = document.getElementById(`cat-${cat._id}`)
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }}
            >
              {cat.name}
            </button>
          ))}
        </nav>
        */}
        <main className="space-y-6 pb-4">
          {data.businessPlans && data.businessPlans.length > 0 && (
            <BusinessPlansSection
              plans={data.businessPlans}
              currencySymbol={currencySymbol}
            />
          )}
          {filteredCategories.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              No items match &quot;{searchQuery}&quot;. Try a different search.
            </p>
          ) : (
            filteredCategories.map((cat) => (
              <section
                key={cat._id}
                id={`cat-${cat._id}`}
                className="scroll-mt-24"
              >
                <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-800 uppercase">
                  {cat.name}
                </h2>
                <div className="space-y-2">
                  {cat.items.map((item) => (
                    <MenuItemCard
                      key={item._id}
                      item={item}
                      currencySymbol={currencySymbol}
                      onDetailOpen={() => setItemDetailOpen(true)}
                      onDetailClose={() => setItemDetailOpen(false)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </main>
      </div>
      {!itemDetailOpen && (
        <div className="fixed bottom-4 left-0 right-0 z-30 flex justify-center px-4">
          <div className="flex w-full max-w-md items-center gap-2 rounded-full bg-slate-900 text-slate-50 shadow-lg shadow-slate-900/40 px-3 py-2">
            <button
              type="button"
              className="flex-1 whitespace-nowrap rounded-full border border-slate-700 bg-slate-800 px-3 py-2 text-[11px] font-medium text-slate-50 shadow-sm hover:bg-slate-700"
              onClick={() => {
                setCartOpen(false);
                setChatOpen((prev) => !prev);
              }}
            >
              Ask before ordering
            </button>
            <button
              type="button"
              className="whitespace-nowrap rounded-full border border-slate-700 bg-slate-800 px-3 py-2 text-[11px] font-medium text-slate-50 shadow-sm hover:bg-slate-700"
              onClick={() => setBillOpen(true)}
            >
              View bill
            </button>
            <div className="ml-auto">
              <CartSummary
                currencySymbol={currencySymbol}
                onOpenCart={() => {
                  setChatOpen(false);
                  setCartOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      )}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onConfirmOrder={() => {
          setCartOpen(false);
          setConfirmOpen(true);
        }}
        restaurantId={data.restaurant._id}
        currencySymbol={currencySymbol}
        menuItems={data?.categories?.flatMap((c) => c.items) ?? []}
      />
      <ChatPanel
        restaurantId={data.restaurant._id}
        tableKey={tableKey}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        currencySymbol={currencySymbol}
      />
      {billOpen && (
        <BillPanel
          restaurantId={data.restaurant._id}
          open={billOpen}
          onClose={() => setBillOpen(false)}
          tableNumber={tableFromUrl}
          currencySymbol={currencySymbol}
        />
      )}
      {confirmOpen && (
        <OrderConfirmationModal
          restaurantId={data.restaurant._id}
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirmed={() => {
            // Status will be updated via sockets / fetch; no extra flag needed here
          }}
          initialTable={tableFromUrl}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
}

export default function MenuPage() {
  return (
    <CartProvider>
      <MenuPageInner />
    </CartProvider>
  );
}

function BusinessPlansSection({
  plans,
  currencySymbol,
}: {
  plans: BusinessPlan[];
  currencySymbol: string;
}) {
  const { addItem } = useCart();

  const handleAddPlanToCart = (plan: BusinessPlan) => {
    if (!plan.items.length) return;

    const firstId = plan.items[0]._id;

    for (const entry of plan.items) {
      const quantity =
        entry.quantity && entry.quantity > 0 ? entry.quantity : 1;
      const isPricingItem = entry._id === firstId;

      const overriddenPrice = isPricingItem ? plan.price : 0;

      addItem({ ...entry, price: overriddenPrice }, quantity);
    }
  };

  if (!plans.length) return null;

  const now = new Date();

  return (
    <section className="space-y-2">
      <h2 className="mb-1 text-sm font-semibold tracking-wide text-slate-800 uppercase">
        עסקיות
      </h2>
      <div className="space-y-2">
        {plans.map((plan) => {
          const available = isBusinessPlanCurrentlyAvailable(
            plan.timeNote ?? "",
            now,
          );
          return (
            <div
              key={plan._id}
              className={`flex w-full items-center justify-between gap-3 overflow-hidden rounded-xl border px-3 py-2 text-left shadow-sm transition ${
                available
                  ? "border-slate-200/90 bg-white"
                  : "border-slate-100 bg-slate-50/80 opacity-70"
              }`}
            >
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-slate-900">
                  {plan.name || "עסקית"}
                </h3>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-600">
                  <span className="font-medium">
                    {currencySymbol}
                    {plan.price.toFixed(2)}
                  </span>
                  {plan.timeNote && (
                    <span className="truncate text-[11px] text-slate-500">
                      · {plan.timeNote}
                    </span>
                  )}
                  {!available && (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                      Not available now
                    </span>
                  )}
                </div>
                {plan.description && (
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">
                    {plan.description}
                  </p>
                )}
                {plan.items.length > 0 && (
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                    Includes:{" "}
                    {plan.items
                      .map(
                        (item) =>
                          `${item.quantity > 1 ? `${item.quantity}× ` : ""}${item.name}`,
                      )
                      .join(", ")}
                  </p>
                )}
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <button
                  type="button"
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white ${
                    available
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-slate-400 cursor-not-allowed"
                  }`}
                  onClick={() => {
                    if (!available) return;
                    handleAddPlanToCart(plan);
                  }}
                  disabled={!available}
                >
                  Add
                </button>
                {plan.items.length > 0 && (
                  <span className="text-[10px] text-slate-500">
                    {plan.items.length} item{plan.items.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function isBusinessPlanCurrentlyAvailable(
  timeNote: string,
  now: Date,
): boolean {
  const trimmed = timeNote.trim();
  if (!trimmed) return true;

  const day = now.getDay(); // 0-6, Sun-Sat
  const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();

  const parseTime = (t: string): number | null => {
    const [h, m] = t.split(":");
    const hh = Number(h);
    const mm = Number(m ?? "0");
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    return hh * 60 + mm;
  };

  const dayIndexFromToken = (token: string): number | null => {
    const lower = token.toLowerCase();
    if (lower.startsWith("sun")) return 0;
    if (lower.startsWith("mon")) return 1;
    if (lower.startsWith("tue")) return 2;
    if (lower.startsWith("wed")) return 3;
    if (lower.startsWith("thu")) return 4;
    if (lower.startsWith("fri")) return 5;
    if (lower.startsWith("sat")) return 6;
    if (lower.startsWith("weekday")) return -1; // special handled below
    return null;
  };

  const normalize = trimmed.replace(/\s+/g, " ").replace(/[–—]/g, "-");

  // Expect something like "Sun-Thu 12:00-16:00" or "Weekdays 11:30-16:00"
  const match = normalize.match(
    /^([^0-9]+)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/,
  );
  if (!match) {
    // If we can't confidently parse, don't block the plan.
    return true;
  }

  const dayPart = match[1].trim();
  const startStr = match[2];
  const endStr = match[3];

  const startMinutes = parseTime(startStr);
  const endMinutes = parseTime(endStr);
  if (startMinutes == null || endMinutes == null) return true;

  const days: number[] = [];
  const segments = dayPart.split(",").map((s) => s.trim());

  for (const seg of segments) {
    if (!seg) continue;
    if (/^weekdays?/i.test(seg)) {
      // Mon-Fri
      days.push(1, 2, 3, 4, 5);
      continue;
    }
    const [fromToken, toToken] = seg.split("-").map((s) => s.trim());
    const fromIdx = dayIndexFromToken(fromToken);
    const toIdx = toToken ? dayIndexFromToken(toToken) : fromIdx;
    if (fromIdx == null || toIdx == null) continue;
    if (fromIdx <= toIdx) {
      for (let d = fromIdx; d <= toIdx; d++) days.push(d);
    } else {
      // e.g. Fri-Mon
      for (let d = fromIdx; d <= 6; d++) days.push(d);
      for (let d = 0; d <= toIdx; d++) days.push(d);
    }
  }

  if (!days.length) return true;

  return (
    days.includes(day) &&
    minutesSinceMidnight >= startMinutes &&
    minutesSinceMidnight <= endMinutes
  );
}

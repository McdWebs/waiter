import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

let socket: Socket | null = null;

interface BillOrderItem {
  _id: string;
  quantity: number;
  notes?: string;
  menuItem: {
    name: string;
    price: number;
  } | null;
}

interface BillOrder {
  _id: string;
  createdAt: string;
  tableNumber?: string;
  notes?: string;
  items: BillOrderItem[];
}

interface Props {
  restaurantId: string;
  open: boolean;
  onClose: () => void;
}

export default function BillPanel({
  restaurantId,
  open,
  onClose,
  currencySymbol = "$",
  tableNumber,
}: Props & { currencySymbol?: string; tableNumber?: string }) {
  const [orders, setOrders] = useState<BillOrder[]>([]);
  const [splitCount, setSplitCount] = useState(1);
  const [callingWaiter, setCallingWaiter] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [callSuccess, setCallSuccess] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [callHandled, setCallHandled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [, setMergedTables] = useState<string[] | null>(null);
  const callInFlightRef = useRef(false);
  const billLoadBackoffUntilRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      if (Date.now() < billLoadBackoffUntilRef.current) return;
      setLoading(true);
      setLoadError(null);
      try {
        // When a table is part of a merged bill, load orders for all tables in the merge group
        let tablesToInclude: string[] | null = null;
        if (tableNumber) {
          try {
            const mergeRes = await fetch(
              `${API_BASE}/api/restaurants/${restaurantId}/merged-tables?tableNumber=${encodeURIComponent(tableNumber)}`,
            );
            const mergeData = (await mergeRes.json()) as {
              merged: { tables: string[] } | null;
              message?: string;
            };
            if (mergeRes.status === 429) {
              billLoadBackoffUntilRef.current = Date.now() + 15000;
              setLoadError(
                "Too many requests right now. Please wait a few seconds and try again.",
              );
              return;
            }
            if (mergeRes.ok && mergeData.merged?.tables?.length) {
              tablesToInclude = mergeData.merged.tables;
              setMergedTables(mergeData.merged.tables);
            } else {
              tablesToInclude = [tableNumber];
              setMergedTables([tableNumber]);
            }
          } catch {
            tablesToInclude = [tableNumber];
            setMergedTables([tableNumber]);
          }
        } else {
          setMergedTables(null);
        }

        const res = await fetch(
          `${API_BASE}/api/restaurants/${restaurantId}/orders`,
        );
        const data = (await res.json()) as (BillOrder & {
          status?: string;
        })[] & { message?: string };
        if (res.status === 429) {
          billLoadBackoffUntilRef.current = Date.now() + 15000;
          setLoadError(
            "Too many requests right now. Please wait a few seconds and try again.",
          );
          setOrders([]);
          return;
        }
        if (!res.ok) {
          throw new Error(data.message ?? "Failed to load bill");
        }
        const filtered = data.filter((order) => {
          const orderTable = order.tableNumber;
          if (tablesToInclude && tablesToInclude.length > 0) {
            return orderTable ? tablesToInclude.includes(orderTable) : false;
          }
          return !orderTable;
        });
        setOrders(filtered);
      } catch (err) {
        setLoadError((err as Error).message);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [open, restaurantId, tableNumber]);

  useEffect(() => {
    if (!open) return;
    setCallError(null);
    setCallSuccess(false);
    setActiveCallId(null);
    setCallHandled(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const loadExistingCall = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/restaurants/${restaurantId}/waiter-calls`,
        );
        const data = (await res.json()) as {
          _id: string;
          tableNumber?: string;
          status: "open" | "handled";
        }[];
        if (!res.ok) return;
        const latestOrderTable =
          orders.length > 0
            ? orders[orders.length - 1]?.tableNumber
            : undefined;
        const targetTable = latestOrderTable ?? tableNumber;
        const existing = data.find((call) =>
          targetTable ? call.tableNumber === targetTable : !call.tableNumber,
        );
        if (existing) {
          setActiveCallId(existing._id);
          setCallSuccess(true);
          setCallHandled(false);
        }
      } catch {
        // ignore – this is just a best-effort check
      }
    };
    void loadExistingCall();
  }, [open, restaurantId, orders]);

  useEffect(() => {
    if (!open) return;

    socket = io(API_BASE, { transports: ["websocket"] });
    socket.emit("join-restaurant", restaurantId);

    socket.on("waiter:call:handled", (payload: { callId: string }) => {
      setActiveCallId((current) => {
        if (current && current === payload.callId) {
          setCallHandled(true);
          setCallSuccess(false);
          return null;
        }
        return current;
      });
    });

    return () => {
      socket?.off("waiter:call:handled");
      socket?.disconnect();
      socket = null;
    };
  }, [open, restaurantId]);

  const totalBillAmount = orders.reduce((sum, order) => {
    const orderTotal = order.items.reduce(
      (itemSum, item) => itemSum + (item.menuItem?.price ?? 0) * item.quantity,
      0,
    );
    return sum + orderTotal;
  }, 0);
  const perPersonAmount = totalBillAmount / (splitCount || 1);
  const latestTableNumber =
    orders.length > 0 ? orders[orders.length - 1]?.tableNumber : undefined;
  const effectiveTableNumber = latestTableNumber ?? tableNumber;

  const callWaiter = async () => {
    if (callInFlightRef.current || activeCallId) return;
    callInFlightRef.current = true;
    setCallingWaiter(true);
    setCallError(null);
    setCallSuccess(false);
    try {
      const res = await fetch(
        `${API_BASE}/api/restaurants/${restaurantId}/waiter-calls`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tableNumber: effectiveTableNumber,
          }),
        },
      );
      const data = (await res.json()) as { _id?: string; message?: string };
      if (!res.ok) {
        throw new Error(data.message ?? "Failed to call waiter");
      }
      if (data._id) {
        setActiveCallId(data._id);
      }
      setCallSuccess(true);
      setCallHandled(false);
    } catch (err) {
      setCallError((err as Error).message);
    } finally {
      setCallingWaiter(false);
      callInFlightRef.current = false;
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl bg-white p-4 sm:mx-auto sm:max-w-md sm:rounded-3xl sm:border sm:border-slate-200 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Your bill</h2>
          <button
            type="button"
            className="text-xs text-slate-500 hover:text-slate-800"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="max-h-72 space-y-3 overflow-y-auto border-y border-slate-200 py-2 text-xs">
          {loading && (
            <p className="text-xs text-slate-500">Loading your bill…</p>
          )}
          {loadError && !loading && (
            <p className="text-xs text-rose-500">{loadError}</p>
          )}
          {orders.length === 0 && !loading && !loadError && (
            <p className="text-xs text-slate-500">
              You don&apos;t have any sent orders yet. After you send an order,
              it will appear here.
            </p>
          )}
          {orders.map((order) => (
            <div
              key={order._id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-800">
                  Order #{order._id.slice(-5)}
                </span>
                <span className="text-[11px] text-slate-500">
                  {new Date(order.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {order.tableNumber && (
                <p className="mb-1 text-[11px] text-slate-500">
                  Table:{" "}
                  <span className="font-medium text-slate-800">
                    {order.tableNumber}
                  </span>
                </p>
              )}
              <ul className="mb-1 space-y-1 text-[11px] text-slate-700">
                {order.items.map((item) => (
                  <li key={item._id} className="flex justify-between gap-2">
                    <span>
                      {item.quantity} × {item.menuItem?.name ?? "Unknown item"}
                    </span>
                    <span className="text-slate-800">
                      {currencySymbol}
                      {((item.menuItem?.price ?? 0) * item.quantity).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
              {order.notes && (
                <p className="mb-1 text-[11px] text-slate-500">
                  Note: {order.notes}
                </p>
              )}
              <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-1 text-[11px] font-semibold text-slate-900">
                <span>Total</span>
                <span>
                  {currencySymbol}
                  {order.items
                    .reduce(
                      (sum, item) =>
                        sum + (item.menuItem?.price ?? 0) * item.quantity,
                      0,
                    )
                    .toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
        {orders.length > 0 && (
          <div className="mt-3 space-y-3 text-xs">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-900">
              <span>Bill total</span>
              <span>
                {currencySymbol}
                {totalBillAmount.toFixed(2)}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="flex-1 text-[11px] text-slate-700">
                  Split between
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-1 text-xs text-slate-900 outline-none placeholder:text-slate-400"
                    value={splitCount}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setSplitCount(
                        !value || value < 1 ? 1 : Math.floor(value),
                      );
                    }}
                  />
                  <span className="mt-0.5 block text-[10px] text-slate-500">
                    people
                  </span>
                </label>
                <div className="flex-1 rounded-2xl bg-slate-900 px-3 py-2 text-slate-50">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Per person
                  </div>
                  <div className="text-sm font-semibold">
                    {currencySymbol}
                    {perPersonAmount.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="mt-3 space-y-1 border-t border-slate-200 pt-2 text-xs">
          <button
            type="button"
            className="w-full rounded-full bg-emerald-600 px-4 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
            disabled={callingWaiter || Boolean(activeCallId)}
            onClick={() => void callWaiter()}
          >
            {callingWaiter
              ? "Calling waiter…"
              : activeCallId
                ? "Waiter requested"
                : "Call a waiter"}
          </button>
          {callError && (
            <p className="text-[11px] text-rose-500">{callError}</p>
          )}
          {callSuccess && (
            <p className="text-[11px] text-emerald-600">
              A waiter has been notified
              {effectiveTableNumber ? ` for table ${effectiveTableNumber}` : ""}
              .
            </p>
          )}
          {callHandled && !activeCallId && (
            <p className="text-[11px] text-emerald-600">
              Your last call was handled. You can call again if you need
              anything else.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

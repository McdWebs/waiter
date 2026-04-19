import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

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

type ServiceCallType = "waiter" | "checkout";
const isCheckoutRequest = (call: { type?: ServiceCallType; notes?: string }) =>
  call.type === "checkout" ||
  call.notes?.toLowerCase().includes("checkout") === true;

function BillPanelOrderSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[0, 1].map((key) => (
        <div
          key={key}
          className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="h-3 w-24 rounded bg-slate-200" />
            <div className="h-3 w-14 rounded bg-slate-200" />
          </div>
          <div className="mb-2 h-2.5 w-28 rounded bg-slate-100" />
          <ul className="mb-2 space-y-1.5">
            <li className="flex justify-between gap-2">
              <div className="h-2.5 flex-1 rounded bg-slate-200" />
              <div className="h-2.5 w-12 shrink-0 rounded bg-slate-200" />
            </li>
            <li className="flex justify-between gap-2">
              <div className="h-2.5 w-[65%] rounded bg-slate-100" />
              <div className="h-2.5 w-10 shrink-0 rounded bg-slate-100" />
            </li>
            <li className="flex justify-between gap-2">
              <div className="h-2.5 w-[55%] rounded bg-slate-100" />
              <div className="h-2.5 w-10 shrink-0 rounded bg-slate-100" />
            </li>
          </ul>
          <div className="flex items-center justify-between border-t border-slate-200 pt-2">
            <div className="h-2.5 w-10 rounded bg-slate-200" />
            <div className="h-3 w-16 rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

function BillPanelTotalsSkeleton() {
  return (
    <div className="mt-3 animate-pulse space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-slate-200" />
        <div className="h-4 w-24 rounded bg-slate-200" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="h-[4.25rem] flex-1 rounded-xl bg-slate-100" />
        <div className="h-[4.25rem] flex-1 rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
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
  const [callingCheckout, setCallingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [activeCheckoutCallId, setActiveCheckoutCallId] = useState<
    string | null
  >(null);
  const [checkoutHandled, setCheckoutHandled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [, setMergedTables] = useState<string[] | null>(null);
  const callInFlightRef = useRef(false);
  const checkoutInFlightRef = useRef(false);
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
    setCheckoutError(null);
    setCheckoutSuccess(false);
    setActiveCheckoutCallId(null);
    setCheckoutHandled(false);
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
          type?: ServiceCallType;
          notes?: string;
          status: "open" | "handled";
        }[];
        if (!res.ok) return;
        const latestOrderTable =
          orders.length > 0
            ? orders[orders.length - 1]?.tableNumber
            : undefined;
        const targetTable = latestOrderTable ?? tableNumber;
        const existingWaiterCall = data.find(
          (call) =>
            (targetTable
              ? call.tableNumber === targetTable
              : !call.tableNumber) && !isCheckoutRequest(call),
        );
        const existingCheckoutCall = data.find(
          (call) =>
            (targetTable
              ? call.tableNumber === targetTable
              : !call.tableNumber) && isCheckoutRequest(call),
        );
        if (existingWaiterCall) {
          setActiveCallId(existingWaiterCall._id);
          setCallSuccess(true);
          setCallHandled(false);
        }
        if (existingCheckoutCall) {
          setActiveCheckoutCallId(existingCheckoutCall._id);
          setCheckoutSuccess(true);
          setCheckoutHandled(false);
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
      setActiveCheckoutCallId((current) => {
        if (current && current === payload.callId) {
          setCheckoutHandled(true);
          setCheckoutSuccess(false);
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

  const callCheckout = async () => {
    if (checkoutInFlightRef.current || activeCheckoutCallId) return;
    checkoutInFlightRef.current = true;
    setCallingCheckout(true);
    setCheckoutError(null);
    setCheckoutSuccess(false);
    try {
      const res = await fetch(
        `${API_BASE}/api/restaurants/${restaurantId}/waiter-calls`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tableNumber: effectiveTableNumber,
            type: "checkout",
            notes: "Checkout requested",
          }),
        },
      );
      const data = (await res.json()) as { _id?: string; message?: string };
      if (!res.ok) {
        throw new Error(data.message ?? "Failed to request checkout");
      }
      if (data._id) {
        setActiveCheckoutCallId(data._id);
      }
      setCheckoutSuccess(true);
      setCheckoutHandled(false);
    } catch (err) {
      setCheckoutError((err as Error).message);
    } finally {
      setCallingCheckout(false);
      checkoutInFlightRef.current = false;
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
          {loading && <BillPanelOrderSkeleton />}
          {loadError && !loading && (
            <p className="text-xs text-rose-500">{loadError}</p>
          )}
          {orders.length === 0 && !loading && !loadError && (
            <p className="text-xs text-slate-500">
              You don&apos;t have any sent orders yet. After you send an order,
              it will appear here.
            </p>
          )}
          {!loading &&
            orders.map((order) => (
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
                        {item.quantity} ×{" "}
                        {item.menuItem?.name ?? "Unknown item"}
                      </span>
                      <span className="text-slate-800">
                        {currencySymbol}
                        {((item.menuItem?.price ?? 0) * item.quantity).toFixed(
                          2,
                        )}
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
        {loading && <BillPanelTotalsSkeleton />}
        {!loading && orders.length > 0 && (
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex-1 rounded-full bg-emerald-600 px-4 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              disabled={loading || callingWaiter || Boolean(activeCallId)}
              onClick={() => void callWaiter()}
            >
              {callingWaiter
                ? "Calling waiter…"
                : activeCallId
                  ? "Waiter requested"
                  : "Call a waiter"}
            </button>
            <button
              type="button"
              className="flex-1 rounded-full bg-slate-900 px-4 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-slate-700 disabled:opacity-60"
              disabled={
                loading || callingCheckout || Boolean(activeCheckoutCallId)
              }
              onClick={() => void callCheckout()}
            >
              {callingCheckout
                ? "Requesting checkout…"
                : activeCheckoutCallId
                  ? "Checkout requested"
                  : "Checkout"}
            </button>
          </div>
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
          {checkoutError && (
            <p className="text-[11px] text-rose-500">{checkoutError}</p>
          )}
          {checkoutSuccess && (
            <p className="text-[11px] text-emerald-600">
              Checkout request sent
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
          {checkoutHandled && !activeCheckoutCallId && (
            <p className="text-[11px] text-emerald-600">
              Your checkout request was handled.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

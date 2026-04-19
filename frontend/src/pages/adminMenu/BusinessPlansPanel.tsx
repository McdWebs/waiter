import type { BusinessPlan } from "../../components/types";
import type { AdminMenuResponse } from "./types";

interface BusinessPlansPanelProps {
  data: AdminMenuResponse;
  currencySymbol: string;
  planSaving: boolean;
  setEditingPlan: (plan: BusinessPlan | null) => void;
  deleteBusinessPlan: (planId: string) => Promise<void>;
}

export function BusinessPlansPanel({
  data,
  currencySymbol,
  planSaving,
  setEditingPlan,
  deleteBusinessPlan,
}: BusinessPlansPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-3 py-3 sm:px-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Business plans (עסקיות)
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Fixed-price business meals: pick items from your menu. Guests see
            these at the top of the menu.
          </p>
        </div>
        <button
          type="button"
          className="mt-1 inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-60 sm:mt-0"
          disabled={planSaving || !data.categories.length}
          onClick={() =>
            setEditingPlan({
              _id: "",
              name: "עסקית",
              description: "",
              timeNote: "",
              price: 0,
              position: data.businessPlans?.length ?? 0,
              active: true,
              items: [],
            })
          }
        >
          + New business plan
        </button>
      </div>
      {(!data.businessPlans || data.businessPlans.length === 0) && (
        <p className="text-[11px] text-slate-500">
          No business plans yet. Click &ldquo;New business plan&rdquo; to add
          one.
        </p>
      )}
      {data.businessPlans && data.businessPlans.length > 0 && (
        <div className="space-y-2">
          {data.businessPlans.map((plan) => (
            <div
              key={plan._id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900 truncate">
                    {plan.name}
                  </span>
                  {plan.active === false ? (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] text-slate-700">
                      Hidden
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] text-emerald-700">
                      Active
                    </span>
                  )}
                </div>
                {plan.timeNote && (
                  <p className="mt-0.5 text-[10px] text-slate-500 truncate">
                    {plan.timeNote}
                  </p>
                )}
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {plan.items.length} item{plan.items.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white">
                  {currencySymbol}
                  {plan.price.toFixed(2)}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-700 hover:bg-slate-50"
                    disabled={planSaving}
                    onClick={() => setEditingPlan(plan)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] text-rose-700 hover:bg-rose-100"
                    disabled={planSaving}
                    onClick={() => {
                      if (confirm(`Delete business plan "${plan.name}"?`)) {
                        void deleteBusinessPlan(plan._id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

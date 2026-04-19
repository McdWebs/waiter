import type { Dispatch, SetStateAction } from "react";
import type { MenuCategory, MenuItem } from "../../components/types";
import type { AdminMenuResponse, PendingDelete } from "./types";

interface AdminMenuCategoriesSectionProps {
  data: AdminMenuResponse;
  setData: Dispatch<SetStateAction<AdminMenuResponse | null>>;
  saving: boolean;
  collapsedCategoryIds: string[];
  dragCategoryIndex: number | null;
  setDragCategoryIndex: Dispatch<SetStateAction<number | null>>;
  dragItemState: { categoryId: string; index: number } | null;
  setDragItemState: Dispatch<
    SetStateAction<{ categoryId: string; index: number } | null>
  >;
  editingCategoryId: string | null;
  editingCategoryName: string;
  setEditingCategoryId: (id: string | null) => void;
  setEditingCategoryName: (name: string) => void;
  openActionsItemId: string | null;
  setOpenActionsItemId: Dispatch<SetStateAction<string | null>>;
  currencySymbol: string;
  reorderCategories: (categories: MenuCategory[]) => Promise<void>;
  reorderItems: (categoryId: string, items: MenuItem[]) => Promise<void>;
  updateCategoryName: (categoryId: string, name: string) => Promise<void>;
  handleAutoScroll: (clientY: number) => void;
  toggleCategoryCollapsed: (categoryId: string) => void;
  setAddingItemForCategory: (v: { _id: string; name: string } | null) => void;
  setPendingDelete: (v: PendingDelete | null) => void;
  setEditingItem: (v: { item: MenuItem; categoryId: string } | null) => void;
  patchItemAvailable: (
    itemId: string,
    categoryId: string,
    next: boolean,
  ) => Promise<void>;
}

export function AdminMenuCategoriesSection({
  data,
  setData,
  saving,
  collapsedCategoryIds,
  dragCategoryIndex,
  setDragCategoryIndex,
  dragItemState,
  setDragItemState,
  editingCategoryId,
  editingCategoryName,
  setEditingCategoryId,
  setEditingCategoryName,
  openActionsItemId,
  setOpenActionsItemId,
  currencySymbol,
  reorderCategories,
  reorderItems,
  updateCategoryName,
  handleAutoScroll,
  toggleCategoryCollapsed,
  setAddingItemForCategory,
  setPendingDelete,
  setEditingItem,
  patchItemAvailable,
}: AdminMenuCategoriesSectionProps) {
  return (
    <section className="space-y-6">
      {data.categories.length === 0 && (
        <p className="text-xs text-slate-500">
          No categories yet. Add one above.
        </p>
      )}
      {data.categories.map((category, catIndex) => {
        const isCollapsed = collapsedCategoryIds.includes(category._id);
        return (
          <div
            key={category._id}
            className={`group rounded-3xl border bg-white/95 p-4 shadow-sm ring-1 ring-transparent transition hover:border-emerald-200 hover:shadow-md hover:ring-emerald-50 sm:p-5 ${
              dragCategoryIndex === catIndex
                ? "border-emerald-400 ring-1 ring-emerald-300"
                : "border-slate-200"
            }`}
            draggable={editingCategoryId === category._id ? false : true}
            onDragStart={(e) => {
              if (saving) return;
              e.dataTransfer.effectAllowed = "move";
              setDragCategoryIndex(catIndex);
            }}
            onDragOver={(e) => {
              if (dragCategoryIndex === null) return;
              e.preventDefault();
              handleAutoScroll(e.clientY);
              if (dragCategoryIndex !== catIndex) {
                setData((prev) => {
                  if (!prev) return prev;
                  const categories = [...prev.categories];
                  const moved = categories.splice(dragCategoryIndex, 1)[0];
                  categories.splice(catIndex, 0, moved);
                  return { ...prev, categories };
                });
                setDragCategoryIndex(catIndex);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragCategoryIndex !== null && !saving && data) {
                void reorderCategories(data.categories);
              }
              setDragCategoryIndex(null);
            }}
            onDragEnd={() => setDragCategoryIndex(null)}
          >
            <div className="mb-4 flex items-start gap-3 border-b border-slate-100 pb-3">
              <div className="flex-shrink-0 cursor-grab text-slate-300 active:cursor-grabbing select-none text-base leading-none">
                ⠿
              </div>

              <div className="min-w-0 flex-1">
                {editingCategoryId === category._id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      className="min-h-[36px] w-full max-w-xs rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 placeholder:text-slate-400"
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      autoFocus
                      placeholder="Category name"
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          void updateCategoryName(
                            category._id,
                            editingCategoryName,
                          );
                        if (e.key === "Escape") {
                          setEditingCategoryId(null);
                          setEditingCategoryName("");
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="flex-shrink-0 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      disabled={saving}
                      onClick={() =>
                        void updateCategoryName(
                          category._id,
                          editingCategoryName,
                        )
                      }
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="flex-shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 hover:bg-slate-50"
                      onClick={() => {
                        setEditingCategoryId(null);
                        setEditingCategoryName("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <h2 className="break-words text-sm font-semibold tracking-tight text-slate-900">
                    {category.name}
                  </h2>
                )}
              </div>

              {editingCategoryId !== category._id && (
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    type="button"
                    title={isCollapsed ? "Expand" : "Collapse"}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    onClick={() => toggleCategoryCollapsed(category._id)}
                  >
                    <svg
                      className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
                      fill="none"
                      viewBox="0 0 16 16"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 6l4 4 4-4"
                      />
                    </svg>
                  </button>

                  <button
                    type="button"
                    title="Rename category"
                    disabled={saving}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                    onClick={() => {
                      setEditingCategoryId(category._id);
                      setEditingCategoryName(category.name);
                    }}
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 16 16"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.5 2.5a1.414 1.414 0 012 2L5 13H3v-2L11.5 2.5z"
                      />
                    </svg>
                  </button>

                  <button
                    type="button"
                    title="Move up"
                    disabled={catIndex === 0 || saving}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                    onClick={() => {
                      if (saving || !data || catIndex === 0) return;
                      const categories = [...data.categories];
                      const moved = categories.splice(catIndex, 1)[0];
                      categories.splice(catIndex - 1, 0, moved);
                      setData((prev) =>
                        prev ? { ...prev, categories } : prev,
                      );
                      void reorderCategories(categories);
                    }}
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 16 16"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 12V4M4 8l4-4 4 4"
                      />
                    </svg>
                  </button>

                  <button
                    type="button"
                    title="Move down"
                    disabled={catIndex === data.categories.length - 1 || saving}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                    onClick={() => {
                      if (
                        saving ||
                        !data ||
                        catIndex === data.categories.length - 1
                      )
                        return;
                      const categories = [...data.categories];
                      const moved = categories.splice(catIndex, 1)[0];
                      categories.splice(catIndex + 1, 0, moved);
                      setData((prev) =>
                        prev ? { ...prev, categories } : prev,
                      );
                      void reorderCategories(categories);
                    }}
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 16 16"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 4v8m4-4l-4 4-4-4"
                      />
                    </svg>
                  </button>

                  <div className="mx-1 h-5 w-px bg-slate-200" />

                  <button
                    type="button"
                    title="Add item"
                    disabled={saving}
                    className="flex h-8 items-center gap-1.5 rounded-full bg-emerald-600 px-3 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                    onClick={() =>
                      setAddingItemForCategory({
                        _id: category._id,
                        name: category.name,
                      })
                    }
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 16 16"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 3v10M3 8h10"
                      />
                    </svg>
                    <span className="hidden sm:inline">Add item</span>
                  </button>

                  <button
                    type="button"
                    title="Delete category"
                    disabled={saving}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                    onClick={() =>
                      setPendingDelete({
                        type: "category",
                        id: category._id,
                        name: category.name,
                      })
                    }
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 16 16"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 4h10M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            <div className="text-xs">
              <div
                className={`overflow-hidden transform-gpu origin-top transition-all duration-200 ease-out ${
                  isCollapsed
                    ? "max-h-0 scale-y-95 opacity-0 pointer-events-none"
                    : "max-h-[1200px] scale-y-100 opacity-100"
                }`}
              >
                {category.items && category.items.length > 0 ? (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60">
                    <div className="divide-y divide-slate-100">
                      {category.items.map((item, itemIndex) => (
                        <div
                          key={item._id}
                          className={`relative flex flex-col gap-2 bg-white/95 px-3 py-2.5 transition hover:bg-emerald-50/40 sm:flex-row sm:items-center sm:justify-between touch-manipulation ${
                            dragItemState &&
                            dragItemState.categoryId === category._id &&
                            dragItemState.index === itemIndex
                              ? "ring-1 ring-emerald-300"
                              : ""
                          } ${item.available === false ? "opacity-75" : ""} ${
                            openActionsItemId === item._id ? "z-20" : ""
                          }`}
                          draggable
                          onDragStart={(e) => {
                            if (saving) return;
                            e.dataTransfer.effectAllowed = "move";
                            setDragItemState({
                              categoryId: category._id,
                              index: itemIndex,
                            });
                          }}
                          onDragOver={(e) => {
                            if (
                              !dragItemState ||
                              dragItemState.categoryId !== category._id ||
                              dragItemState.index === itemIndex
                            ) {
                              return;
                            }
                            e.preventDefault();
                            handleAutoScroll(e.clientY);
                            setData((prev) => {
                              if (!prev) return prev;
                              const categories = prev.categories.map((cat) => {
                                if (cat._id !== category._id || !cat.items)
                                  return cat;
                                const items = [...cat.items];
                                const moved = items.splice(
                                  dragItemState.index,
                                  1,
                                )[0];
                                items.splice(itemIndex, 0, moved);
                                return { ...cat, items };
                              });
                              return { ...prev, categories };
                            });
                            setDragItemState({
                              categoryId: category._id,
                              index: itemIndex,
                            });
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (
                              dragItemState &&
                              dragItemState.categoryId === category._id &&
                              !saving
                            ) {
                              const updatedCategory = data.categories.find(
                                (c) => c._id === category._id,
                              );
                              if (updatedCategory && updatedCategory.items) {
                                void reorderItems(
                                  category._id,
                                  updatedCategory.items,
                                );
                              }
                            }
                            setDragItemState(null);
                          }}
                          onDragEnd={() => setDragItemState(null)}
                        >
                          <div className="flex flex-1 flex-col gap-2">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 hidden h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[9px] text-slate-400 sm:flex">
                                ⋮⋮
                              </div>
                              {item.imageUrl && (
                                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="min-w-0 space-y-1">
                                <div className="truncate text-xs font-semibold text-slate-900">
                                  {item.name}
                                </div>
                                <div className="mt-0.5 text-[11px] text-slate-500">
                                  {item.description}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(item.tags?.length ?? 0) > 0 ||
                              (item.allergens?.length ?? 0) > 0 ? (
                                <>
                                  {item.tags?.map((tag) => (
                                    <span
                                      key={tag}
                                      className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {item.allergens?.map((allergen) => (
                                    <span
                                      key={allergen}
                                      className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700"
                                    >
                                      {allergen}
                                    </span>
                                  ))}
                                </>
                              ) : (
                                <span className="text-[10px] text-slate-400">
                                  No tags or allergens set
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-2 sm:mt-0 sm:w-auto sm:flex-col sm:items-end">
                            <div className="flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white sm:self-end">
                              <span>{currencySymbol}</span>
                              <span>{item.price.toFixed(2)}</span>
                            </div>
                            <div
                              className="relative"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <button
                                type="button"
                                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
                                onClick={() =>
                                  setOpenActionsItemId((prev) =>
                                    prev === item._id ? null : item._id,
                                  )
                                }
                              >
                                Actions
                              </button>
                              {openActionsItemId === item._id && (
                                <div className="absolute right-0 z-30 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 text-[11px] shadow-lg">
                                  <button
                                    type="button"
                                    className="block w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                    disabled={saving}
                                    onClick={() => {
                                      if (saving) return;
                                      const next = !(item.available ?? true);
                                      void patchItemAvailable(
                                        item._id,
                                        category._id,
                                        next,
                                      );
                                    }}
                                  >
                                    {item.available === false
                                      ? "Mark available"
                                      : "Mark unavailable"}
                                  </button>
                                  <button
                                    type="button"
                                    className="block w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                    disabled={saving}
                                    onClick={() => {
                                      setEditingItem({
                                        item,
                                        categoryId: category._id,
                                      });
                                      setOpenActionsItemId(null);
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="block w-full px-3 py-1.5 text-left text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                                    disabled={saving}
                                    onClick={() => {
                                      setPendingDelete({
                                        type: "item",
                                        id: item._id,
                                        name: item.name,
                                      });
                                      setOpenActionsItemId(null);
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 px-1 py-2">
                    No items in this category yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

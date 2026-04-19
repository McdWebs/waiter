import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type {
  BusinessPlan,
  MenuCategory,
  MenuItem,
} from "../../components/types";
import { useAuth } from "../../components/AuthContext";
import { API_BASE } from "./constants";
import type { AdminMenuResponse, PendingDelete } from "./types";
import type { BulkCategory } from "./bulkMenu";

export type AdminMenuPageModel = ReturnType<typeof useAdminMenuPage>;

export function useAdminMenuPage() {
  const { restaurantId: routeRestaurantId } = useParams<{
    restaurantId: string;
  }>();
  const { restaurant: authRestaurant, token } = useAuth();
  const restaurantId = authRestaurant?._id ?? routeRestaurantId;
  const [data, setData] = useState<AdminMenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newItemImagePreview, setNewItemImagePreview] = useState<string | null>(
    null,
  );
  const [editItemImagePreview, setEditItemImagePreview] = useState<
    string | null
  >(null);
  const [openActionsItemId, setOpenActionsItemId] = useState<string | null>(
    null,
  );
  const [dragCategoryIndex, setDragCategoryIndex] = useState<number | null>(
    null,
  );
  const [dragItemState, setDragItemState] = useState<{
    categoryId: string;
    index: number;
  } | null>(null);
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<string[]>(
    [],
  );
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingItem, setEditingItem] = useState<{
    item: MenuItem;
    categoryId: string;
  } | null>(null);
  const [addingItemForCategory, setAddingItemForCategory] = useState<{
    _id: string;
    name: string;
  } | null>(null);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState("");
  const [bulkImportProgress, setBulkImportProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [editingPlan, setEditingPlan] = useState<BusinessPlan | null>(null);
  const [planSaving, setPlanSaving] = useState(false);

  const loadAdminMenu = async (opts?: { showFullscreenLoader?: boolean }) => {
    if (!restaurantId) return;
    if (opts?.showFullscreenLoader) {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/restaurants/${restaurantId}/admin-menu`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      );
      const json = (await res.json()) as AdminMenuResponse & {
        message?: string;
      };
      if (!res.ok) {
        throw new Error(json.message ?? "Failed to load admin menu");
      }
      setData(json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      if (opts?.showFullscreenLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadAdminMenu({ showFullscreenLoader: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const addCategory = async (name: string) => {
    if (!restaurantId || !name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/restaurants/${restaurantId}/categories`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ name }),
        },
      );
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? "Failed to create category");
      }
      await loadAdminMenu();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const addItem = async (categoryId: string, formData: FormData) => {
    const name = (formData.get("name") as string) ?? "";
    const description = (formData.get("description") as string) ?? "";
    const priceRaw = formData.get("price") as string;
    const price = Number(priceRaw);

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    if (!trimmedName || !trimmedDescription || !price) {
      // eslint-disable-next-line no-alert
      alert("Please fill in name, description, and a valid price.");
      return false;
    }

    const defaultAllergens = formData.getAll("allergenDefaults") as string[];
    const allergensRaw = (formData.get("allergensCustom") as string) ?? "";
    const defaultTags = formData.getAll("tagDefaults") as string[];
    const tagsRaw = (formData.get("tagsCustom") as string) ?? "";

    const allergens =
      defaultAllergens.length === 0 && allergensRaw.trim().length === 0
        ? []
        : Array.from(
            new Set([
              ...defaultAllergens,
              ...allergensRaw
                .split(",")
                .map((a) => a.trim())
                .filter(Boolean),
            ]),
          );

    const tags =
      defaultTags.length === 0 && tagsRaw.trim().length === 0
        ? []
        : Array.from(
            new Set([
              ...defaultTags,
              ...tagsRaw
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            ]),
          );

    if (allergens.length === 0) {
      // eslint-disable-next-line no-alert
      alert("Please select at least one allergen or add a custom allergen.");
      return false;
    }

    if (tags.length === 0) {
      // eslint-disable-next-line no-alert
      alert("Please select at least one tag or add a custom tag.");
      return false;
    }

    formData.set("name", trimmedName);
    formData.set("description", trimmedDescription);
    formData.set("price", price.toString());
    formData.set("allergens", allergens.join(","));
    formData.set("tags", tags.join(","));

    try {
      setSaving(true);
      const res = await fetch(
        `${API_BASE}/api/categories/${categoryId}/items`,
        {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        },
      );
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? "Failed to create item");
      }
      await loadAdminMenu();
      return true;
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateItemDetails = async (itemId: string, formData: FormData) => {
    const name = (formData.get("name") as string) ?? "";
    const description = (formData.get("description") as string) ?? "";
    const priceRaw = formData.get("price") as string;
    const price = Number(priceRaw);

    if (!name.trim() || !description.trim() || !price) return;

    const defaultAllergens = formData.getAll("allergenDefaults") as string[];
    const allergensRaw = (formData.get("allergensCustom") as string) ?? "";
    const defaultTags = formData.getAll("tagDefaults") as string[];
    const tagsRaw = (formData.get("tagsCustom") as string) ?? "";

    const allergens =
      defaultAllergens.length === 0 && allergensRaw.trim().length === 0
        ? []
        : Array.from(
            new Set([
              ...defaultAllergens,
              ...allergensRaw
                .split(",")
                .map((a) => a.trim())
                .filter(Boolean),
            ]),
          );

    const tags =
      defaultTags.length === 0 && tagsRaw.trim().length === 0
        ? []
        : Array.from(
            new Set([
              ...defaultTags,
              ...tagsRaw
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            ]),
          );

    formData.set("name", name);
    formData.set("description", description);
    formData.set("price", price.toString());
    formData.set("allergens", allergens.join(","));
    formData.set("tags", tags.join(","));

    const removeImageRaw = formData.get("removeImage") as string | null;
    if (
      removeImageRaw === "on" ||
      removeImageRaw === "true" ||
      removeImageRaw === "1"
    ) {
      formData.set("removeImage", "true");
    } else {
      formData.delete("removeImage");
    }

    const availableRaw = formData.get("available") as string | null;
    if (
      availableRaw === "on" ||
      availableRaw === "true" ||
      availableRaw === "1"
    ) {
      formData.set("available", "true");
    } else {
      formData.set("available", "false");
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/items/${itemId}`, {
        method: "PATCH",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? "Failed to update item");
      }
      await loadAdminMenu();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!itemId) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/items/${itemId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? "Failed to delete item");
      }
      await loadAdminMenu();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const reorderCategories = async (categories: MenuCategory[]) => {
    setSaving(true);
    try {
      await Promise.all(
        categories.map((cat, index) =>
          fetch(`${API_BASE}/api/categories/${cat._id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ position: index }),
          }),
        ),
      );
      await loadAdminMenu();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const updateCategoryName = async (categoryId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      // eslint-disable-next-line no-alert
      alert("Category name cannot be empty");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/categories/${categoryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? "Failed to rename category");
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              categories: prev.categories.map((cat) =>
                cat._id === categoryId ? { ...cat, name: trimmed } : cat,
              ),
            }
          : prev,
      );
      setEditingCategoryId(null);
      setEditingCategoryName("");
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const reorderItems = async (_categoryId: string, items: MenuItem[]) => {
    setSaving(true);
    try {
      await Promise.all(
        items.map((item, index) =>
          fetch(`${API_BASE}/api/items/${item._id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ position: index }),
          }),
        ),
      );
      await loadAdminMenu();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/categories/${categoryId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? "Failed to delete category");
      }
      await loadAdminMenu();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const bulkImport = async (parsed: BulkCategory[]) => {
    if (!restaurantId) return;
    const totalItems = parsed.reduce((sum, c) => sum + c.items.length, 0);
    let done = 0;
    setBulkImportProgress({ done: 0, total: totalItems });
    setSaving(true);
    try {
      for (const cat of parsed) {
        const catRes = await fetch(
          `${API_BASE}/api/restaurants/${restaurantId}/categories`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ name: cat.categoryName }),
          },
        );
        const catData = (await catRes.json()) as {
          _id: string;
          message?: string;
        };
        if (!catRes.ok) {
          throw new Error(
            catData.message ??
              `Failed to create category "${cat.categoryName}"`,
          );
        }

        for (const item of cat.items) {
          const formData = new FormData();
          formData.set("name", item.name);
          formData.set("description", item.name);
          formData.set("price", item.price.toString());

          const itemRes = await fetch(
            `${API_BASE}/api/categories/${catData._id}/items`,
            {
              method: "POST",
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: formData,
            },
          );
          if (!itemRes.ok) {
            const itemData = (await itemRes.json()) as { message?: string };
            throw new Error(
              itemData.message ?? `Failed to create item "${item.name}"`,
            );
          }
          done++;
          setBulkImportProgress({ done, total: totalItems });
        }
      }

      await loadAdminMenu();
      setBulkImportOpen(false);
      setBulkImportText("");
      setBulkImportProgress(null);
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message);
      setBulkImportProgress(null);
      await loadAdminMenu();
    } finally {
      setSaving(false);
    }
  };

  const handleAutoScroll = (clientY: number) => {
    const edgeThreshold = 80;
    const maxScrollAmount = 40;
    const viewportHeight = window.innerHeight;

    if (clientY < edgeThreshold) {
      const intensity = (edgeThreshold - clientY) / edgeThreshold;
      const amount = -Math.min(
        maxScrollAmount,
        Math.max(10, intensity * maxScrollAmount),
      );
      window.scrollBy({ top: amount, behavior: "smooth" });
    } else if (clientY > viewportHeight - edgeThreshold) {
      const intensity =
        (clientY - (viewportHeight - edgeThreshold)) / edgeThreshold;
      const amount = Math.min(
        maxScrollAmount,
        Math.max(10, intensity * maxScrollAmount),
      );
      window.scrollBy({ top: amount, behavior: "smooth" });
    }
  };

  const toggleCategoryCollapsed = (categoryId: string) => {
    setCollapsedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  };

  const upsertBusinessPlan = async (payload: {
    _id?: string;
    name: string;
    description?: string;
    timeNote?: string;
    price: number;
    active: boolean;
    items: { menuItemId: string; quantity: number }[];
  }) => {
    if (!restaurantId) return;
    setPlanSaving(true);
    try {
      const url = payload._id
        ? `${API_BASE}/api/business-plans/${payload._id}`
        : `${API_BASE}/api/restaurants/${restaurantId}/business-plans`;
      const method = payload._id ? "PATCH" : "POST";
      const body: Record<string, unknown> = {
        name: payload.name,
        description: payload.description,
        timeNote: payload.timeNote,
        price: payload.price,
        active: payload.active,
        items: payload.items,
      };
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) {
        throw new Error(json.message ?? "Failed to save business plan");
      }
      await loadAdminMenu();
      setEditingPlan(null);
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message);
    } finally {
      setPlanSaving(false);
    }
  };

  const deleteBusinessPlan = async (planId: string) => {
    setPlanSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/business-plans/${planId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) {
        throw new Error(json.message ?? "Failed to delete business plan");
      }
      await loadAdminMenu();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message);
    } finally {
      setPlanSaving(false);
    }
  };

  const patchItemAvailable = async (
    itemId: string,
    categoryId: string,
    next: boolean,
  ) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/items/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ available: next }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { message?: string };
        throw new Error(json.message ?? "Failed to update availability");
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              categories: prev.categories.map((cat) =>
                cat._id === categoryId
                  ? {
                      ...cat,
                      items: cat.items.map((it) =>
                        it._id === itemId ? { ...it, available: next } : it,
                      ),
                    }
                  : cat,
              ),
            }
          : prev,
      );
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message);
    } finally {
      setSaving(false);
      setOpenActionsItemId(null);
    }
  };

  return {
    data,
    setData,
    loading,
    error,
    saving,
    setSaving,
    newItemImagePreview,
    setNewItemImagePreview,
    editItemImagePreview,
    setEditItemImagePreview,
    openActionsItemId,
    setOpenActionsItemId,
    dragCategoryIndex,
    setDragCategoryIndex,
    dragItemState,
    setDragItemState,
    collapsedCategoryIds,
    pendingDelete,
    setPendingDelete,
    editingCategoryId,
    setEditingCategoryId,
    editingCategoryName,
    setEditingCategoryName,
    editingItem,
    setEditingItem,
    addingItemForCategory,
    setAddingItemForCategory,
    addCategoryOpen,
    setAddCategoryOpen,
    bulkImportOpen,
    setBulkImportOpen,
    bulkImportText,
    setBulkImportText,
    bulkImportProgress,
    setBulkImportProgress,
    editingPlan,
    setEditingPlan,
    planSaving,
    addCategory,
    addItem,
    updateItemDetails,
    deleteItem,
    reorderCategories,
    updateCategoryName,
    reorderItems,
    deleteCategory,
    bulkImport,
    handleAutoScroll,
    toggleCategoryCollapsed,
    upsertBusinessPlan,
    deleteBusinessPlan,
    patchItemAvailable,
  };
}

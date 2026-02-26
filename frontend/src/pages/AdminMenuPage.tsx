import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { MenuCategory, MenuItem, Restaurant } from '../components/types'
import { useAuth } from '../components/AuthContext'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

interface AdminMenuResponse {
  restaurant: Restaurant
  categories: MenuCategory[]
}

const DEFAULT_ALLERGENS = ['gluten', 'nuts', 'dairy', 'eggs', 'soy', 'shellfish']
const DEFAULT_TAGS = ['vegan', 'vegetarian', 'spicy', 'gluten-free', 'kids', 'chef special']

function getCurrencySymbol(currency?: string) {
  switch ((currency ?? 'USD').toUpperCase()) {
    case 'EUR':
      return '€'
    case 'GBP':
      return '£'
    case 'ILS':
      return '₪'
    case 'USD':
    default:
      return '$'
  }
}

export default function AdminMenuPage() {
  const { restaurantId: routeRestaurantId } = useParams<{ restaurantId: string }>()
  const { restaurant: authRestaurant, token } = useAuth()
  const restaurantId = authRestaurant?._id ?? routeRestaurantId
  const [data, setData] = useState<AdminMenuResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dragCategoryIndex, setDragCategoryIndex] = useState<number | null>(null)
  const [dragItemState, setDragItemState] = useState<{
    categoryId: string
    index: number
  } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<
    | {
        type: 'category'
        id: string
        name: string
      }
    | {
        type: 'item'
        id: string
        name: string
      }
    | null
  >(null)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [editingItem, setEditingItem] = useState<{
    item: MenuItem
    categoryId: string
  } | null>(null)
  const [addingItemForCategory, setAddingItemForCategory] = useState<{
    _id: string
    name: string
  } | null>(null)

  const loadAdminMenu = async (opts?: { showFullscreenLoader?: boolean }) => {
    if (!restaurantId) return
    if (opts?.showFullscreenLoader) {
      setLoading(true)
    }
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/restaurants/${restaurantId}/admin-menu`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const json = (await res.json()) as AdminMenuResponse & { message?: string }
      if (!res.ok) {
        throw new Error(json.message ?? 'Failed to load admin menu')
      }
      setData(json)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      if (opts?.showFullscreenLoader) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    void loadAdminMenu({ showFullscreenLoader: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId])

  const addCategory = async (name: string) => {
    if (!restaurantId || !name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/restaurants/${restaurantId}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { message?: string }
        throw new Error(data.message ?? 'Failed to create category')
      }
      await loadAdminMenu()
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const addItem = async (categoryId: string, formData: FormData) => {
    const name = (formData.get('name') as string) ?? ''
    const description = (formData.get('description') as string) ?? ''
    const priceRaw = formData.get('price') as string
    const price = Number(priceRaw)

    const trimmedName = name.trim()
    const trimmedDescription = description.trim()
    if (!trimmedName || !trimmedDescription || !price) {
      // eslint-disable-next-line no-alert
      alert('Please fill in name, description, and a valid price.')
      return false
    }

    const defaultAllergens = formData.getAll('allergenDefaults') as string[]
    const allergensRaw = (formData.get('allergensCustom') as string) ?? ''
    const defaultTags = formData.getAll('tagDefaults') as string[]
    const tagsRaw = (formData.get('tagsCustom') as string) ?? ''

    const allergens =
      defaultAllergens.length === 0 && allergensRaw.trim().length === 0
        ? []
        : Array.from(
            new Set([
              ...defaultAllergens,
              ...allergensRaw
                .split(',')
                .map((a) => a.trim())
                .filter(Boolean),
            ])
          )

    const tags =
      defaultTags.length === 0 && tagsRaw.trim().length === 0
        ? []
        : Array.from(
            new Set([
              ...defaultTags,
              ...tagsRaw
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
            ])
          )

    if (allergens.length === 0) {
      // eslint-disable-next-line no-alert
      alert('Please select at least one allergen or add a custom allergen.')
      return false
    }

    if (tags.length === 0) {
      // eslint-disable-next-line no-alert
      alert('Please select at least one tag or add a custom tag.')
      return false
    }

    formData.set('name', trimmedName)
    formData.set('description', trimmedDescription)
    formData.set('price', price.toString())
    formData.set('allergens', allergens.join(','))
    formData.set('tags', tags.join(','))

    try {
      setSaving(true)
      const res = await fetch(`${API_BASE}/api/categories/${categoryId}/items`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      })
      if (!res.ok) {
        const data = (await res.json()) as { message?: string }
        throw new Error(data.message ?? 'Failed to create item')
      }
      await loadAdminMenu()
      return true
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message)
      return false
    } finally {
      setSaving(false)
    }
  }

  const updateItemDetails = async (itemId: string, formData: FormData) => {
    const name = (formData.get('name') as string) ?? ''
    const description = (formData.get('description') as string) ?? ''
    const priceRaw = formData.get('price') as string
    const price = Number(priceRaw)

    if (!name.trim() || !description.trim() || !price) return

    const defaultAllergens = formData.getAll('allergenDefaults') as string[]
    const allergensRaw = (formData.get('allergensCustom') as string) ?? ''
    const defaultTags = formData.getAll('tagDefaults') as string[]
    const tagsRaw = (formData.get('tagsCustom') as string) ?? ''

    const allergens =
      defaultAllergens.length === 0 && allergensRaw.trim().length === 0
        ? []
        : Array.from(
            new Set([
              ...defaultAllergens,
              ...allergensRaw
                .split(',')
                .map((a) => a.trim())
                .filter(Boolean),
            ])
          )

    const tags =
      defaultTags.length === 0 && tagsRaw.trim().length === 0
        ? []
        : Array.from(
            new Set([
              ...defaultTags,
              ...tagsRaw
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
            ])
          )

    formData.set('name', name)
    formData.set('description', description)
    formData.set('price', price.toString())
    formData.set('allergens', allergens.join(','))
    formData.set('tags', tags.join(','))

    const removeImageRaw = formData.get('removeImage') as string | null
    if (removeImageRaw === 'on' || removeImageRaw === 'true' || removeImageRaw === '1') {
      formData.set('removeImage', 'true')
    } else {
      formData.delete('removeImage')
    }

    const availableRaw = formData.get('available') as string | null
    if (availableRaw === 'on' || availableRaw === 'true' || availableRaw === '1') {
      formData.set('available', 'true')
    } else {
      formData.set('available', 'false')
    }

    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      })
      if (!res.ok) {
        const data = (await res.json()) as { message?: string }
        throw new Error(data.message ?? 'Failed to update item')
      }
      await loadAdminMenu()
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const deleteItem = async (itemId: string) => {
    if (!itemId) return
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/items/${itemId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) {
        const data = (await res.json()) as { message?: string }
        throw new Error(data.message ?? 'Failed to delete item')
      }
      await loadAdminMenu()
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const reorderCategories = async (categories: MenuCategory[]) => {
    setSaving(true)
    try {
      await Promise.all(
        categories.map((cat, index) =>
          fetch(`${API_BASE}/api/categories/${cat._id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ position: index }),
          })
        )
      )
      await loadAdminMenu()
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const updateCategoryName = async (categoryId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) {
      // eslint-disable-next-line no-alert
      alert('Category name cannot be empty')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/categories/${categoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { message?: string }
        throw new Error(data.message ?? 'Failed to rename category')
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              categories: prev.categories.map((cat) =>
                cat._id === categoryId ? { ...cat, name: trimmed } : cat
              ),
            }
          : prev
      )
      setEditingCategoryId(null)
      setEditingCategoryName('')
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const reorderItems = async (_categoryId: string, items: MenuItem[]) => {
    setSaving(true)
    try {
      await Promise.all(
        items.map((item, index) =>
          fetch(`${API_BASE}/api/items/${item._id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ position: index }),
          })
        )
      )
      await loadAdminMenu()
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const deleteCategory = async (categoryId: string) => {
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/categories/${categoryId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) {
        const data = (await res.json()) as { message?: string }
        throw new Error(data.message ?? 'Failed to delete category')
      }
      await loadAdminMenu()
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleAutoScroll = (clientY: number) => {
    const edgeThreshold = 80
    const maxScrollAmount = 40
    const viewportHeight = window.innerHeight

    if (clientY < edgeThreshold) {
      const intensity = (edgeThreshold - clientY) / edgeThreshold
      const amount = -Math.min(maxScrollAmount, Math.max(10, intensity * maxScrollAmount))
      window.scrollBy({ top: amount, behavior: 'smooth' })
    } else if (clientY > viewportHeight - edgeThreshold) {
      const intensity = (clientY - (viewportHeight - edgeThreshold)) / edgeThreshold
      const amount = Math.min(maxScrollAmount, Math.max(10, intensity * maxScrollAmount))
      window.scrollBy({ top: amount, behavior: 'smooth' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <p className="text-sm text-slate-600">Loading menu…</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <h1 className="text-lg font-semibold">Admin</h1>
          <p className="mt-2 text-sm text-rose-600">
            {error ?? 'Failed to load restaurant menu.'}
          </p>
        </div>
      </div>
    )
  }

  const currencySymbol = getCurrencySymbol(data.restaurant.currency)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {data.restaurant.name}
            </h1>
            <p className="text-xs text-slate-500">Menu admin · manage categories and items</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
              <span className="text-slate-600">Currency</span>
              <select
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-900 outline-none"
                value={data.restaurant.currency ?? 'USD'}
                disabled={saving}
                onChange={(e) => {
                  const next = e.target.value
                  if (!restaurantId || !next) return
                  void (async () => {
                    setSaving(true)
                    try {
                      const res = await fetch(`${API_BASE}/api/restaurants/${restaurantId}`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({ currency: next }),
                      })
                      if (!res.ok) {
                        const json = (await res.json()) as { message?: string }
                        throw new Error(json.message ?? 'Failed to update currency')
                      }
                      setData((prev) =>
                        prev
                          ? {
                              ...prev,
                              restaurant: { ...prev.restaurant, currency: next },
                            }
                          : prev
                      )
                    } catch (err) {
                      // eslint-disable-next-line no-alert
                      alert((err as Error).message)
                    } finally {
                      setSaving(false)
                    }
                  })()
                }}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="ILS">ILS (₪)</option>
              </select>
            </label>
            {saving && (
              <span className="text-[11px] text-slate-500">Saving…</span>
            )}
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Add category</h2>
          <form
            className="flex flex-col gap-2 text-xs sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault()
              const form = e.currentTarget
              const formData = new FormData(form)
              const name = (formData.get('name') as string) ?? ''
              void addCategory(name)
              form.reset()
            }}
          >
            <input
              name="name"
              className="flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="New category name"
            />
            <button
              type="submit"
              className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              disabled={saving}
            >
              Add category
            </button>
          </form>
        </section>

        <section className="space-y-6">
          {data.categories.length === 0 && (
            <p className="text-xs text-slate-500">No categories yet. Add one above.</p>
          )}
          {data.categories.map((category, catIndex) => (
            <div
              key={category._id}
              className={`rounded-2xl border bg-white p-4 shadow-sm ${
                dragCategoryIndex === catIndex
                  ? 'border-emerald-400 ring-1 ring-emerald-300'
                  : 'border-slate-200'
              }`}
              draggable={editingCategoryId === category._id ? false : true}
              onDragStart={(e) => {
                if (saving) return
                e.dataTransfer.effectAllowed = 'move'
                setDragCategoryIndex(catIndex)
              }}
              onDragOver={(e) => {
                if (dragCategoryIndex === null) return
                e.preventDefault()
                handleAutoScroll(e.clientY)
                if (dragCategoryIndex !== catIndex) {
                  setData((prev) => {
                    if (!prev) return prev
                    const categories = [...prev.categories]
                    const moved = categories.splice(dragCategoryIndex, 1)[0]
                    categories.splice(catIndex, 0, moved)
                    return { ...prev, categories }
                  })
                  setDragCategoryIndex(catIndex)
                }
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragCategoryIndex !== null && !saving && data) {
                  void reorderCategories(data.categories)
                }
                setDragCategoryIndex(null)
              }}
              onDragEnd={() => setDragCategoryIndex(null)}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {editingCategoryId === category._id ? (
                    <>
                      <input
                        type="text"
                        className="max-w-xs rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        autoFocus
                        placeholder="Category name"
                      />
                      <button
                        type="button"
                        className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        disabled={saving}
                        onClick={() => void updateCategoryName(category._id, editingCategoryName)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] text-slate-700 hover:bg-slate-50"
                        disabled={saving}
                        onClick={() => {
                          setEditingCategoryId(null)
                          setEditingCategoryName('')
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <h2 className="text-sm font-semibold text-slate-900">{category.name}</h2>
                      <span className="text-[10px] text-slate-400">
                        {category.items?.length ?? 0} items
                      </span>
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                        disabled={saving}
                        onClick={() => {
                          setEditingCategoryId(category._id)
                          setEditingCategoryName(category.name)
                        }}
                      >
                        Rename
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-700 disabled:opacity-40"
                    disabled={catIndex === 0 || saving}
                    onClick={() => {
                      if (saving || !data || catIndex === 0) return
                      const categories = [...data.categories]
                      const moved = categories.splice(catIndex, 1)[0]
                      categories.splice(catIndex - 1, 0, moved)
                      setData((prev) => (prev ? { ...prev, categories } : prev))
                      void reorderCategories(categories)
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-700 disabled:opacity-40"
                    disabled={catIndex === data.categories.length - 1 || saving}
                    onClick={() => {
                      if (saving || !data || catIndex === data.categories.length - 1) return
                      const categories = [...data.categories]
                      const moved = categories.splice(catIndex, 1)[0]
                      categories.splice(catIndex + 1, 0, moved)
                      setData((prev) => (prev ? { ...prev, categories } : prev))
                      void reorderCategories(categories)
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                    disabled={saving}
                    onClick={() =>
                      setAddingItemForCategory({
                        _id: category._id,
                        name: category.name,
                      })
                    }
                  >
                    Add item
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-medium text-rose-700 hover:bg-rose-100"
                    disabled={saving}
                    onClick={() =>
                      setPendingDelete({
                        type: 'category',
                        id: category._id,
                        name: category.name,
                      })
                    }
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="mb-3 space-y-2 text-xs">
                {category.items && category.items.length > 0 ? (
                  category.items.map((item, itemIndex) => (
                    <div
                      key={item._id}
                      className={`flex flex-col gap-3 rounded-xl border bg-white/80 px-3 py-3 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between ${
                        dragItemState &&
                        dragItemState.categoryId === category._id &&
                        dragItemState.index === itemIndex
                          ? 'border-emerald-400 ring-1 ring-emerald-300'
                          : 'border-slate-200'
                      } ${
                        item.available === false ? 'opacity-60 grayscale' : ''
                      }`}
                      draggable
                      onDragStart={(e) => {
                        if (saving) return
                        e.dataTransfer.effectAllowed = 'move'
                        setDragItemState({ categoryId: category._id, index: itemIndex })
                      }}
                      onDragOver={(e) => {
                        if (
                          !dragItemState ||
                          dragItemState.categoryId !== category._id ||
                          dragItemState.index === itemIndex
                        ) {
                          return
                        }
                        e.preventDefault()
                        handleAutoScroll(e.clientY)
                        setData((prev) => {
                          if (!prev) return prev
                          const categories = prev.categories.map((cat) => {
                            if (cat._id !== category._id || !cat.items) return cat
                            const items = [...cat.items]
                            const moved = items.splice(dragItemState.index, 1)[0]
                            items.splice(itemIndex, 0, moved)
                            return { ...cat, items }
                          })
                          return { ...prev, categories }
                        })
                        setDragItemState({ categoryId: category._id, index: itemIndex })
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        if (
                          dragItemState &&
                          dragItemState.categoryId === category._id &&
                          !saving
                        ) {
                          const updatedCategory = data.categories.find(
                            (c) => c._id === category._id
                          )
                          if (updatedCategory && updatedCategory.items) {
                            void reorderItems(category._id, updatedCategory.items)
                          }
                        }
                        setDragItemState(null)
                      }}
                      onDragEnd={() => setDragItemState(null)}
                    >
                      <div className="flex flex-1 gap-3">
                        {item.imageUrl && (
                          <div className="hidden h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:block">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-xs font-semibold text-slate-900">
                                {item.name}
                              </div>
                              <div className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                                {item.description}
                              </div>
                            </div>
                          </div>
                          {(item.tags?.length ?? 0) > 0 || (item.allergens?.length ?? 0) > 0 ? (
                            <div className="mt-1 flex flex-wrap gap-1">
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
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-1 flex items-end justify-between gap-3 sm:mt-0 sm:flex-col sm:items-end sm:justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 rounded-full bg-slate-900/5 px-2 py-1 text-[11px] font-medium text-slate-900">
                            <span>{currencySymbol}</span>
                            <span>{item.price.toFixed(2)}</span>
                          </div>
                          <button
                            type="button"
                            className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                              item.available === false
                                ? 'border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100'
                                : 'border border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100'
                            } disabled:opacity-60`}
                            disabled={saving}
                            onClick={() => {
                              if (saving) return
                              const next = !(item.available ?? true)
                              setSaving(true)
                              void (async () => {
                                try {
                                  const res = await fetch(`${API_BASE}/api/items/${item._id}`, {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                    },
                                    body: JSON.stringify({ available: next }),
                                  })
                                  if (!res.ok) {
                                    const json = (await res.json()) as { message?: string }
                                    throw new Error(json.message ?? 'Failed to update availability')
                                  }
                                  setData((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          categories: prev.categories.map((cat) =>
                                            cat._id === category._id
                                              ? {
                                                  ...cat,
                                                  items: cat.items.map((it) =>
                                                    it._id === item._id ? { ...it, available: next } : it
                                                  ),
                                                }
                                              : cat
                                          ),
                                        }
                                      : prev
                                  )
                                } catch (err) {
                                  // eslint-disable-next-line no-alert
                                  alert((err as Error).message)
                                } finally {
                                  setSaving(false)
                                }
                              })()
                            }}
                          >
                            {item.available === false ? 'Mark available' : 'Mark unavailable'}
                          </button>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            disabled={saving}
                            onClick={() =>
                              setEditingItem({
                                item,
                                categoryId: category._id,
                              })
                            }
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-medium text-rose-700 hover:bg-rose-100"
                            disabled={saving}
                            onClick={() =>
                              setPendingDelete({
                                type: 'item',
                                id: item._id,
                                name: item.name,
                              })
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-500">No items in this category yet.</p>
                )}
              </div>
            </div>
          ))}
        </section>

        {pendingDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
              <h2 className="text-sm font-semibold text-slate-900">Confirm delete</h2>
              <p className="mt-2 text-xs text-slate-700">
                {pendingDelete.type === 'category'
                  ? `Delete category "${pendingDelete.name}" and all its items?`
                  : `Delete item "${pendingDelete.name}"?`}
              </p>
              <div className="mt-4 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 hover:bg-slate-50"
                  disabled={saving}
                  onClick={() => setPendingDelete(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-full bg-rose-600 px-3 py-1 text-white hover:bg-rose-700 disabled:opacity-60"
                  disabled={saving}
                  onClick={() => {
                    if (!pendingDelete) return
                    if (pendingDelete.type === 'category') {
                      void deleteCategory(pendingDelete.id)
                    } else {
                      void deleteItem(pendingDelete.id)
                    }
                    setPendingDelete(null)
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        {addingItemForCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
              <h2 className="text-sm font-semibold text-slate-900">Add item</h2>
              <p className="mt-1 text-[11px] text-slate-600">
                Create a new menu item in{' '}
                <span className="font-semibold">{addingItemForCategory.name}</span>.
              </p>
              <form
                className="mt-3 space-y-2 text-xs"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!addingItemForCategory) return
                  const form = e.currentTarget
                  const formData = new FormData(form)
                  void (async () => {
                    const ok = await addItem(addingItemForCategory._id, formData)
                    if (ok) {
                      setAddingItemForCategory(null)
                    }
                  })()
                }}
              >
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    name="name"
                    required
                    className="flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="Item name"
                  />
                  <input
                    name="price"
                    type="number"
                    min={0.01}
                    step="0.01"
                    className="w-24 rounded-full border border-slate-300 bg-white px-3 py-2 text-right text-xs text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="Price"
                  />
                </div>
                <textarea
                  name="description"
                  rows={2}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400"
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
                      </div>
                      <input
                        type="file"
                        name="image"
                        accept="image/*"
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    disabled={saving}
                    onClick={() => setAddingItemForCategory(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    disabled={saving}
                  >
                    Add item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
              <h2 className="text-sm font-semibold text-slate-900">Edit item</h2>
              <p className="mt-1 text-[11px] text-slate-600">
                Update the details for <span className="font-semibold">{editingItem.item.name}</span>.
              </p>
              {editingItem.item.imageUrl && (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={editingItem.item.imageUrl}
                    alt={editingItem.item.name}
                    className="h-16 w-16 rounded-lg object-cover border border-slate-200"
                  />
                  <span className="text-[11px] text-slate-500">Current image</span>
                </div>
              )}
              <form
                className="mt-3 space-y-2 text-xs"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!editingItem) return
                  const form = e.currentTarget
                  const formData = new FormData(form)
                  void (async () => {
                    await updateItemDetails(editingItem.item._id, formData)
                    setEditingItem(null)
                  })()
                }}
              >
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    name="name"
                    required
                    defaultValue={editingItem.item.name}
                    className="flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="Item name"
                  />
                  <input
                    name="price"
                    type="number"
                    min={0.01}
                    step="0.01"
                    defaultValue={editingItem.item.price.toFixed(2)}
                    className="w-24 rounded-full border border-slate-300 bg-white px-3 py-2 text-right text-xs text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="Price"
                  />
                </div>
                <textarea
                  name="description"
                  rows={2}
                  required
                  defaultValue={editingItem.item.description}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400"
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
                            defaultChecked={editingItem.item.allergens.includes(allergen)}
                            className="h-3 w-3 rounded border-slate-300 text-emerald-600"
                          />
                          <span>{allergen}</span>
                        </label>
                      ))}
                    </div>
                    <input
                      name="allergensCustom"
                      defaultValue={editingItem.item.allergens
                        .filter((a) => !DEFAULT_ALLERGENS.includes(a))
                        .join(', ')}
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
                            defaultChecked={editingItem.item.tags.includes(tag)}
                            className="h-3 w-3 rounded border-slate-300 text-emerald-600"
                          />
                          <span>{tag}</span>
                        </label>
                      ))}
                    </div>
                    <input
                      name="tagsCustom"
                      defaultValue={editingItem.item.tags
                        .filter((t) => !DEFAULT_TAGS.includes(t))
                        .join(', ')}
                      className="mt-1 w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="Custom tags (comma separated, optional)"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium text-slate-700">
                      Item photo
                    </span>
                    <label className="group flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-[11px] text-slate-600 hover:border-emerald-400 hover:bg-emerald-50/40">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-semibold text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700">
                        JPG/PNG
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800 group-hover:text-emerald-800">
                          {editingItem.item.imageUrl ? 'Change image' : 'Upload image'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Square image works best · max 5MB
                        </span>
                      </div>
                      <input
                        type="file"
                        name="image"
                        accept="image/*"
                        className="hidden"
                      />
                    </label>
                    {editingItem.item.imageUrl && (
                      <label className="mt-1 inline-flex items-center gap-2 text-[11px] text-slate-700">
                        <input type="checkbox" name="removeImage" className="h-3 w-3" />
                        <span>Remove existing image</span>
                      </label>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium text-slate-700">
                      Availability
                    </span>
                    <label className="inline-flex items-center gap-2 text-[11px] text-slate-700">
                      <input
                        type="checkbox"
                        name="available"
                        defaultChecked={editingItem.item.available ?? true}
                        className="h-3 w-3"
                      />
                      <span>Item available for ordering</span>
                    </label>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    disabled={saving}
                    onClick={() => setEditingItem(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    disabled={saving}
                  >
                    Save changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


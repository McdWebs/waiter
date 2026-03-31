import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { BusinessPlan, MenuCategory, MenuItem, Restaurant } from '../components/types'
import { useAuth } from '../components/AuthContext'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

interface AdminMenuResponse {
  restaurant: Restaurant
  categories: MenuCategory[]
  businessPlans?: BusinessPlan[]
}

const DEFAULT_ALLERGENS = ['gluten', 'nuts', 'dairy', 'eggs', 'soy', 'shellfish']
const DEFAULT_TAGS = ['vegan', 'vegetarian', 'spicy', 'gluten-free', 'kids', 'chef special']

interface BulkCategory {
  categoryName: string
  items: { name: string; price: number }[]
}

function parseBulkMenuText(text: string): BulkCategory[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const result: BulkCategory[] = []
  let current: BulkCategory | null = null

  for (const line of lines) {
    const emIdx = line.indexOf('—')
    const enIdx = line.indexOf('–')
    const dashIdx = emIdx >= 0 ? emIdx : enIdx >= 0 ? enIdx : -1

    if (dashIdx > 0) {
      const name = line.slice(0, dashIdx).trim()
      const afterDash = line.slice(dashIdx + 1).trim()
      const priceStr = afterDash.replace(/[₪$€£\s]/g, '').replace(',', '.')
      const price = parseFloat(priceStr)
      if (name && !Number.isNaN(price) && price > 0 && current) {
        current.items.push({ name, price })
        continue
      }
    }

    if (line) {
      current = { categoryName: line, items: [] }
      result.push(current)
    }
  }

  return result.filter((c) => c.items.length > 0)
}

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
  const [newItemImagePreview, setNewItemImagePreview] = useState<string | null>(null)
  const [editItemImagePreview, setEditItemImagePreview] = useState<string | null>(null)
  const [openActionsItemId, setOpenActionsItemId] = useState<string | null>(null)
  const [dragCategoryIndex, setDragCategoryIndex] = useState<number | null>(null)
  const [dragItemState, setDragItemState] = useState<{
    categoryId: string
    index: number
  } | null>(null)
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<string[]>([])
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
  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [bulkImportOpen, setBulkImportOpen] = useState(false)
  const [bulkImportText, setBulkImportText] = useState('')
  const [bulkImportProgress, setBulkImportProgress] = useState<{
    done: number
    total: number
  } | null>(null)
  const [editingPlan, setEditingPlan] = useState<BusinessPlan | null>(null)
  const [planSaving, setPlanSaving] = useState(false)

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

  const bulkImport = async (parsed: BulkCategory[]) => {
    if (!restaurantId) return
    const totalItems = parsed.reduce((sum, c) => sum + c.items.length, 0)
    let done = 0
    setBulkImportProgress({ done: 0, total: totalItems })
    setSaving(true)
    try {
      for (const cat of parsed) {
        const catRes = await fetch(`${API_BASE}/api/restaurants/${restaurantId}/categories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ name: cat.categoryName }),
        })
        const catData = (await catRes.json()) as { _id: string; message?: string }
        if (!catRes.ok) {
          throw new Error(catData.message ?? `Failed to create category "${cat.categoryName}"`)
        }

        for (const item of cat.items) {
          const formData = new FormData()
          formData.set('name', item.name)
          formData.set('description', item.name)
          formData.set('price', item.price.toString())

          const itemRes = await fetch(`${API_BASE}/api/categories/${catData._id}/items`, {
            method: 'POST',
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
          })
          if (!itemRes.ok) {
            const itemData = (await itemRes.json()) as { message?: string }
            throw new Error(itemData.message ?? `Failed to create item "${item.name}"`)
          }
          done++
          setBulkImportProgress({ done, total: totalItems })
        }
      }

      await loadAdminMenu()
      setBulkImportOpen(false)
      setBulkImportText('')
      setBulkImportProgress(null)
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message)
      setBulkImportProgress(null)
      await loadAdminMenu()
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

  const toggleCategoryCollapsed = (categoryId: string) => {
    setCollapsedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const upsertBusinessPlan = async (payload: {
    _id?: string
    name: string
    description?: string
    timeNote?: string
    price: number
    active: boolean
    items: { menuItemId: string; quantity: number }[]
  }) => {
    if (!restaurantId) return
    setPlanSaving(true)
    try {
      const url = payload._id
        ? `${API_BASE}/api/business-plans/${payload._id}`
        : `${API_BASE}/api/restaurants/${restaurantId}/business-plans`
      const method = payload._id ? 'PATCH' : 'POST'
      const body: any = {
        name: payload.name,
        description: payload.description,
        timeNote: payload.timeNote,
        price: payload.price,
        active: payload.active,
        items: payload.items,
      }
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as { message?: string }
      if (!res.ok) {
        throw new Error(json.message ?? 'Failed to save business plan')
      }
      await loadAdminMenu()
      setEditingPlan(null)
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message)
    } finally {
      setPlanSaving(false)
    }
  }

  const deleteBusinessPlan = async (planId: string) => {
    setPlanSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/business-plans/${planId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const json = (await res.json()) as { message?: string }
      if (!res.ok) {
        throw new Error(json.message ?? 'Failed to delete business plan')
      }
      await loadAdminMenu()
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message)
    } finally {
      setPlanSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-3 py-6 sm:px-4">
          <p className="text-sm text-slate-600">Loading menu…</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-3 py-6 sm:px-4">
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
    <div
      className="min-h-screen bg-slate-50 text-slate-900 pb-8"
      onClick={() => setOpenActionsItemId(null)}
    >
      <div className="mx-auto max-w-3xl px-3 py-4 space-y-6 sm:px-4 sm:py-6">
        <section className="rounded-2xl border border-slate-200 bg-white px-3 py-3 sm:px-4">
          {/* Mobile: single button that expands to show form */}
          <div className="sm:hidden">
            {!addCategoryOpen ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  disabled={saving}
                  onClick={() => setAddCategoryOpen(true)}
                >
                  + Add category
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                  disabled={saving}
                  onClick={() => setBulkImportOpen(true)}
                >
                  ⬆ Bulk import from text
                </button>
              </div>
            ) : (
              <form
                className="flex flex-col gap-2 text-xs"
                onSubmit={(e) => {
                  e.preventDefault()
                  const form = e.currentTarget
                  const formData = new FormData(form)
                  const name = (formData.get('name') as string) ?? ''
                  void addCategory(name)
                  form.reset()
                  setAddCategoryOpen(false)
                }}
              >
                <input
                  name="name"
                  autoFocus
                  className="min-h-[44px] w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="New category name"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="min-h-[44px] flex-1 touch-manipulation rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
                    onClick={() => setAddCategoryOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="min-h-[44px] flex-1 touch-manipulation rounded-full bg-emerald-600 px-3 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    disabled={saving}
                  >
                    Add
                  </button>
                </div>
              </form>
            )}
          </div>
          {/* Desktop: always-visible form */}
          <div className="hidden sm:block">
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
                className="min-h-[44px] flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="New category name"
              />
              <button
                type="submit"
                className="min-h-[44px] touch-manipulation rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                disabled={saving}
              >
                Add category
              </button>
              <button
                type="button"
                className="min-h-[44px] touch-manipulation rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                disabled={saving}
                onClick={() => setBulkImportOpen(true)}
              >
                ⬆ Bulk import
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white px-3 py-3 sm:px-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Business plans (עסקיות)
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Fixed-price business meals: pick items from your menu. Guests see these at the top of the menu.
              </p>
            </div>
            <button
              type="button"
              className="mt-1 inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-60 sm:mt-0"
              disabled={planSaving || !data.categories.length}
              onClick={() =>
                setEditingPlan({
                  _id: '',
                  name: 'עסקית',
                  description: '',
                  timeNote: '',
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
              No business plans yet. Click &ldquo;New business plan&rdquo; to add one.
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
                      {plan.items.length} item{plan.items.length === 1 ? '' : 's'}
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
                            void deleteBusinessPlan(plan._id)
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

        <section className="space-y-6">
          {data.categories.length === 0 && (
            <p className="text-xs text-slate-500">No categories yet. Add one above.</p>
          )}
          {data.categories.map((category, catIndex) => {
            const isCollapsed = collapsedCategoryIds.includes(category._id)
            return (
              <div
                key={category._id}
                className={`group rounded-3xl border bg-white/95 p-4 shadow-sm ring-1 ring-transparent transition hover:border-emerald-200 hover:shadow-md hover:ring-emerald-50 sm:p-5 ${
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
                {/* Category header */}
                <div className="mb-4 flex items-start gap-3 border-b border-slate-100 pb-3">
                  {/* Drag handle */}
                  <div className="flex-shrink-0 cursor-grab text-slate-300 active:cursor-grabbing select-none text-base leading-none">
                    ⠿
                  </div>

                  {/* Name / rename input */}
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
                            if (e.key === 'Enter') void updateCategoryName(category._id, editingCategoryName)
                            if (e.key === 'Escape') {
                              setEditingCategoryId(null)
                              setEditingCategoryName('')
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="flex-shrink-0 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          disabled={saving}
                          onClick={() => void updateCategoryName(category._id, editingCategoryName)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="flex-shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 hover:bg-slate-50"
                          onClick={() => {
                            setEditingCategoryId(null)
                            setEditingCategoryName('')
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

                  {/* Action toolbar — only shown when not renaming */}
                  {editingCategoryId !== category._id && (
                    <div className="flex flex-shrink-0 items-center gap-1">
                      {/* Collapse toggle */}
                      <button
                        type="button"
                        title={isCollapsed ? 'Expand' : 'Collapse'}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        onClick={() => toggleCategoryCollapsed(category._id)}
                      >
                        <svg
                          className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                          fill="none"
                          viewBox="0 0 16 16"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
                        </svg>
                      </button>

                      {/* Rename */}
                      <button
                        type="button"
                        title="Rename category"
                        disabled={saving}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                        onClick={() => {
                          setEditingCategoryId(category._id)
                          setEditingCategoryName(category.name)
                        }}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.5 2.5a1.414 1.414 0 012 2L5 13H3v-2L11.5 2.5z" />
                        </svg>
                      </button>

                      {/* Move up */}
                      <button
                        type="button"
                        title="Move up"
                        disabled={catIndex === 0 || saving}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                        onClick={() => {
                          if (saving || !data || catIndex === 0) return
                          const categories = [...data.categories]
                          const moved = categories.splice(catIndex, 1)[0]
                          categories.splice(catIndex - 1, 0, moved)
                          setData((prev) => (prev ? { ...prev, categories } : prev))
                          void reorderCategories(categories)
                        }}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12V4M4 8l4-4 4 4" />
                        </svg>
                      </button>

                      {/* Move down */}
                      <button
                        type="button"
                        title="Move down"
                        disabled={catIndex === data.categories.length - 1 || saving}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                        onClick={() => {
                          if (saving || !data || catIndex === data.categories.length - 1) return
                          const categories = [...data.categories]
                          const moved = categories.splice(catIndex, 1)[0]
                          categories.splice(catIndex + 1, 0, moved)
                          setData((prev) => (prev ? { ...prev, categories } : prev))
                          void reorderCategories(categories)
                        }}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 4v8m4-4l-4 4-4-4" />
                        </svg>
                      </button>

                      {/* Divider */}
                      <div className="mx-1 h-5 w-px bg-slate-200" />

                      {/* Add item */}
                      <button
                        type="button"
                        title="Add item"
                        disabled={saving}
                        className="flex h-8 items-center gap-1.5 rounded-full bg-emerald-600 px-3 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                        onClick={() =>
                          setAddingItemForCategory({ _id: category._id, name: category.name })
                        }
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v10M3 8h10" />
                        </svg>
                        <span className="hidden sm:inline">Add item</span>
                      </button>

                      {/* Delete category */}
                      <button
                        type="button"
                        title="Delete category"
                        disabled={saving}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                        onClick={() =>
                          setPendingDelete({ type: 'category', id: category._id, name: category.name })
                        }
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h10M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Items list */}
                <div className="text-xs">
                  <div
                    className={`overflow-hidden transform-gpu origin-top transition-all duration-200 ease-out ${
                      isCollapsed
                        ? 'max-h-0 scale-y-95 opacity-0 pointer-events-none'
                        : 'max-h-[1200px] scale-y-100 opacity-100'
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
                              ? 'ring-1 ring-emerald-300'
                              : ''
                          } ${item.available === false ? 'opacity-75' : ''} ${
                            openActionsItemId === item._id ? 'z-20' : ''
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
                          {/* Left: image, title/description, tags */}
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
                              {(item.tags?.length ?? 0) > 0 || (item.allergens?.length ?? 0) > 0 ? (
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

                          {/* Right: price and actions dropdown */}
                          <div className="mt-2 flex items-center justify-between gap-2 sm:mt-0 sm:w-auto sm:flex-col sm:items-end">
                            <div className="flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white sm:self-end">
                              <span>{currencySymbol}</span>
                              <span>{item.price.toFixed(2)}</span>
                            </div>
                            <div
                              className="relative"
                              onClick={(e) => {
                                e.stopPropagation()
                              }}
                            >
                              <button
                                type="button"
                                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
                                onClick={() =>
                                  setOpenActionsItemId((prev) =>
                                    prev === item._id ? null : item._id
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
                                      if (saving) return
                                      const next = !(item.available ?? true)
                                      setSaving(true)
                                      void (async () => {
                                        try {
                                          const res = await fetch(
                                            `${API_BASE}/api/items/${item._id}`,
                                            {
                                              method: 'PATCH',
                                              headers: {
                                                'Content-Type': 'application/json',
                                                ...(token
                                                  ? { Authorization: `Bearer ${token}` }
                                                  : {}),
                                              },
                                              body: JSON.stringify({ available: next }),
                                            }
                                          )
                                          if (!res.ok) {
                                            const json = (await res.json()) as { message?: string }
                                            throw new Error(
                                              json.message ?? 'Failed to update availability'
                                            )
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
                                                            it._id === item._id
                                                              ? { ...it, available: next }
                                                              : it
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
                                          setOpenActionsItemId(null)
                                        }
                                      })()
                                    }}
                                  >
                                    {item.available === false ? 'Mark available' : 'Mark unavailable'}
                                  </button>
                                  <button
                                    type="button"
                                    className="block w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                    disabled={saving}
                                    onClick={() => {
                                      setEditingItem({
                                        item,
                                        categoryId: category._id,
                                      })
                                      setOpenActionsItemId(null)
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
                                        type: 'item',
                                        id: item._id,
                                        name: item.name,
                                      })
                                      setOpenActionsItemId(null)
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
            )
          })}
        </section>

        {bulkImportOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto overscroll-contain sm:items-center">
            <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl my-4 sm:my-0">
              <h2 className="text-sm font-semibold text-slate-900">Bulk import from text</h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Paste your menu text below. A line without a dash is treated as a category name.
                A line like <span className="font-mono font-medium text-slate-700">Pinko — ₪53</span> is treated as an item.
              </p>
              <textarea
                className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400 font-mono leading-relaxed"
                rows={10}
                placeholder={`Cocktails\nPinko — ₪53\nNigori Mule — ₪58\n\nDesserts\nChocolate Fondant — ₪42`}
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
                disabled={bulkImportProgress !== null}
              />

              {/* Live preview */}
              {(() => {
                if (!bulkImportText.trim()) return null
                const parsed = parseBulkMenuText(bulkImportText)
                if (parsed.length === 0) {
                  return (
                    <p className="mt-2 text-[11px] text-amber-600">
                      No valid categories or items detected yet. Make sure items use a dash (—) separator.
                    </p>
                  )
                }
                const totalItems = parsed.reduce((s, c) => s + c.items.length, 0)
                return (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 space-y-2 max-h-52 overflow-y-auto">
                    <p className="text-[11px] font-semibold text-emerald-800">
                      Preview — {parsed.length} {parsed.length === 1 ? 'category' : 'categories'},{' '}
                      {totalItems} {totalItems === 1 ? 'item' : 'items'}
                    </p>
                    {parsed.map((cat, i) => (
                      <div key={i}>
                        <p className="text-[11px] font-semibold text-slate-800">{cat.categoryName}</p>
                        <ul className="mt-0.5 space-y-0.5 pl-3">
                          {cat.items.map((item, j) => (
                            <li key={j} className="text-[10px] text-slate-600 flex justify-between">
                              <span>{item.name}</span>
                              <span className="font-medium text-slate-800">
                                {currencySymbol}{item.price.toFixed(2)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Progress */}
              {bulkImportProgress !== null && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-medium text-slate-700">
                    Importing… {bulkImportProgress.done} / {bulkImportProgress.total} items
                  </p>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200">
                    <div
                      className="h-1.5 rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${bulkImportProgress.total > 0 ? (bulkImportProgress.done / bulkImportProgress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  className="min-h-[44px] touch-manipulation rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  disabled={bulkImportProgress !== null}
                  onClick={() => {
                    setBulkImportOpen(false)
                    setBulkImportText('')
                    setBulkImportProgress(null)
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="min-h-[44px] touch-manipulation rounded-full bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  disabled={saving || bulkImportProgress !== null || !bulkImportText.trim() || parseBulkMenuText(bulkImportText).length === 0}
                  onClick={() => {
                    const parsed = parseBulkMenuText(bulkImportText)
                    if (parsed.length === 0) return
                    void bulkImport(parsed)
                  }}
                >
                  {bulkImportProgress !== null
                    ? `Importing… (${bulkImportProgress.done}/${bulkImportProgress.total})`
                    : (() => {
                        const parsed = parseBulkMenuText(bulkImportText)
                        if (!bulkImportText.trim() || parsed.length === 0) return 'Import'
                        const totalItems = parsed.reduce((s, c) => s + c.items.length, 0)
                        return `Import ${totalItems} item${totalItems === 1 ? '' : 's'} in ${parsed.length} categor${parsed.length === 1 ? 'y' : 'ies'}`
                      })()}
                </button>
              </div>
            </div>
          </div>
        )}
        {pendingDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
            <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl my-auto">
              <h2 className="text-sm font-semibold text-slate-900">Confirm delete</h2>
              <p className="mt-2 text-xs text-slate-700">
                {pendingDelete.type === 'category'
                  ? `Delete category "${pendingDelete.name}" and all its items?`
                  : `Delete item "${pendingDelete.name}"?`}
              </p>
              <div className="mt-4 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  className="min-h-[44px] touch-manipulation rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
                  disabled={saving}
                  onClick={() => setPendingDelete(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="min-h-[44px] touch-manipulation rounded-full bg-rose-600 px-4 py-2 text-white hover:bg-rose-700 disabled:opacity-60"
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
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto overscroll-contain sm:items-center">
            <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl my-4 sm:my-0 max-h-[90vh] overflow-y-auto">
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
                  if (!newItemImagePreview) {
                    formData.delete('image')
                  }
                  void (async () => {
                    const ok = await addItem(addingItemForCategory._id, formData)
                    if (ok) {
                      setNewItemImagePreview(null)
                      setAddingItemForCategory(null)
                    }
                  })()
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
                          const file = e.target.files?.[0]
                          if (file) {
                            const url = URL.createObjectURL(file)
                            setNewItemImagePreview(url)
                          } else {
                            setNewItemImagePreview(null)
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
                            setNewItemImagePreview(null)
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
                    onClick={() => setAddingItemForCategory(null)}
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
        )}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto overscroll-contain sm:items-center">
            <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl my-4 sm:my-0 max-h-[90vh] overflow-y-auto">
              <h2 className="text-sm font-semibold text-slate-900">Edit item</h2>
              <p className="mt-1 text-[11px] text-slate-600">
                Update the details for <span className="font-semibold">{editingItem.item.name}</span>.
              </p>
              <form
                className="mt-3 space-y-2 text-xs"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!editingItem) return
                  const form = e.currentTarget
                  const formData = new FormData(form)
                  if (!editItemImagePreview) {
                    formData.delete('image')
                  }
                  void (async () => {
                    await updateItemDetails(editingItem.item._id, formData)
                    setEditItemImagePreview(null)
                    setEditingItem(null)
                  })()
                }}
              >
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    name="name"
                    required
                    defaultValue={editingItem.item.name}
                    className="min-h-[44px] flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="Item name"
                  />
                  <input
                    name="price"
                    type="number"
                    min={0.01}
                    step="0.01"
                    defaultValue={editingItem.item.price.toFixed(2)}
                    className="min-h-[44px] w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-right text-xs text-slate-900 outline-none placeholder:text-slate-400 sm:w-24"
                    placeholder="Price"
                  />
                </div>
                <textarea
                  name="description"
                  rows={2}
                  required
                  defaultValue={editingItem.item.description}
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
                        {editItemImagePreview && (
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
                          const file = e.target.files?.[0]
                          if (file) {
                            const url = URL.createObjectURL(file)
                            setEditItemImagePreview(url)
                          } else {
                            setEditItemImagePreview(null)
                          }
                        }}
                      />
                    </label>
                    {(editingItem.item.imageUrl || editItemImagePreview) && (
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                          <img
                            src={editItemImagePreview ?? editingItem.item.imageUrl ?? ''}
                            alt="New image preview"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        {editItemImagePreview && (
                          <button
                            type="button"
                            className="text-[11px] font-medium text-rose-600 hover:text-rose-700"
                            onClick={() => {
                              setEditItemImagePreview(null)
                            }}
                          >
                            Remove new image
                          </button>
                        )}
                      </div>
                    )}
                    {editingItem.item.imageUrl && !editItemImagePreview && (
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
                    className="min-h-[44px] touch-manipulation rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    disabled={saving}
                    onClick={() => setEditingItem(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="min-h-[44px] touch-manipulation rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    disabled={saving}
                  >
                    Save changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {editingPlan && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-3 py-6 overflow-y-auto overscroll-contain sm:items-center">
            <div className="my-4 w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-3xl bg-white px-5 py-4 shadow-xl sm:my-0 sm:px-6 sm:py-5">
              <h2 className="text-base font-semibold text-slate-900">
                {editingPlan._id ? 'Edit business plan' : 'New business plan'}
              </h2>
              <p className="mt-1 text-[11px] text-slate-600">
                Choose a name, price, and which dishes are included in this עסקית.
              </p>
              <BusinessPlanEditor
                plan={editingPlan}
                categories={data.categories}
                currencySymbol={currencySymbol}
                saving={planSaving}
                onCancel={() => setEditingPlan(null)}
                onSave={upsertBusinessPlan}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface BusinessPlanEditorProps {
  plan: BusinessPlan
  categories: MenuCategory[]
  currencySymbol: string
  saving: boolean
  onCancel: () => void
  onSave: (payload: {
    _id?: string
    name: string
    description?: string
    timeNote?: string
    price: number
    active: boolean
    items: { menuItemId: string; quantity: number }[]
  }) => void
}

function BusinessPlanEditor({
  plan,
  categories,
  currencySymbol,
  saving,
  onCancel,
  onSave,
}: BusinessPlanEditorProps) {
  const [name, setName] = useState(plan.name)
  const [description, setDescription] = useState(plan.description ?? '')
  const [timeNote, setTimeNote] = useState(plan.timeNote ?? '')
  const [price, setPrice] = useState(plan.price)
  const [active, setActive] = useState(plan.active ?? true)
  const [items, setItems] = useState<{ menuItemId: string; quantity: number }[]>(
    plan.items.map((it) => ({ menuItemId: it._id, quantity: it.quantity }))
  )
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?._id ?? ''
  )
  const [selectedItemId, setSelectedItemId] = useState<string>('')
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1)

  const selectedCategory = categories.find((c) => c._id === selectedCategoryId)
  const selectedCategoryItems = selectedCategory?.items ?? []

  const addItemToPlan = () => {
    if (!selectedItemId) return
    setItems((prev) => {
      const existingIndex = prev.findIndex((p) => p.menuItemId === selectedItemId)
      if (existingIndex >= 0) {
        const next = [...prev]
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + (selectedQuantity || 1),
        }
        return next
      }
      return [...prev, { menuItemId: selectedItemId, quantity: selectedQuantity || 1 }]
    })
  }

  const resolveItem = (menuItemId: string): MenuItem | undefined => {
    for (const cat of categories) {
      const found = cat.items.find((it) => it._id === menuItemId)
      if (found) return found
    }
    return undefined
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      alert('Name is required')
      return
    }
    if (!timeNote.trim()) {
      alert('Please set when this business plan is available.')
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      alert('Price must be a non-negative number')
      return
    }
    if (items.length === 0) {
      alert('Please add at least one menu item to the plan.')
      return
    }
    onSave({
      _id: plan._id || undefined,
      name: name.trim(),
      description: description.trim() || undefined,
      timeNote: timeNote.trim() || undefined,
      price,
      active,
      items,
    })
  }

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
              <span className="text-[11px] text-slate-500">{currencySymbol}</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={Number.isNaN(price) ? '' : price}
                onChange={(e) => {
                  const v = e.target.value
                  setPrice(v === '' ? 0 : parseFloat(v) || 0)
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
            'Sun–Thu 12:00–16:00',
            'Mon–Fri 12:00–15:00',
            'Weekdays 11:30–16:00',
          ].map((preset) => (
            <button
              key={preset}
              type="button"
              className={`rounded-full border px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
                timeNote === preset
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
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
                  setSelectedCategoryId(e.target.value)
                  setSelectedItemId('')
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
                  setSelectedQuantity(Math.max(1, parseInt(e.target.value || '1', 10)))
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
                  const menuItem = resolveItem(entry.menuItemId)
                  if (!menuItem) return null
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
                            prev.filter((p) => p.menuItemId !== entry.menuItemId)
                          )
                        }
                      >
                        Remove
                      </button>
                    </li>
                  )
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
          {saving ? 'Saving…' : 'Save business plan'}
        </button>
      </div>
    </form>
  )
}


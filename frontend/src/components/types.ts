export interface MenuItem {
  _id: string
  name: string
  description: string
  price: number
  allergens: string[]
  tags: string[]
  position?: number
  imageUrl?: string
  available?: boolean
}

export interface SuggestedItem extends MenuItem {
  quantity: number
}

export interface BusinessPlanItem extends MenuItem {
  quantity: number
}

export interface BusinessPlan {
  _id: string
  name: string
  description?: string
  timeNote?: string
  price: number
  position?: number
  active?: boolean
  items: BusinessPlanItem[]
}

export interface MenuCategory {
  _id: string
  name: string
  items: MenuItem[]
  position?: number
}

export interface Restaurant {
  _id: string
  name: string
  slug: string
  currency?: string
  address?: string
  phone?: string
  contactEmail?: string
  description?: string
  restaurantType?: string
  timezone?: string
  openingHoursNote?: string
  taxRatePercent?: number
  serviceChargePercent?: number
  allowOrders?: boolean
  orderLeadTimeMinutes?: number
  aiInstructions?: string
  isSuspended?: boolean
  printerEnabled?: boolean
  printerName?: string
  logoUrl?: string
  websiteUrl?: string
  instagramUrl?: string
  facebookUrl?: string
  businessPlanEnabled?: boolean
  businessPlanTitle?: string
  businessPlanDescription?: string
  /** Display-only text for when the plan is available (e.g. days/hours). */
  businessPlanTimeNote?: string
  businessPlanPrice?: number
}

export interface CartItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  notes?: string
  imageUrl?: string
  /**
   * For bundle rows (e.g. business meal), submit these real menu items to backend.
   */
  bundleItems?: { menuItemId: string; quantity: number }[]
}


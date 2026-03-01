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
}

export interface CartItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  notes?: string
}


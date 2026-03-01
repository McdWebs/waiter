import { Restaurant } from '../models/Restaurant'
import { MenuCategory } from '../models/MenuCategory'
import { MenuItem } from '../models/MenuItem'
import { openai } from './openaiClient'

export async function getMenuContext(restaurantId: string) {
  const restaurant = await Restaurant.findById(restaurantId).lean()
  if (!restaurant) {
    throw new Error('Restaurant not found')
  }

  const categories = await MenuCategory.find({ restaurantId }).lean()
  const items = await MenuItem.find({
    categoryId: { $in: categories.map((c) => c._id) },
  }).lean()

   const currencyCode = (restaurant.currency ?? 'USD').toUpperCase()
   const currencySymbol = (() => {
     switch (currencyCode) {
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
   })()

  const lines: string[] = []
  lines.push(`Restaurant: ${restaurant.name}`)
  for (const category of categories) {
    lines.push(`\nCategory: ${category.name}`)
    for (const item of items.filter((i) => i.categoryId.toString() === category._id.toString())) {
      lines.push(
        `- ${item.name} (${currencySymbol}${item.price.toFixed(2)}): ${item.description} | Allergens: ${
          item.allergens?.join(', ') || 'none'
        } | Tags: ${item.tags?.join(', ') || 'none'}`
      )
    }
  }

  return {
    menuText: lines.join('\n'),
    items,
    restaurant,
  }
}

export async function menuChat({
  restaurantId,
  messages,
  cartSummary,
}: {
  restaurantId: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  cartSummary?: string | undefined
}) {
  if (!openai.apiKey) {
    throw new Error('OpenAI API key not configured')
  }

  const { menuText, items, restaurant } = await getMenuContext(restaurantId)

  const restaurantName = restaurant.name
  const basePrompt =
    `You are the waiter for "${restaurantName}". Talk like a real person: warm and helpful, not formal or robotic. ` +
    'Use the menu data ONLY. Be concise—one or two short sentences per idea. ' +
    'Lead with what they asked for: name the dish(es), price, and category. Skip filler like "delightful", "perfect", "sure to satisfy". ' +
    'If the menu has few or no matches (e.g. almost no vegan options), say so plainly and mention the one or two options that do fit, or suggest they ask about modifying a dish. ' +
    'You can recommend items, suggest add-ons, and filter by allergens or preferences. ' +
    'When they ask for "something else" or more options, suggest different dishes than before unless they ask to repeat. ' +
    'IMPORTANT: When you recommend specific dishes in this reply, append exactly one line at the end in this format: ' +
    'ADD_TO_CART: [{"name": "<exact dish name from menu>", "quantity": 1}]. ' +
    'One entry per dish you recommended in this reply only. Valid JSON, double quotes, no comments or code fences. ' +
    'Only dish names from the menu, quantities 1 or 2. If you are not recommending any specific dishes, do not add ADD_TO_CART.'
  const customInstructions = (restaurant.aiInstructions ?? '').trim()
  const contextParts = [menuText]
  if (cartSummary) {
    contextParts.push(`\nCurrent cart: ${cartSummary}`)
  }

  const systemMessages: { role: 'system'; content: string }[] = [
    { role: 'system', content: basePrompt },
  ]
  if (customInstructions) {
    systemMessages.push({
      role: 'system',
      content: `CRITICAL - Restaurant owner instructions (override default style when they conflict):\n${customInstructions}`,
    })
  }
  systemMessages.push({
    role: 'system',
    content: `Menu data:\n${contextParts.join('\n')}`,
  })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [...systemMessages, ...messages],
    temperature: 0.4,
  })

  const raw = response.choices[0]?.message?.content ?? ''

  let reply = raw
  const suggestions: {
    _id: string
    name: string
    description: string
    price: number
    allergens: string[]
    tags: string[]
    quantity: number
  }[] = []

  const marker = 'ADD_TO_CART:'
  const markerIndex = raw.lastIndexOf(marker)
  if (markerIndex !== -1) {
    reply = raw.slice(0, markerIndex).trim()
    const afterMarker = raw.slice(markerIndex + marker.length)
    const start = afterMarker.indexOf('[')
    const end = afterMarker.lastIndexOf(']')
    if (start !== -1 && end !== -1 && end > start) {
      const jsonPart = afterMarker.slice(start, end + 1).trim()
      try {
        const parsed = JSON.parse(jsonPart) as { name?: string; quantity?: number }[]
        for (const entry of parsed) {
          if (!entry?.name) continue
          const match = items.find(
            (i) => i.name.toLowerCase() === entry.name!.toLowerCase()
          )
          if (!match) continue
          suggestions.push({
            _id: match._id.toString(),
            name: match.name,
            description: match.description,
            price: match.price,
            allergens: match.allergens ?? [],
            tags: match.tags ?? [],
            quantity: entry.quantity && entry.quantity > 0 ? entry.quantity : 1,
          })
        }
      } catch {
        // ignore malformed suggestions
      }
    }
  }

  return { reply, suggestions }
}


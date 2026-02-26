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

  const systemPrompt =
    `You are the friendly AI waiter for the restaurant "${restaurantName}". ` +
    'Your answers must feel personal to this specific restaurant: speak in the first person plural ("we"), ' +
    'refer to dishes and categories as if you are part of the staff, and occasionally mention the restaurant name naturally. ' +
    'You can answer questions ONLY using the provided menu data. ' +
    'If a question is not related to the menu, politely decline. ' +
    'You can recommend items, suggest add-ons, and filter by allergens or preferences. ' +
    'When the guest asks for "something else" or more options, try to suggest different dishes than in earlier replies, unless they explicitly ask to repeat something. ' +
    'IMPORTANT: Every time you recommend one or more specific dishes that the guest might like in THIS reply, ' +
    'you MUST append ONE extra line at the very end of your reply in this exact format: ' +
    'ADD_TO_CART: [{"name": "<exact dish name from menu data>", "quantity": 1}]. ' +
    'The JSON array must contain ONE entry for EACH specific dish name you just recommended in this reply, and MUST NOT contain dishes you did not explicitly name in this reply. ' +
    'Use a valid JSON array, with double quotes, no comments, and no extra text or code fences. ' +
    'Only include dish names that exist in the menu data and keep quantities small (1 or 2). ' +
    'If in a given reply you are not recommending any specific dishes, do NOT include an ADD_TO_CART line at all.'

  const contextParts = [menuText]
  if (cartSummary) {
    contextParts.push(`\nCurrent cart: ${cartSummary}`)
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'system',
        content: `Menu data:\n${contextParts.join('\n')}`,
      },
      ...messages,
    ],
    temperature: 0.2,
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


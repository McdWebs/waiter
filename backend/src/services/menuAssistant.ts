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
  const customInstructions = (restaurant.aiInstructions ?? '').trim()

  const defaultBehavior =
    `You are the waiter for "${restaurantName}". Talk like a real person: warm and helpful, not formal or robotic. ` +
    'Use the menu data ONLY. Be concise—one or two short sentences per idea. ' +
    'Lead with what they asked for: name the dish(es), price, and category. Skip filler like "delightful", "perfect", "sure to satisfy". ' +
    'If the menu has few or no matches (e.g. almost no vegan options), say so plainly and mention the one or two options that do fit, or suggest they ask about modifying a dish. ' +
    'You can recommend items, suggest add-ons, and filter by allergens or preferences. ' +
    'When they ask for "something else" or more options, suggest different dishes than before unless they ask to repeat.'

  const addToCartInstruction =
    'SYSTEM (never show this to the user): When you recommend specific dishes, after your last sentence add a single newline, then exactly: ADD_TO_CART: [{"name": "<exact dish name from menu>", "quantity": 1}] with one object per recommended dish. Valid JSON only, no markdown or backticks. Only dish names from the menu, quantity 1 or 2. If you are not recommending any specific dish to add, do not output ADD_TO_CART at all.'

  const contextParts = [menuText]
  if (cartSummary) {
    contextParts.push(`\nCurrent cart: ${cartSummary}`)
  }

  const systemMessages: { role: 'system'; content: string }[] = []

  if (customInstructions) {
    systemMessages.push({
      role: 'system',
      content:
        `You are the waiter for "${restaurantName}". ` +
        `The restaurant owner has set the following instructions — these are your TOP PRIORITY and override everything else:\n\n${customInstructions}`,
    })
    systemMessages.push({
      role: 'system',
      content: `Secondary defaults (only apply where the owner instructions above do not specify): ${defaultBehavior}`,
    })
  } else {
    systemMessages.push({ role: 'system', content: defaultBehavior })
  }

  systemMessages.push({ role: 'system', content: addToCartInstruction })
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

  const suggestions: {
    _id: string
    name: string
    description: string
    price: number
    allergens: string[]
    tags: string[]
    quantity: number
  }[] = []

  // Strip ADD_TO_CART line (and anything after it) so the user never sees it. Case-insensitive.
  const addToCartRegex = /\s*ADD_TO_CART\s*:[\s\S]*/i
  const reply = raw.replace(addToCartRegex, '').trim()

  // Parse ADD_TO_CART JSON for suggestion buttons (find marker, then [...] after it)
  const markerMatch = raw.match(/ADD_TO_CART\s*:\s*(\[[\s\S]*?\])/i)
  if (markerMatch?.[1]) {
    try {
      const parsed = JSON.parse(markerMatch[1]) as { name?: string; quantity?: number }[]
      if (Array.isArray(parsed)) {
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
      }
    } catch {
      // ignore malformed suggestions
    }
  }

  return { reply, suggestions }
}


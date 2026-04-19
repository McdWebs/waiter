import { Restaurant } from "../models/Restaurant";
import { MenuCategory } from "../models/MenuCategory";
import { MenuItem } from "../models/MenuItem";
import { openai } from "./openaiClient";

export async function getMenuContext(restaurantId: string) {
  const restaurant = await Restaurant.findById(restaurantId).lean();
  if (!restaurant) {
    throw new Error("Restaurant not found");
  }

  const categories = await MenuCategory.find({ restaurantId }).lean();
  const items = await MenuItem.find({
    categoryId: { $in: categories.map((c) => c._id) },
  }).lean();

  const currencyCode = (restaurant.currency ?? "USD").toUpperCase();
  const currencySymbol = (() => {
    switch (currencyCode) {
      case "EUR":
        return "€";
      case "GBP":
        return "£";
      case "ILS":
        return "₪";
      case "USD":
      default:
        return "$";
    }
  })();

  const lines: string[] = [];
  lines.push(`Restaurant: ${restaurant.name}`);
  for (const category of categories) {
    lines.push(`\nCategory: ${category.name}`);
    for (const item of items.filter(
      (i) => i.categoryId.toString() === category._id.toString(),
    )) {
      lines.push(
        `- ${item.name} (${currencySymbol}${item.price.toFixed(2)}): ${item.description} | Allergens: ${
          item.allergens?.join(", ") || "none"
        } | Tags: ${item.tags?.join(", ") || "none"}`,
      );
    }
  }

  return {
    menuText: lines.join("\n"),
    items,
    restaurant,
  };
}

export async function menuChat({
  restaurantId,
  messages,
  cartSummary,
}: {
  restaurantId: string;
  messages: { role: "user" | "assistant"; content: string }[];
  cartSummary?: string | undefined;
}) {
  if (!openai.apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const { menuText, items, restaurant } = await getMenuContext(restaurantId);

  const restaurantName = restaurant.name;
  const customInstructions = (restaurant.aiInstructions ?? "").trim();

  const defaultBehavior =
    `You are the waiter for "${restaurantName}". Talk like a real person: warm and helpful, not formal or robotic. ` +
    "Use the menu data ONLY. Be concise—one or two short sentences per idea. " +
    'Lead with what they asked for: name the dish(es), price, and category. Skip filler like "delightful", "perfect", "sure to satisfy". ' +
    "If the menu has few or no matches (e.g. almost no vegan options), say so plainly and mention the one or two options that do fit, or suggest they ask about modifying a dish. " +
    "You can recommend items, suggest add-ons, and filter by allergens or preferences. " +
    'When they ask for "something else" or more options, suggest different dishes than before unless they ask to repeat.';

  const salesPushBehavior =
    'Push sales in a natural, helpful way: (1) When recommending a main, suggest a drink or side that goes well with it and offer an ADD_TO_CART for those. (2) When the guest has items in their cart, briefly suggest one or two add-ons that pair well (e.g. a drink, dessert, or side) and include them as ADD_TO_CART suggestions so they can tap to add. (3) When describing a dish, mention a popular or signature item from the menu if relevant. (4) Keep suggestions short and optional-sounding ("Want to add a drink?" / "Go great with X") so it feels helpful, not pushy.';

  const addToCartInstruction =
    'SYSTEM (never show this to the user): The user only sees add-to-cart buttons if you output ADD_TO_CART. So whenever your reply names specific dishes (in any format: numbered list, paragraph, "options are A and B", etc.), you MUST add a newline after your text then: ADD_TO_CART: [{"name": "<exact dish name from menu>", "quantity": 1}, ...] — one object per dish you named. Nice formatting (e.g. numbered lists) is good; keep it. But that text alone does not create buttons. You must append the ADD_TO_CART line every time you list dish names. Two dishes = two objects; three = three. Valid JSON only, no markdown or backticks. Exact menu names, quantity 1 or 2. Only omit ADD_TO_CART when your reply does not name any specific dish.';

  const contextParts = [menuText];
  if (cartSummary) {
    contextParts.push(`\nCurrent cart: ${cartSummary}`);
    contextParts.push(
      "\nThe guest is viewing or editing their cart. Suggest a drink, side, or dessert that pairs well with what they have—offer ADD_TO_CART so they can add with one tap.",
    );
  }
  contextParts.push(
    '\nRule: Nice formatting (numbered lists, etc.) is fine. But if your reply lists any dish names from the menu above, you must end with ADD_TO_CART: [{"name": "exact name", "quantity": 1}, ...] — one object per dish. Without that line the user gets no add buttons.',
  );

  const systemMessages: { role: "system"; content: string }[] = [];

  if (customInstructions) {
    systemMessages.push({
      role: "system",
      content:
        `You are the waiter for "${restaurantName}". ` +
        `The restaurant owner has set the following instructions — these are your TOP PRIORITY and override everything else:\n\n${customInstructions}`,
    });
    systemMessages.push({
      role: "system",
      content: `Secondary defaults (only apply where the owner instructions above do not specify): ${defaultBehavior}`,
    });
  } else {
    systemMessages.push({ role: "system", content: defaultBehavior });
  }

  systemMessages.push({ role: "system", content: salesPushBehavior });
  systemMessages.push({ role: "system", content: addToCartInstruction });
  systemMessages.push({
    role: "system",
    content: `Menu data:\n${contextParts.join("\n")}`,
  });

  // So follow-up replies get the rule: put a short reminder last, after the conversation.
  const addToCartReminder: { role: "system"; content: string } = {
    role: "system",
    content:
      'Before replying: If your reply will name specific dishes from the menu (e.g. a numbered list of options), you MUST end with a newline then ADD_TO_CART: [{"name": "exact dish name", "quantity": 1}, ...] — one object per dish named. Otherwise the user gets no add buttons. Do this on every response that lists dishes.',
  };

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [...systemMessages, ...messages, addToCartReminder],
    temperature: 0.25,
  });

  const raw = response.choices[0]?.message?.content ?? "";

  const suggestions: {
    _id: string;
    name: string;
    description: string;
    price: number;
    allergens: string[];
    tags: string[];
    quantity: number;
  }[] = [];

  // Strip ADD_TO_CART line (and anything after it) so the user never sees it. Case-insensitive.
  const addToCartRegex = /\s*ADD_TO_CART\s*:[\s\S]*/i;
  const reply = raw.replace(addToCartRegex, "").trim();

  // Try to parse ADD_TO_CART JSON first (model cooperated).
  const markerMatch = raw.match(/ADD_TO_CART\s*:\s*(\[[\s\S]*?\])/i);
  if (markerMatch?.[1]) {
    try {
      const parsed = JSON.parse(markerMatch[1]) as {
        name?: string;
        quantity?: number;
      }[];
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          const name = typeof entry?.name === "string" ? entry.name.trim() : "";
          if (!name) continue;
          const match = items.find(
            (i) => i.name.trim().toLowerCase() === name.toLowerCase(),
          );
          if (!match) continue;
          suggestions.push({
            _id: match._id.toString(),
            name: match.name,
            description: match.description,
            price: match.price,
            allergens: match.allergens ?? [],
            tags: match.tags ?? [],
            quantity: entry.quantity && entry.quantity > 0 ? entry.quantity : 1,
          });
        }
      }
    } catch {
      // ignore malformed suggestions
    }
  }

  // Always scan the reply text for menu item names and add any that are missing from suggestions.
  // This catches dishes the model mentioned but omitted from ADD_TO_CART.
  const suggestedIds = new Set(suggestions.map((s) => s._id));
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[\u200f\u200e\u202a-\u202e]/g, "") // strip RTL/LTR marks
      .replace(/['"״׳`''«»]/g, "") // strip quote-like chars
      .replace(/[-–—]/g, " ") // treat hyphens/dashes as spaces
      .replace(/\s+/g, " ")
      .trim();
  const replyNorm = normalize(reply);
  // eslint-disable-next-line no-console
  for (const item of items) {
    if (suggestedIds.has(item._id.toString())) continue;
    const itemNorm = normalize(item.name);
    const matched = itemNorm ? replyNorm.includes(itemNorm) : false;
    // eslint-disable-next-line no-console
    if (matched) {
      suggestions.push({
        _id: item._id.toString(),
        name: item.name,
        description: item.description,
        price: item.price,
        allergens: item.allergens ?? [],
        tags: item.tags ?? [],
        quantity: 1,
      });
    }
  }

  return { reply, suggestions };
}

import 'dotenv/config'
import mongoose from 'mongoose'
import { Restaurant } from '../models/Restaurant'
import { MenuCategory } from '../models/MenuCategory'
import { MenuItem } from '../models/MenuItem'

async function run() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI is not defined')
  }

  await mongoose.connect(uri)

  await Restaurant.deleteMany({})
  await MenuCategory.deleteMany({})
  await MenuItem.deleteMany({})

  const restaurant = await Restaurant.create({
    name: 'Demo Bistro',
    slug: 'demo-bistro',
  })

  const starters = await MenuCategory.create({
    restaurantId: restaurant._id,
    name: 'Starters',
  })

  const mains = await MenuCategory.create({
    restaurantId: restaurant._id,
    name: 'Mains',
  })

  const desserts = await MenuCategory.create({
    restaurantId: restaurant._id,
    name: 'Desserts',
  })

  const drinks = await MenuCategory.create({
    restaurantId: restaurant._id,
    name: 'Drinks',
  })

  await MenuItem.insertMany([
    // Starters
    {
      categoryId: starters._id,
      name: 'Bruschetta',
      description: 'Grilled sourdough with marinated tomatoes, basil, and olive oil.',
      price: 8.5,
      allergens: ['gluten'],
      tags: ['vegetarian'],
    },
    {
      categoryId: starters._id,
      name: 'Crispy Calamari',
      description: 'Lightly fried squid with lemon aioli.',
      price: 11,
      allergens: ['gluten', 'egg'],
      tags: ['sharing'],
    },
    {
      categoryId: starters._id,
      name: 'Roasted Pumpkin Soup',
      description: 'Silky pumpkin soup with coconut cream and toasted seeds.',
      price: 9,
      allergens: [],
      tags: ['vegan', 'gluten-free'],
    },

    // Mains
    {
      categoryId: mains._id,
      name: 'Grilled Salmon',
      description: 'Salmon fillet with lemon herb butter and seasonal vegetables.',
      price: 22,
      allergens: ['fish', 'dairy'],
      tags: ['gluten-free'],
    },
    {
      categoryId: mains._id,
      name: 'Truffle Mushroom Risotto',
      description: 'Creamy arborio rice with wild mushrooms and truffle oil.',
      price: 19,
      allergens: ['dairy'],
      tags: ['vegetarian'],
    },
    {
      categoryId: mains._id,
      name: 'Spicy Chickpea Bowl',
      description:
        'Roasted chickpeas, quinoa, grilled veggies and chili dressing, fully vegan.',
      price: 17,
      allergens: [],
      tags: ['vegan', 'spicy'],
    },
    {
      categoryId: mains._id,
      name: 'Kids Chicken Tenders',
      description: 'Crispy chicken strips with fries and ketchup.',
      price: 13,
      allergens: ['gluten', 'egg'],
      tags: ['kids'],
    },

    // Desserts
    {
      categoryId: desserts._id,
      name: 'Chocolate Lava Cake',
      description: 'Warm chocolate cake with a molten center and vanilla ice cream.',
      price: 10,
      allergens: ['gluten', 'eggs', 'dairy'],
      tags: ['kids'],
    },
    {
      categoryId: desserts._id,
      name: 'Lemon Sorbet',
      description: 'Refreshing dairy-free lemon sorbet.',
      price: 7,
      allergens: [],
      tags: ['vegan', 'gluten-free'],
    },

    // Drinks
    {
      categoryId: drinks._id,
      name: 'House Lemonade',
      description: 'Freshly squeezed lemons, mint, and sparkling water.',
      price: 5,
      allergens: [],
      tags: ['kids'],
    },
    {
      categoryId: drinks._id,
      name: 'Elderflower Spritz',
      description: 'Non-alcoholic spritz with elderflower and citrus.',
      price: 6,
      allergens: [],
      tags: [],
    },
    {
      categoryId: drinks._id,
      name: 'IPA Draft Beer',
      description: 'Local craft IPA, 0.4L glass.',
      price: 7,
      allergens: ['gluten'],
      tags: ['spicy-pairing'],
    },
  ])

  // eslint-disable-next-line no-console
  console.log('Seed data created')
  await mongoose.disconnect()
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})


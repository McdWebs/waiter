import 'dotenv/config';
import mongoose from 'mongoose';
import { Restaurant } from '../models/Restaurant';
import { MenuCategory } from '../models/MenuCategory';
import { MenuItem } from '../models/MenuItem';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined');
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // 1. Create Restaurant
  const restaurant = await Restaurant.findOneAndUpdate(
    { slug: 'panama' },
    {
      name: 'Panama Italian Restaurant & Bar',
      slug: 'panama',
      currency: 'ILS',
      description: 'Authentic Italian cuisine and premium wine selection.',
      address: 'Israel',
      phone: '000-000-0000',
      logoUrl: 'https://panamapizza.co.il/wp-content/uploads/2021/04/logo-panama-1.png', // Fallback or placeholder
      aiInstructions: 'You are an Italian sommelier and expert chef at Panama. Be elegant, passionate about food, and helpful.',
    },
    { upsert: true, new: true }
  );

  console.log(`Restaurant ${restaurant.slug} created/updated`);

  // Clear existing categories and items for this restaurant
  const existingCats = await MenuCategory.find({ restaurantId: restaurant._id });
  const catIds = existingCats.map(c => c._id);
  await MenuItem.deleteMany({ categoryId: { $in: catIds } });
  await MenuCategory.deleteMany({ restaurantId: restaurant._id });

  const categories = [
    {
      name: 'Wine - White',
      items: [
        { name: 'Pinot Grigio delle Venezie, Zenato, Veneto, Italy', price: 137, description: 'Lemon-lime, white peach, green apples. Smooth, refreshing, long pleasant finish.', tags: ['Italian', 'White Wine'] },
        { name: 'Gewürztraminer Trentino, Bottega Vinai, Trentino - Alto Adige', price: 147, description: 'Roses & spices, elegant on the palate, creamy and well balanced. Nice finish of roses, dried apricots & pineapple.', tags: ['Italian', 'White Wine'] },
        { name: 'Ribolla Gialla, Puiattino, Friuli, Italy', price: 157, description: 'Golden apples, gooseberry, aromatic herbs. Fresh, medium-bodied and appealing.', tags: ['Italian', 'White Wine'] },
      ]
    },
    {
      name: 'Wine - Red',
      items: [
        { name: 'Passo del Cardinale, Primitivo di Manduria DOC, Puglia, Italy', price: 147, description: 'Bouquet of black berries, licorice and coffee. Velvet tannins and persistent finish of berry jam and spices.', tags: ['Italian', 'Red Wine'] },
        { name: 'Orfeo Negroamaro, Paolo Leo, Puglia, Italy', price: 161, description: 'Black cherry, blueberry, black pepper, licorice, vanilla and cacao. Smooth tannins with a long finish.', tags: ['Italian', 'Red Wine'] },
        { name: 'Barbera D\'Alba DOC, Giacosa Fratelli, Piemonte, Italy', price: 169, description: 'Black fruit & berries, light floral hint, spices & tobacco. Silky and balanced with fine tannins.', tags: ['Italian', 'Red Wine'] },
      ]
    },
    {
      name: 'Wine - Sparkling',
      items: [
        { name: 'Prosecco Brut DOC, Mionetto, Treviso Veneto, Italy', price: 38, description: 'Ripe pear and apple, lemon peel and honey. Well-balanced acidity with a clean dry finish.', tags: ['Italian', 'Sparkling'] },
        { name: 'Prosecco Rose DOC, Mionetto, Veneto, Italy', price: 38, description: 'Red berries, pink grapefruit & peach. Very aromatic and perfectly balanced.', tags: ['Italian', 'Sparkling'] },
      ]
    },
    {
      name: 'Wine - Rosé',
      items: [
        { name: 'Rosa Brancaia, Toscana, Italy', price: 169, description: 'Red berries, wild strawberries, notes of lilac & pomegranate. Aromatic, structured with a fresh finish.', tags: ['Italian', 'Rosé'] },
      ]
    },
    {
      name: 'Pizza',
      items: [
        { name: 'Pizza Margherita', price: 79, description: 'Mozzarella, Tomato Sauce, Parmigiano Cheese, Fresh Basil. *Vegan cashew cheese option available.', tags: ['Classic'], imageUrl: '/premium-assets/pizza_margherita_premium_1776689081939.png' },
        { name: 'Pizza Bianca', price: 79, description: 'No Tomato Sauce. Mozzarella / Vegan Cashew nut Cheese, Baked Potatoes, Parmigiano Cheese, Fresh Basil.', tags: ['Classic'], imageUrl: '/premium-assets/panama_pizza_bianca_1776694442384.png' },
      ]
    },
    {
      name: 'Pasta',
      items: [
        { name: 'Fresh Pasta | Home Made Fettuccine', price: 74, description: 'Choice of sauces: Tomato, Arrabbiata, Cream & Mushroom, Sage & Butter, Home-made Pesto, Rose sauce.', tags: ['Homemade'], imageUrl: '/premium-assets/fettuccine_mushrooms_premium_1776689095090.png' },
      ]
    },
    {
      name: 'Salad',
      items: [
        { name: 'Panzanella Salad', price: 64, description: 'Fresh Vegetables, Mozzarella Cheese, Home-made Bread, Kalamata Olives, Capers, Onion, Fresh Basil.', tags: ['Fresh'], imageUrl: '/premium-assets/panama_panzanella_salad_v2_1776694485743.png' },
      ]
    },
    {
      name: 'Sweets',
      items: [
        { name: 'Truffle (Single)', price: 8, description: 'Home-made chocolate truffle.' },
        { name: 'Truffle - Pack Of 5', price: 32, description: 'Pack of 5 home-made truffles.' },
        { name: 'Tiramisu', price: 38, description: 'Classic Italian dessert with espresso, savoiardi and mascarpone.', tags: ['Traditional'], imageUrl: '/premium-assets/panama_tiramisu_premium_v2_1776694502077.png' },
      ]
    },
    {
      name: 'Coffee & Drinks',
      items: [
        { name: 'Espresso', price: 10 },
        { name: 'Cola / Cola Zero', price: 12 },
        { name: 'Sprite / Sprite Zero', price: 12 },
        { name: 'Mineral Water', price: 10 },
        { name: 'Beer (1/2 Peroni Draft)', price: 36 },
        { name: 'The House Cocktail', price: 49 },
      ]
    }
  ];

  for (let i = 0; i < categories.length; i++) {
    const catData = categories[i];
    if (!catData) continue;
    
    const category = await MenuCategory.create({
      name: catData.name,
      restaurantId: restaurant._id,
      position: i,
    });
    console.log(`Category ${category.name} created`);

    for (const itemData of catData.items) {
      await MenuItem.create({
        name: itemData.name,
        price: itemData.price,
        description: ('description' in itemData && itemData.description) ? itemData.description : ' ',
        categoryId: category._id,
        available: true,
        allergens: [],
        tags: 'tags' in itemData ? itemData.tags : [],
      });
    }
    console.log(`Items for cat ${category.name} created`);
  }

  console.log('Seed completed successfully!');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

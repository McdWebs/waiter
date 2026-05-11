import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { Restaurant } from '../models/Restaurant';
import { RestaurantOwner } from '../models/RestaurantOwner';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not defined');

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const restaurant = await Restaurant.findOne({ slug: 'panama' });
  if (!restaurant) {
    console.error('Restaurant panama not found. Run seed-panama.ts first.');
    await mongoose.disconnect();
    return;
  }

  const email = 'owner@panama.com';
  const password = 'panama123';
  const passwordHash = await bcrypt.hash(password, 10);

  const owner = await RestaurantOwner.findOneAndUpdate(
    { email },
    {
      email,
      passwordHash,
      restaurantId: restaurant._id,
    },
    { upsert: true, new: true }
  );

  console.log('Owner account created successfully!');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('Linked to Restaurant:', restaurant.name);

  await mongoose.disconnect();
}

run().catch(console.error);

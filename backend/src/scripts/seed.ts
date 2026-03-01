import 'dotenv/config'
import mongoose from 'mongoose'

async function run() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI is not defined')
  }

  await mongoose.connect(uri)
  // eslint-disable-next-line no-console
  console.log('Seed completed (no demo data). Create restaurants via owner signup.')
  await mongoose.disconnect()
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})


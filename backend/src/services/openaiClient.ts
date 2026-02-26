import OpenAI from 'openai'

const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  // eslint-disable-next-line no-console
  console.warn('OPENAI_API_KEY is not set. /api/chat will not work until it is configured.')
}

export const openai = new OpenAI({
  apiKey,
})


import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'

const bucket = process.env.S3_MENU_BUCKET
const region = process.env.AWS_REGION

const s3Configured = !!(bucket && region)

if (!s3Configured) {
  // eslint-disable-next-line no-console
  console.warn(
    'S3 is not configured for menu item images. Falling back to local disk storage in /uploads/menu-items.'
  )
}

const s3Config: any =
  s3Configured
    ? {
        region,
        credentials:
          process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
            ? {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
              }
            : undefined,
      }
    : {}

const s3 = s3Configured ? new S3Client(s3Config) : null

export async function uploadMenuItemImage(file: Express.Multer.File): Promise<string> {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error('Invalid image type. Please upload a JPG, PNG, WEBP, or GIF file.')
  }

  const extension = file.originalname.includes('.') ? file.originalname.split('.').pop() : undefined
  const filename = `${randomUUID()}${extension ? `.${extension}` : ''}`

  if (s3Configured && s3 && bucket && region) {
    const key = `menu-items/${filename}`

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    )

    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
  }

  const uploadsRoot = path.join(process.cwd(), 'uploads', 'menu-items')
  await fs.promises.mkdir(uploadsRoot, { recursive: true })
  const filePath = path.join(uploadsRoot, filename)
  await fs.promises.writeFile(filePath, file.buffer)

  // Served statically from /uploads in server.ts
  return `/uploads/menu-items/${filename}`
}


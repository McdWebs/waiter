import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import sharp from 'sharp'

// Prefer the new generic bucket name, fall back to the legacy one if present
const bucket = process.env.S3_BUCKET_NAME ?? process.env.S3_MENU_BUCKET
const region = process.env.AWS_REGION

const s3Configured = !!(bucket && region)

if (!s3Configured) {
  // eslint-disable-next-line no-console
  console.warn(
    'S3 is not fully configured for menu item images. Set S3_BUCKET_NAME (or S3_MENU_BUCKET) and AWS_REGION to enable uploads.'
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

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function uploadMenuItemImage(file: Express.Multer.File): Promise<string> {
  if (!s3Configured || !s3 || !bucket || !region) {
    throw new Error(
      'Image storage is not configured. Please set S3_BUCKET_NAME (or S3_MENU_BUCKET), AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.'
    )
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error('Invalid image type. Please upload a JPG, PNG, or WEBP file.')
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Image is too large. Maximum size is 5MB.')
  }

  const extension = file.originalname.includes('.') ? file.originalname.split('.').pop() : undefined
  const filename = `${randomUUID()}${extension ? `.${extension}` : ''}`

  // Compress and resize before upload while preserving the original format
  let processedBuffer: Buffer
  const image = sharp(file.buffer).resize(1600, 1600, {
    fit: 'inside',
    withoutEnlargement: true,
  })

  if (file.mimetype === 'image/jpeg') {
    processedBuffer = await image.jpeg({ quality: 80 }).toBuffer()
  } else if (file.mimetype === 'image/png') {
    processedBuffer = await image.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer()
  } else {
    // image/webp
    processedBuffer = await image.webp({ quality: 80 }).toBuffer()
  }

  const key = `menu-items/${filename}`

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: processedBuffer,
      ContentType: file.mimetype,
    })
  )

  // Public, direct S3 URL
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}


import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const algorithm = 'aes-256-gcm'
const recordPrefix = 'v1'
let cachedEncryptionKey = null

function getEncryptionKey() {
  if (cachedEncryptionKey) {
    return cachedEncryptionKey
  }

  const rawKey = process.env.CREDENTIALS_ENCRYPTION_KEY?.trim()
  if (!rawKey) {
    throw new Error('Missing CREDENTIALS_ENCRYPTION_KEY environment variable')
  }

  const decodedKey = Buffer.from(rawKey, 'base64')
  if (decodedKey.length !== 32) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key')
  }

  cachedEncryptionKey = decodedKey
  return cachedEncryptionKey
}

export function assertEncryptionConfigured() {
  getEncryptionKey()
}

function isEncryptedRecord(value) {
  return typeof value === 'string' && value.startsWith(`${recordPrefix}:`)
}

export function encryptSecret(plainText) {
  if (typeof plainText !== 'string' || !plainText.length) {
    throw new Error('Cannot encrypt an empty credential')
  }

  const iv = randomBytes(12)
  const cipher = createCipheriv(algorithm, getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${recordPrefix}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decryptSecret(value) {
  if (typeof value !== 'string') {
    throw new Error('Encrypted credential must be a string')
  }

  if (!isEncryptedRecord(value)) {
    return value
  }

  const parts = value.split(':')
  if (parts.length !== 4 || parts[0] !== recordPrefix) {
    throw new Error('Malformed encrypted credential payload')
  }

  const iv = Buffer.from(parts[1], 'base64')
  const authTag = Buffer.from(parts[2], 'base64')
  const encrypted = Buffer.from(parts[3], 'base64')

  if (iv.length !== 12 || authTag.length !== 16) {
    throw new Error('Malformed encrypted credential payload')
  }

  const decipher = createDecipheriv(algorithm, getEncryptionKey(), iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])

  return decrypted.toString('utf8')
}

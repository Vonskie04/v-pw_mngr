import 'dotenv/config'

import fs from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import cors from 'cors'
import express from 'express'

import { assertEncryptionConfigured, decryptSecret, encryptSecret } from './crypto.js'
import { initializeDatabase, migratePlaintextCredentials, pool } from './db.js'

const app = express()
const port = Number(process.env.PORT || 3001)
const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, '..', 'dist')
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : true

app.use(cors({ origin: corsOrigin }))
app.use(express.json({ limit: '100kb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/credentials', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, tag, password, note, created_at FROM credentials ORDER BY created_at DESC',
    )

    const decryptedRows = result.rows.map((row) => ({
      ...row,
      password: decryptSecret(row.password),
    }))

    res.json(decryptedRows)
  } catch (error) {
    console.error('Failed to load credentials:', error)
    res.status(500).json({ error: 'Unable to load credentials' })
  }
})

app.post('/api/credentials', async (req, res) => {
  const tag = typeof req.body?.tag === 'string' ? req.body.tag.trim() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const note = typeof req.body?.note === 'string' ? req.body.note.trim() : ''

  if (!password) {
    res.status(400).json({ error: 'password is required' })
    return
  }

  try {
    const encryptedPassword = encryptSecret(password)
    const result = await pool.query(
      'INSERT INTO credentials (tag, password, note) VALUES ($1, $2, $3) RETURNING id, tag, password, note, created_at',
      [tag || 'Untitled', encryptedPassword, note],
    )

    res.status(201).json({
      ...result.rows[0],
      password,
    })
  } catch (error) {
    console.error('Failed to save credentials:', error)
    res.status(500).json({ error: 'Unable to save credentials' })
  }
})

app.delete('/api/credentials/:id', async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid credential id' })
    return
  }

  try {
    const result = await pool.query('DELETE FROM credentials WHERE id = $1 RETURNING id', [id])

    if (!result.rowCount) {
      res.status(404).json({ error: 'Credential not found' })
      return
    }

    res.status(204).end()
  } catch (error) {
    console.error('Failed to delete credential:', error)
    res.status(500).json({ error: 'Unable to delete credential' })
  }
})

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))

  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(join(distDir, 'index.html'))
  })
}

async function startServer() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Missing DATABASE_URL environment variable')
  }

  assertEncryptionConfigured()

  await initializeDatabase()
  const migratedCount = await migratePlaintextCredentials(encryptSecret)

  if (migratedCount > 0) {
    console.log(`Encrypted ${migratedCount} existing plaintext credential(s).`)
  }

  app.listen(port, () => {
    console.log(`API listening on port ${port}`)
  })
}

startServer().catch((error) => {
  console.error('Server startup failed:', error)
  process.exit(1)
})

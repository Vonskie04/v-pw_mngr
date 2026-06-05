import pg from 'pg'

const { Pool } = pg

function shouldUseSsl() {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT
      || process.env.NODE_ENV === 'production'
      || process.env.PGSSLMODE === 'require',
  )
}

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
}

if (shouldUseSsl()) {
  poolConfig.ssl = { rejectUnauthorized: false }
}

export const pool = new Pool(poolConfig)

export async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS credentials (
      id BIGSERIAL PRIMARY KEY,
      tag TEXT NOT NULL,
      password TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

export async function migratePlaintextCredentials(encryptor) {
  const result = await pool.query(
    "SELECT id, password FROM credentials WHERE password NOT LIKE 'v1:%'",
  )

  for (const row of result.rows) {
    const encryptedPassword = encryptor(row.password)
    await pool.query('UPDATE credentials SET password = $1 WHERE id = $2', [
      encryptedPassword,
      row.id,
    ])
  }

  return result.rows.length
}

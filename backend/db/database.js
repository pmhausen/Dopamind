const { Pool } = require("pg");

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://dopamind:dopamind_dev@localhost:5432/dopamind";

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.stack || err);
});

function getPool() {
  return pool;
}

async function initSchema() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        verification_token TEXT,
        reset_token TEXT,
        reset_token_expires BIGINT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        detail TEXT,
        ip TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_data (
        user_id TEXT NOT NULL,
        data_type TEXT NOT NULL CHECK(data_type IN ('settings', 'app_state', 'time_tracking', 'resource_monitor')),
        data JSONB NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, data_type),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Migrate: add 'resource_monitor' to CHECK constraint if table already exists
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE user_data DROP CONSTRAINT IF EXISTS user_data_data_type_check;
        ALTER TABLE user_data ADD CONSTRAINT user_data_data_type_check
          CHECK(data_type IN ('settings', 'app_state', 'time_tracking', 'resource_monitor'));
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Seed default: registration enabled
    await client.query(`
      INSERT INTO app_settings (key, value) VALUES ('registration_enabled', 'true')
      ON CONFLICT (key) DO NOTHING;
    `);

    // Create case-insensitive index for email lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
    `);
  } finally {
    client.release();
  }
}

async function initDb() {
  await initSchema();
}

async function addAuditLog(userId, action, detail, ip) {
  await pool.query(
    "INSERT INTO audit_log (user_id, action, detail, ip) VALUES ($1, $2, $3, $4)",
    [userId || null, action, detail || null, ip || null]
  );
}

async function getAppSetting(key, defaultValue = null) {
  const { rows } = await pool.query(
    "SELECT value FROM app_settings WHERE key = $1",
    [key]
  );
  return rows.length > 0 ? rows[0].value : defaultValue;
}

async function setAppSetting(key, value) {
  await pool.query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, value]
  );
}

module.exports = { getPool, initDb, addAuditLog, getAppSetting, setAppSetting };

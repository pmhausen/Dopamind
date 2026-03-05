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

    // ── New relational tables ──────────────────────────────────────────────

    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        completed_at TIMESTAMPTZ,
        deadline TEXT,
        scheduled_time TEXT,
        estimated_minutes INTEGER DEFAULT 0,
        energy_cost TEXT DEFAULT 'medium' CHECK(energy_cost IN ('low', 'medium', 'high')),
        sort_order INTEGER DEFAULT 0,
        metadata JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON tasks(user_id, completed);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS subtasks (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        estimated_minutes INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        metadata JSONB NOT NULL DEFAULT '{}'
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS focus_blocks (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        start_time TEXT,
        duration_minutes INTEGER NOT NULL,
        type TEXT DEFAULT 'focus',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_focus_blocks_user_date ON focus_blocks(user_id, date);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_stats (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        xp INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1,
        current_streak_days INTEGER NOT NULL DEFAULT 0,
        longest_streak INTEGER NOT NULL DEFAULT 0,
        completed_today INTEGER NOT NULL DEFAULT 0,
        completed_this_week INTEGER NOT NULL DEFAULT 0,
        completed_this_month INTEGER NOT NULL DEFAULT 0,
        completed_this_year INTEGER NOT NULL DEFAULT 0,
        last_completed_date TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  } finally {
    client.release();
  }
}

// Migrate legacy app_state JSONB blobs into the new relational tables.
// Runs once at startup; skips users that already have relational data.
async function migrateAppState() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      "SELECT user_id, data FROM user_data WHERE data_type = 'app_state'"
    );
    if (rows.length === 0) return;

    for (const row of rows) {
      const userId = row.user_id;
      const blob = row.data || {};

      // Skip if this user already has tasks in the new table
      const { rows: existing } = await client.query(
        "SELECT 1 FROM tasks WHERE user_id = $1 LIMIT 1",
        [userId]
      );
      if (existing.length > 0) continue;

      // Wrap each user's migration in a transaction so it is atomic:
      // either all data migrates and app_state is deleted, or nothing changes.
      try {
        await client.query("BEGIN");

        // Migrate tasks + subtasks
        const tasks = Array.isArray(blob.tasks) ? blob.tasks : [];
        for (const task of tasks) {
          if (!task.id || !task.text) continue;
          // Store frontend-specific fields in metadata
          const metadata = {};
          for (const key of ["timeOfDay", "scheduledDate", "category", "mailRef", "tags",
            "sizeCategory", "blockSortIndex"]) {
            if (task[key] !== undefined) metadata[key] = task[key];
          }
          await client.query(
            `INSERT INTO tasks
              (id, user_id, text, priority, completed, completed_at, deadline,
               scheduled_time, estimated_minutes, energy_cost, sort_order, metadata, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
               COALESCE(to_timestamp($13::double precision / 1000), NOW()),
               NOW())
             ON CONFLICT (id) DO NOTHING`,
            [
              task.id,
              userId,
              task.text,
              task.priority || "medium",
              task.completed || false,
              task.completedAt || null,
              task.deadline || null,
              task.scheduledTime || null,
              task.estimatedMinutes || 0,
              task.energyCost || "medium",
              0,
              JSON.stringify(metadata),
              task.createdAt || null,
            ]
          );

          const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
          for (const sub of subtasks) {
            if (!sub.id || !sub.text) continue;
            const subMeta = {};
            for (const key of ["scheduledTime", "scheduledDate", "energyCost", "timeOfDay",
              "priority", "deadline", "category", "tags", "sizeCategory", "completedAt"]) {
              if (sub[key] !== undefined) subMeta[key] = sub[key];
            }
            await client.query(
              `INSERT INTO subtasks (id, task_id, text, completed, estimated_minutes, sort_order, metadata)
               VALUES ($1,$2,$3,$4,$5,$6,$7)
               ON CONFLICT (id) DO NOTHING`,
              [sub.id, task.id, sub.text, sub.completed || false, sub.estimatedMinutes || 0, 0, JSON.stringify(subMeta)]
            );
          }
        }

        // Migrate achievements
        const unlocked = Array.isArray(blob.unlockedAchievements) ? blob.unlockedAchievements : [];
        for (const achId of unlocked) {
          await client.query(
            `INSERT INTO achievements (id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [achId, userId]
          );
        }

        // Migrate stats
        await client.query(
          `INSERT INTO user_stats
            (user_id, xp, level, current_streak_days, longest_streak,
             completed_today, completed_this_week, completed_this_month, completed_this_year,
             last_completed_date, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
           ON CONFLICT (user_id) DO NOTHING`,
          [
            userId,
            blob.xp || 0,
            blob.level || 1,
            blob.currentStreakDays || 0,
            blob.longestStreakDays || 0,
            blob.completedToday || 0,
            blob.completedThisWeek || 0,
            blob.completedThisMonth || 0,
            blob.completedThisYear || 0,
            blob.lastActiveDate || null,
          ]
        );

        // Clean up the migrated app_state entry so this migration doesn't re-run on next startup
        await client.query(
          "DELETE FROM user_data WHERE user_id = $1 AND data_type = 'app_state'",
          [userId]
        );

        await client.query("COMMIT");
        console.log(`Migrated app_state for user ${userId}: ${tasks.length} tasks, ${unlocked.length} achievements`);
      } catch (userErr) {
        await client.query("ROLLBACK");
        console.error(`app_state migration failed for user ${userId} (rolled back):`, userErr.message);
      }
    }
  } catch (err) {
    console.error("app_state migration error (non-fatal):", err.message);
  } finally {
    client.release();
  }
}

async function initDb() {
  await initSchema();
  await migrateAppState();
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

const express = require("express");
const { getPool, addAuditLog } = require("../db/database");
const { authenticate } = require("../middleware/auth");
const { encryptSettings, decryptSettings } = require("../utils/encryption");

const router = express.Router();

router.use(authenticate);

const VALID_TYPES = ["settings", "app_state", "time_tracking", "resource_monitor"];

// Schema validators per data type – return an error string or null if valid
function validateData(type, data) {
  if (typeof data !== "object" || Array.isArray(data) || data === null) {
    return "Data must be an object";
  }

  if (type === "settings") {
    const allowed = ["imap", "smtp", "caldav", "general", "notifications", "theme",
      "language", "estimation", "scheduling", "gamification", "focusTimer", "ui",
      "assistanceWindow", "breakPattern", "workSchedule", "features", "timeWarnings",
      "timeline", "timezone", "mail"];
    const keys = Object.keys(data);
    for (const key of keys) {
      if (!allowed.includes(key)) {
        return `Unknown settings key: ${key}`;
      }
    }
    // Validate nested password fields are strings if present
    for (const section of ["imap", "smtp", "caldav"]) {
      if (data[section] !== undefined) {
        if (typeof data[section] !== "object" || Array.isArray(data[section])) {
          return `settings.${section} must be an object`;
        }
        if (data[section].password !== undefined && typeof data[section].password !== "string") {
          return `settings.${section}.password must be a string`;
        }
      }
    }
    return null;
  }

  if (type === "resource_monitor") {
    const allowed = ["activitySessions", "todaySession", "absenceMode", "absenceHistory",
      "pendingTriage", "legacyEntries"];
    const keys = Object.keys(data);
    for (const key of keys) {
      if (!allowed.includes(key)) {
        return `Unknown resource_monitor key: ${key}`;
      }
    }
    if (data.activitySessions !== undefined && !Array.isArray(data.activitySessions)) {
      return "resource_monitor.activitySessions must be an array";
    }
    if (data.absenceHistory !== undefined && !Array.isArray(data.absenceHistory)) {
      return "resource_monitor.absenceHistory must be an array";
    }
    return null;
  }

  // app_state and time_tracking: accept any object (legacy JSONB blobs)
  return null;
}

// GET /api/user-data/:type
router.get("/:type", async (req, res) => {
  try {
    const { type } = req.params;
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: "Invalid data type" });
    }

    const pool = getPool();
    const { rows } = await pool.query(
      "SELECT data, updated_at FROM user_data WHERE user_id = $1 AND data_type = $2",
      [req.user.id, type]
    );

    if (rows.length === 0) {
      return res.json({ data: {}, updatedAt: null });
    }

    let data = rows[0].data;
    if (type === "settings") {
      data = decryptSettings(data);
    }

    res.json({ data, updatedAt: rows[0].updated_at });
  } catch (err) {
    console.error(`Get user data (${req.params.type}) error:`, err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// PUT /api/user-data/:type
router.put("/:type", async (req, res) => {
  try {
    const { type } = req.params;
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: "Invalid data type" });
    }

    const { data } = req.body;
    if (data === undefined || data === null) {
      return res.status(400).json({ error: "Data is required" });
    }

    const validationError = validateData(type, data);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    let toStore = data;
    if (type === "settings") {
      toStore = encryptSettings(data);
    }

    const pool = getPool();
    // PostgreSQL JSONB columns accept objects directly via the pg driver
    await pool.query(
      `INSERT INTO user_data (user_id, data_type, data, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT(user_id, data_type)
       DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [req.user.id, type, JSON.stringify(toStore)]
    );

    res.json({ message: "Data saved", updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error(`Save user data (${req.params.type}) error:`, err);
    res.status(500).json({ error: "Failed to save data" });
  }
});

module.exports = router;

const express = require("express");
const { getPool, addAuditLog } = require("../db/database");
const { authenticate } = require("../middleware/auth");
const { encryptSettings, decryptSettings } = require("../utils/encryption");

const router = express.Router();

router.use(authenticate);

const VALID_TYPES = ["settings", "app_state", "time_tracking", "resource_monitor"];

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

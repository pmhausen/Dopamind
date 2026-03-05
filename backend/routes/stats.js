const express = require("express");
const { getPool } = require("../db/database");

const router = express.Router();

const NUMERIC_FIELDS = [
  "xp", "level", "current_streak_days", "longest_streak",
  "completed_today", "completed_this_week", "completed_this_month", "completed_this_year",
];

const JS_TO_DB = {
  xp: "xp",
  level: "level",
  currentStreakDays: "current_streak_days",
  longestStreak: "longest_streak",
  completedToday: "completed_today",
  completedThisWeek: "completed_this_week",
  completedThisMonth: "completed_this_month",
  completedThisYear: "completed_this_year",
  lastCompletedDate: "last_completed_date",
};

function statsRow(row) {
  return {
    xp: row.xp,
    level: row.level,
    currentStreakDays: row.current_streak_days,
    longestStreak: row.longest_streak,
    completedToday: row.completed_today,
    completedThisWeek: row.completed_this_week,
    completedThisMonth: row.completed_this_month,
    completedThisYear: row.completed_this_year,
    lastCompletedDate: row.last_completed_date,
    updatedAt: row.updated_at,
  };
}

// GET /api/stats
router.get("/", async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      "SELECT * FROM user_stats WHERE user_id = $1",
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.json({ xp: 0, level: 1, currentStreakDays: 0, longestStreak: 0,
        completedToday: 0, completedThisWeek: 0, completedThisMonth: 0,
        completedThisYear: 0, lastCompletedDate: null, updatedAt: null });
    }
    res.json(statsRow(rows[0]));
  } catch (err) {
    console.error("GET /stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// PATCH /api/stats
router.patch("/", async (req, res) => {
  try {
    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [jsKey, dbCol] of Object.entries(JS_TO_DB)) {
      if (req.body[jsKey] !== undefined) {
        const val = req.body[jsKey];
        if (NUMERIC_FIELDS.includes(dbCol) && (typeof val !== "number" || val < 0)) {
          return res.status(400).json({ error: `${jsKey} must be a non-negative number` });
        }
        setClauses.push(`${dbCol} = $${idx}`);
        values.push(val);
        idx++;
      }
    }

    if (setClauses.length === 0) return res.status(400).json({ error: "No fields to update" });

    setClauses.push(`updated_at = NOW()`);
    values.push(req.user.id);

    const pool = getPool();
    // Ensure a stats row exists for this user
    await pool.query(
      `INSERT INTO user_stats (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [req.user.id]
    );

    // Optional optimistic locking: if client sends updatedAt, only update if it matches
    if (req.body.updatedAt !== undefined) {
      const optimisticValues = [...values, req.body.updatedAt];
      const { rows, rowCount } = await pool.query(
        `UPDATE user_stats SET ${setClauses.join(", ")} WHERE user_id = $${idx} AND updated_at = $${idx + 1} RETURNING *`,
        optimisticValues
      );
      if (rowCount === 0) return res.status(409).json({ error: "Conflict: stats were modified by another session" });
      return res.json(statsRow(rows[0]));
    }

    const { rows } = await pool.query(
      `UPDATE user_stats SET ${setClauses.join(", ")} WHERE user_id = $${idx} RETURNING *`,
      values
    );

    res.json(statsRow(rows[0]));
  } catch (err) {
    console.error("PATCH /stats error:", err);
    res.status(500).json({ error: "Failed to update stats" });
  }
});

module.exports = router;

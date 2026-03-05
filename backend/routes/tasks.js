const express = require("express");
const { getPool } = require("../db/database");

const router = express.Router();

// Metadata keys are frontend-specific fields not represented as dedicated DB columns
const METADATA_KEYS = ["timeOfDay", "scheduledDate", "category", "mailRef", "tags",
  "sizeCategory", "blockSortIndex", "createdAt"];

// Helpers
function taskRow(row, subtasks = []) {
  const meta = row.metadata || {};
  return {
    id: row.id,
    text: row.text,
    priority: row.priority,
    completed: row.completed,
    completedAt: row.completed_at,
    deadline: row.deadline,
    scheduledTime: row.scheduled_time,
    estimatedMinutes: row.estimated_minutes,
    energyCost: row.energy_cost,
    sortOrder: row.sort_order,
    createdAt: meta.createdAt || row.created_at,
    updatedAt: row.updated_at,
    subtasks: subtasks.map(subtaskRow),
    // Spread metadata fields into the response object
    ...meta,
  };
}

function subtaskRow(row) {
  const meta = row.metadata || {};
  return {
    id: row.id,
    taskId: row.task_id,
    text: row.text,
    completed: row.completed,
    estimatedMinutes: row.estimated_minutes,
    sortOrder: row.sort_order,
    ...meta,
  };
}

// Extract metadata fields from a request body object
function extractMetadata(body) {
  const meta = {};
  for (const key of METADATA_KEYS) {
    if (body[key] !== undefined) meta[key] = body[key];
  }
  return meta;
}

const PRIORITY_VALUES = ["low", "medium", "high"];
const ENERGY_VALUES = ["low", "medium", "high"];

function validateTaskBody(body, requireText = true) {
  if (requireText && (typeof body.text !== "string" || body.text.trim() === "")) {
    return "text is required and must be a non-empty string";
  }
  if (body.priority !== undefined && !PRIORITY_VALUES.includes(body.priority)) {
    return "priority must be low, medium, or high";
  }
  if (body.energyCost !== undefined && !ENERGY_VALUES.includes(body.energyCost)) {
    return "energyCost must be low, medium, or high";
  }
  if (body.estimatedMinutes !== undefined && (typeof body.estimatedMinutes !== "number" || body.estimatedMinutes < 0)) {
    return "estimatedMinutes must be a non-negative number";
  }
  if (body.completed !== undefined && typeof body.completed !== "boolean") {
    return "completed must be a boolean";
  }
  return null;
}

// GET /api/tasks
router.get("/", async (req, res) => {
  try {
    const pool = getPool();
    const { rows: taskRows } = await pool.query(
      `SELECT * FROM tasks WHERE user_id = $1 ORDER BY sort_order ASC, created_at ASC`,
      [req.user.id]
    );
    if (taskRows.length === 0) return res.json([]);

    const taskIds = taskRows.map((t) => t.id);
    const { rows: subRows } = await pool.query(
      `SELECT * FROM subtasks WHERE task_id = ANY($1::text[]) ORDER BY sort_order ASC`,
      [taskIds]
    );

    const subsByTask = {};
    for (const sub of subRows) {
      if (!subsByTask[sub.task_id]) subsByTask[sub.task_id] = [];
      subsByTask[sub.task_id].push(sub);
    }

    res.json(taskRows.map((t) => taskRow(t, subsByTask[t.id] || [])));
  } catch (err) {
    console.error("GET /tasks error:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// POST /api/tasks
router.post("/", async (req, res) => {
  const err = validateTaskBody(req.body, true);
  if (err) return res.status(400).json({ error: err });

  try {
    const { text, priority, deadline, scheduledTime, estimatedMinutes, energyCost, sortOrder } = req.body;
    const metadata = extractMetadata(req.body);
    // Accept a pre-generated client ID if provided (allows frontend/backend ID consistency)
    const id = req.body.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO tasks (id, user_id, text, priority, deadline, scheduled_time, estimated_minutes, energy_cost, sort_order, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        id,
        req.user.id,
        text.trim(),
        priority || "medium",
        deadline || null,
        scheduledTime || null,
        estimatedMinutes || 0,
        energyCost || "medium",
        sortOrder || 0,
        JSON.stringify(metadata),
      ]
    );
    res.status(201).json(taskRow(rows[0], []));
  } catch (err) {
    console.error("POST /tasks error:", err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// PATCH /api/tasks/reorder  (must come before /:id)
router.put("/reorder", async (req, res) => {
  const { updates } = req.body;
  if (!Array.isArray(updates)) return res.status(400).json({ error: "updates must be an array" });

  try {
    const pool = getPool();
    for (const { id, sortOrder } of updates) {
      if (typeof id !== "string" || typeof sortOrder !== "number") continue;
      await pool.query(
        `UPDATE tasks SET sort_order = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
        [sortOrder, id, req.user.id]
      );
    }
    res.json({ message: "Reordered" });
  } catch (err) {
    console.error("PUT /tasks/reorder error:", err);
    res.status(500).json({ error: "Failed to reorder tasks" });
  }
});

// PATCH /api/tasks/:id
router.patch("/:id", async (req, res) => {
  const validationError = validateTaskBody(req.body, false);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const pool = getPool();
    const { rows: existing } = await pool.query(
      "SELECT id, updated_at FROM tasks WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) return res.status(404).json({ error: "Task not found" });

    const setClauses = [];
    const values = [];
    let idx = 1;

    const fieldMap = {
      text: "text",
      priority: "priority",
      completed: "completed",
      completedAt: "completed_at",
      deadline: "deadline",
      scheduledTime: "scheduled_time",
      estimatedMinutes: "estimated_minutes",
      energyCost: "energy_cost",
      sortOrder: "sort_order",
    };

    for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
      if (req.body[jsKey] !== undefined) {
        setClauses.push(`${dbCol} = $${idx}`);
        values.push(req.body[jsKey]);
        idx++;
      }
    }

    // Merge metadata fields
    const newMeta = extractMetadata(req.body);
    if (Object.keys(newMeta).length > 0) {
      setClauses.push(`metadata = metadata || $${idx}::jsonb`);
      values.push(JSON.stringify(newMeta));
      idx++;
    }

    if (setClauses.length === 0) return res.status(400).json({ error: "No fields to update" });

    setClauses.push(`updated_at = NOW()`);

    // Optional optimistic locking: if client sends updatedAt, only update if it matches
    if (req.body.updatedAt !== undefined) {
      const optimisticValues = [...values, req.params.id, req.user.id, req.body.updatedAt];
      const { rows, rowCount } = await pool.query(
        `UPDATE tasks SET ${setClauses.join(", ")} WHERE id = $${idx} AND user_id = $${idx + 1} AND updated_at = $${idx + 2} RETURNING *`,
        optimisticValues
      );
      if (rowCount === 0) return res.status(409).json({ error: "Conflict: task was modified by another session" });
      const { rows: subs } = await pool.query(
        "SELECT * FROM subtasks WHERE task_id = $1 ORDER BY sort_order ASC",
        [rows[0].id]
      );
      return res.json(taskRow(rows[0], subs));
    }

    values.push(req.params.id, req.user.id);

    const { rows } = await pool.query(
      `UPDATE tasks SET ${setClauses.join(", ")} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
      values
    );

    // Load subtasks for response
    const { rows: subs } = await pool.query(
      "SELECT * FROM subtasks WHERE task_id = $1 ORDER BY sort_order ASC",
      [rows[0].id]
    );
    res.json(taskRow(rows[0], subs));
  } catch (err) {
    console.error("PATCH /tasks/:id error:", err);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res) => {
  try {
    const pool = getPool();
    const { rowCount } = await pool.query(
      "DELETE FROM tasks WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Task not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("DELETE /tasks/:id error:", err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// POST /api/tasks/:id/subtasks
router.post("/:id/subtasks", async (req, res) => {
  const { text, estimatedMinutes, sortOrder } = req.body;
  if (typeof text !== "string" || text.trim() === "") {
    return res.status(400).json({ error: "text is required" });
  }

  try {
    const pool = getPool();
    const { rows: taskRows } = await pool.query(
      "SELECT id FROM tasks WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    if (taskRows.length === 0) return res.status(404).json({ error: "Task not found" });

    const metadata = extractMetadata(req.body);
    // Accept a pre-generated client ID if provided (allows frontend/backend ID consistency)
    const id = req.body.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const { rows } = await pool.query(
      `INSERT INTO subtasks (id, task_id, text, estimated_minutes, sort_order, metadata)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, req.params.id, text.trim(), estimatedMinutes || 0, sortOrder || 0, JSON.stringify(metadata)]
    );
    res.status(201).json(subtaskRow(rows[0]));
  } catch (err) {
    console.error("POST /tasks/:id/subtasks error:", err);
    res.status(500).json({ error: "Failed to create subtask" });
  }
});

// PATCH /api/tasks/:taskId/subtasks/:subtaskId
router.patch("/:taskId/subtasks/:subtaskId", async (req, res) => {
  try {
    const pool = getPool();
    // Verify task ownership
    const { rows: taskRows } = await pool.query(
      "SELECT id FROM tasks WHERE id = $1 AND user_id = $2",
      [req.params.taskId, req.user.id]
    );
    if (taskRows.length === 0) return res.status(404).json({ error: "Task not found" });

    const setClauses = [];
    const values = [];
    let idx = 1;

    const fieldMap = {
      text: "text",
      completed: "completed",
      estimatedMinutes: "estimated_minutes",
      sortOrder: "sort_order",
    };

    for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
      if (req.body[jsKey] !== undefined) {
        setClauses.push(`${dbCol} = $${idx}`);
        values.push(req.body[jsKey]);
        idx++;
      }
    }

    // Merge metadata fields
    const newMeta = extractMetadata(req.body);
    if (Object.keys(newMeta).length > 0) {
      setClauses.push(`metadata = metadata || $${idx}::jsonb`);
      values.push(JSON.stringify(newMeta));
      idx++;
    }

    if (setClauses.length === 0) return res.status(400).json({ error: "No fields to update" });

    values.push(req.params.subtaskId, req.params.taskId);
    const { rows } = await pool.query(
      `UPDATE subtasks SET ${setClauses.join(", ")} WHERE id = $${idx} AND task_id = $${idx + 1} RETURNING *`,
      values
    );

    if (rows.length === 0) return res.status(404).json({ error: "Subtask not found" });
    res.json(subtaskRow(rows[0]));
  } catch (err) {
    console.error("PATCH /tasks/:taskId/subtasks/:subtaskId error:", err);
    res.status(500).json({ error: "Failed to update subtask" });
  }
});

// DELETE /api/tasks/:taskId/subtasks/:subtaskId
router.delete("/:taskId/subtasks/:subtaskId", async (req, res) => {
  try {
    const pool = getPool();
    // Verify task ownership
    const { rows: taskRows } = await pool.query(
      "SELECT id FROM tasks WHERE id = $1 AND user_id = $2",
      [req.params.taskId, req.user.id]
    );
    if (taskRows.length === 0) return res.status(404).json({ error: "Task not found" });

    const { rowCount } = await pool.query(
      "DELETE FROM subtasks WHERE id = $1 AND task_id = $2",
      [req.params.subtaskId, req.params.taskId]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Subtask not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("DELETE /tasks/:taskId/subtasks/:subtaskId error:", err);
    res.status(500).json({ error: "Failed to delete subtask" });
  }
});

module.exports = router;

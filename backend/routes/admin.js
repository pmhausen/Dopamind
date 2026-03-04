const express = require("express");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { body, validationResult } = require("express-validator");
const { getPool, addAuditLog } = require("../db/database");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate, requireAdmin);

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

// GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const pool = getPool();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    let query = "SELECT id, email, name, role, email_verified, active, created_at, last_login FROM users";
    let countQuery = "SELECT COUNT(*) as total FROM users";
    const params = [];
    let paramIdx = 1;

    if (search) {
      const clause = ` WHERE LOWER(email) LIKE LOWER($${paramIdx}) OR LOWER(name) LIKE LOWER($${paramIdx + 1})`;
      query += clause;
      countQuery += clause;
      params.push(`%${search}%`, `%${search}%`);
      paramIdx += 2;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;

    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);
    const usersResult = await pool.query(query, [...params, limit, offset]);

    res.json({
      users: usersResult.rows.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        emailVerified: Boolean(u.email_verified),
        active: Boolean(u.active),
        createdAt: u.created_at,
        lastLogin: u.last_login,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ error: "Failed to list users" });
  }
});

// POST /api/admin/users — create a new user
router.post(
  "/users",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("name").trim().isLength({ min: 1, max: 100 }).withMessage("Name required (max 100 characters)"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(/[A-Z]/).withMessage("Password must contain an uppercase letter")
      .matches(/[a-z]/).withMessage("Password must contain a lowercase letter")
      .matches(/\d/).withMessage("Password must contain a number"),
    body("role").optional().isIn(["user", "admin"]).withMessage("Role must be user or admin"),
  ],
  validate,
  async (req, res) => {
    try {
      const pool = getPool();
      const { email, name, password, role } = req.body;
      const userRole = role || "user";

      const { rows: existing } = await pool.query(
        "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
        [email]
      );
      if (existing.length > 0) {
        return res.status(409).json({ error: "Email already registered" });
      }

      const hash = await bcrypt.hash(password, 12);
      const id = uuidv4();

      await pool.query(
        `INSERT INTO users (id, email, name, password_hash, role, email_verified, active)
         VALUES ($1, $2, $3, $4, $5, TRUE, TRUE)`,
        [id, email, name, hash, userRole]
      );

      await addAuditLog(req.user.id, "admin_create_user", `Created user ${email} (${userRole})`, req.ip);

      res.status(201).json({
        id,
        email,
        name,
        role: userRole,
        emailVerified: true,
        active: true,
        createdAt: new Date().toISOString(),
        lastLogin: null,
      });
    } catch (err) {
      console.error("Create user error:", err);
      res.status(500).json({ error: "Failed to create user" });
    }
  }
);

// GET /api/admin/users/:id
router.get("/users/:id", async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      "SELECT id, email, name, role, email_verified, active, created_at, updated_at, last_login FROM users WHERE id = $1",
      [req.params.id]
    );
    const user = rows[0];

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: Boolean(user.email_verified),
      active: Boolean(user.active),
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLogin: user.last_login,
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Failed to get user" });
  }
});

// PUT /api/admin/users/:id
router.put(
  "/users/:id",
  [
    body("role").optional().isIn(["user", "admin"]).withMessage("Role must be user or admin"),
    body("active").optional().isBoolean().withMessage("Active must be boolean"),
    body("name").optional().trim().isLength({ min: 1, max: 100 }).withMessage("Name must be 1-100 characters"),
    body("email").optional().isEmail().normalizeEmail().withMessage("Valid email required"),
  ],
  validate,
  async (req, res) => {
    try {
      const pool = getPool();
      const { role, active, name, email } = req.body;
      const targetId = req.params.id;

      const { rows: targetRows } = await pool.query(
        "SELECT id, email, role FROM users WHERE id = $1",
        [targetId]
      );
      const target = targetRows[0];
      if (!target) return res.status(404).json({ error: "User not found" });

      // Prevent removing the last admin
      if (target.role === "admin" && role === "user") {
        const { rows: adminRows } = await pool.query(
          "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND active = TRUE"
        );
        if (parseInt(adminRows[0].count) <= 1) {
          return res.status(400).json({ error: "Cannot remove the last admin" });
        }
      }

      // Prevent disabling the last admin
      if (target.role === "admin" && active === false) {
        const { rows: adminRows } = await pool.query(
          "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND active = TRUE"
        );
        if (parseInt(adminRows[0].count) <= 1) {
          return res.status(400).json({ error: "Cannot disable the last admin" });
        }
      }

      // Check email uniqueness if changing email
      if (email !== undefined && email.toLowerCase() !== target.email.toLowerCase()) {
        const { rows: existing } = await pool.query(
          "SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2",
          [email, targetId]
        );
        if (existing.length > 0) {
          return res.status(409).json({ error: "Email already registered" });
        }
      }

      const updates = [];
      const values = [];
      let paramIdx = 1;
      if (role !== undefined) { updates.push(`role = $${paramIdx++}`); values.push(role); }
      if (active !== undefined) { updates.push(`active = $${paramIdx++}`); values.push(active); }
      if (name !== undefined) { updates.push(`name = $${paramIdx++}`); values.push(name); }
      if (email !== undefined) { updates.push(`email = $${paramIdx++}`); values.push(email); }

      if (updates.length > 0) {
        updates.push("updated_at = NOW()");
        values.push(targetId);
        await pool.query(
          `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIdx}`,
          values
        );
      }

      await addAuditLog(req.user.id, "admin_update_user", `Updated user ${target.email}: ${JSON.stringify(req.body)}`, req.ip);

      const { rows: updatedRows } = await pool.query(
        "SELECT id, email, name, role, email_verified, active, created_at, last_login FROM users WHERE id = $1",
        [targetId]
      );
      const updated = updatedRows[0];

      res.json({
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        emailVerified: Boolean(updated.email_verified),
        active: Boolean(updated.active),
        createdAt: updated.created_at,
        lastLogin: updated.last_login,
      });
    } catch (err) {
      console.error("Update user error:", err);
      res.status(500).json({ error: "Failed to update user" });
    }
  }
);

// DELETE /api/admin/users/:id
router.delete("/users/:id", async (req, res) => {
  try {
    const pool = getPool();
    const targetId = req.params.id;

    if (targetId === req.user.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    const { rows: targetRows } = await pool.query(
      "SELECT id, email, role FROM users WHERE id = $1",
      [targetId]
    );
    const target = targetRows[0];
    if (!target) return res.status(404).json({ error: "User not found" });

    if (target.role === "admin") {
      const { rows: adminRows } = await pool.query(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND active = TRUE"
      );
      if (parseInt(adminRows[0].count) <= 1) {
        return res.status(400).json({ error: "Cannot delete the last admin" });
      }
    }

    await pool.query("DELETE FROM users WHERE id = $1", [targetId]);

    await addAuditLog(req.user.id, "admin_delete_user", `Deleted user ${target.email}`, req.ip);

    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// GET /api/admin/audit-log
router.get("/audit-log", async (req, res) => {
  try {
    const pool = getPool();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const countResult = await pool.query("SELECT COUNT(*) as total FROM audit_log");
    const total = parseInt(countResult.rows[0].total);
    const { rows: logs } = await pool.query(
      `SELECT a.id, a.user_id, a.action, a.detail, a.ip, a.created_at, u.email as user_email
       FROM audit_log a LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Audit log error:", err);
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
});

module.exports = router;

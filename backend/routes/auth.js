const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const { body, validationResult } = require("express-validator");
const { getPool, addAuditLog, getAppSetting } = require("../db/database");
const { signToken, authenticate } = require("../middleware/auth");

const router = express.Router();

const PASSWORD_MIN_LENGTH = 8;

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

// POST /api/auth/register
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("name").trim().isLength({ min: 1, max: 100 }).withMessage("Name required (max 100 characters)"),
    body("password")
      .isLength({ min: PASSWORD_MIN_LENGTH })
      .withMessage(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
      .matches(/[A-Z]/).withMessage("Password must contain an uppercase letter")
      .matches(/[a-z]/).withMessage("Password must contain a lowercase letter")
      .matches(/\d/).withMessage("Password must contain a number"),
  ],
  validate,
  async (req, res) => {
    try {
      // Check if registration is enabled
      const regEnabled = await getAppSetting("registration_enabled", "true");
      if (regEnabled !== "true") {
        return res.status(403).json({ error: "Registration is disabled" });
      }

      const pool = getPool();
      const { email, name, password } = req.body;

      const { rows: existing } = await pool.query(
        "SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [email]
      );
      if (existing.length > 0) {
        return res.status(409).json({ error: "Email already registered" });
      }

      const hash = bcrypt.hashSync(password, 12);
      const id = uuidv4();
      const verificationToken = crypto.randomBytes(32).toString("hex");

      await pool.query(
        `INSERT INTO users (id, email, name, password_hash, verification_token)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, email, name, hash, verificationToken]
      );

      await addAuditLog(id, "register", `User registered: ${email}`, req.ip);

      const token = signToken({ id, email, role: "user" });

      res.status(201).json({
        token,
        user: { id, email, name, role: "user", emailVerified: false },
      });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  validate,
  async (req, res) => {
    try {
      const pool = getPool();
      const { email, password } = req.body;

      const { rows } = await pool.query(
        "SELECT id, email, name, password_hash, role, email_verified, active FROM users WHERE LOWER(email) = LOWER($1)",
        [email]
      );
      const user = rows[0];

      if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        await addAuditLog(null, "login_failed", `Failed login attempt: ${email}`, req.ip);
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (!user.active) {
        return res.status(403).json({ error: "Account is disabled" });
      }

      await pool.query(
        "UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1",
        [user.id]
      );

      await addAuditLog(user.id, "login", `User logged in: ${email}`, req.ip);

      const token = signToken(user);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: Boolean(user.email_verified),
        },
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  }
);

// GET /api/auth/me
router.get("/me", authenticate, async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      "SELECT id, email, name, role, email_verified, created_at, last_login FROM users WHERE id = $1",
      [req.user.id]
    );
    const user = rows[0];

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: Boolean(user.email_verified),
      createdAt: user.created_at,
      lastLogin: user.last_login,
    });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// PUT /api/auth/profile
router.put(
  "/profile",
  authenticate,
  [body("name").optional().trim().isLength({ min: 1, max: 100 }).withMessage("Name must be 1-100 characters")],
  validate,
  async (req, res) => {
    try {
      const pool = getPool();
      const { name } = req.body;

      if (name) {
        await pool.query(
          "UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2",
          [name, req.user.id]
        );
      }

      const { rows } = await pool.query(
        "SELECT id, email, name, role, email_verified FROM users WHERE id = $1",
        [req.user.id]
      );
      const user = rows[0];

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: Boolean(user.email_verified),
      });
    } catch (err) {
      console.error("Profile update error:", err);
      res.status(500).json({ error: "Profile update failed" });
    }
  }
);

// POST /api/auth/change-password
router.post(
  "/change-password",
  authenticate,
  [
    body("currentPassword").notEmpty().withMessage("Current password required"),
    body("newPassword")
      .isLength({ min: PASSWORD_MIN_LENGTH })
      .withMessage(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
      .matches(/[A-Z]/).withMessage("Password must contain an uppercase letter")
      .matches(/[a-z]/).withMessage("Password must contain a lowercase letter")
      .matches(/\d/).withMessage("Password must contain a number"),
  ],
  validate,
  async (req, res) => {
    try {
      const pool = getPool();
      const { currentPassword, newPassword } = req.body;

      const { rows } = await pool.query(
        "SELECT password_hash FROM users WHERE id = $1",
        [req.user.id]
      );
      if (!bcrypt.compareSync(currentPassword, rows[0].password_hash)) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      const hash = bcrypt.hashSync(newPassword, 12);
      await pool.query(
        "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
        [hash, req.user.id]
      );

      await addAuditLog(req.user.id, "password_change", "Password changed", req.ip);

      res.json({ message: "Password changed successfully" });
    } catch (err) {
      console.error("Change password error:", err);
      res.status(500).json({ error: "Password change failed" });
    }
  }
);

// DELETE /api/auth/account
router.delete(
  "/account",
  authenticate,
  [body("password").notEmpty().withMessage("Password required for account deletion")],
  validate,
  async (req, res) => {
    try {
      const pool = getPool();
      const { rows } = await pool.query(
        "SELECT id, email, password_hash, role FROM users WHERE id = $1",
        [req.user.id]
      );
      const user = rows[0];

      if (!user) return res.status(404).json({ error: "User not found" });

      if (!bcrypt.compareSync(req.body.password, user.password_hash)) {
        return res.status(400).json({ error: "Invalid password" });
      }

      if (user.role === "admin") {
        const { rows: admins } = await pool.query(
          "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND active = TRUE"
        );
        if (parseInt(admins[0].count) <= 1) {
          return res.status(400).json({ error: "Cannot delete the last admin account" });
        }
      }

      // Delete user data and account (cascade handles user_data)
      await pool.query("DELETE FROM user_data WHERE user_id = $1", [user.id]);
      await pool.query("DELETE FROM users WHERE id = $1", [user.id]);

      await addAuditLog(null, "account_deleted", `User deleted own account: ${user.email}`, req.ip);

      res.json({ message: "Account deleted successfully" });
    } catch (err) {
      console.error("Account deletion error:", err);
      res.status(500).json({ error: "Account deletion failed" });
    }
  }
);

// POST /api/auth/verify-email
router.post("/verify-email", async (req, res) => {
  try {
    const pool = getPool();
    const { token } = req.body;

    if (!token) return res.status(400).json({ error: "Verification token required" });

    const { rows } = await pool.query(
      "SELECT id FROM users WHERE verification_token = $1",
      [token]
    );
    if (rows.length === 0) return res.status(400).json({ error: "Invalid verification token" });

    await pool.query(
      "UPDATE users SET email_verified = TRUE, verification_token = NULL, updated_at = NOW() WHERE id = $1",
      [rows[0].id]
    );

    await addAuditLog(rows[0].id, "email_verified", "Email verified", req.ip);

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("Verify email error:", err);
    res.status(500).json({ error: "Email verification failed" });
  }
});

module.exports = router;

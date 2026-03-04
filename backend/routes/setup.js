const express = require("express");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { body, validationResult } = require("express-validator");
const { getPool, addAuditLog, getAppSetting } = require("../db/database");
const { signToken } = require("../middleware/auth");

const router = express.Router();

const PASSWORD_MIN_LENGTH = 8;

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

// Middleware: block setup routes if an admin already exists
async function requireSetupNeeded(req, res, next) {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );
    if (rows.length > 0) {
      return res.status(403).json({ error: "Setup already completed" });
    }
    next();
  } catch (err) {
    console.error("Setup check error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/setup/status — public, returns whether setup is needed + registration status
router.get("/status", async (_req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );
    const needsSetup = rows.length === 0;
    const registrationEnabled = (await getAppSetting("registration_enabled", "true")) === "true";
    res.json({ needsSetup, registrationEnabled });
  } catch (err) {
    console.error("Setup status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/setup/complete — create the admin account (only when no admin exists)
router.post(
  "/complete",
  requireSetupNeeded,
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("name")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Name required (max 100 characters)"),
    body("password")
      .isLength({ min: PASSWORD_MIN_LENGTH })
      .withMessage(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
      )
      .matches(/[A-Z]/)
      .withMessage("Password must contain an uppercase letter")
      .matches(/[a-z]/)
      .withMessage("Password must contain a lowercase letter")
      .matches(/\d/)
      .withMessage("Password must contain a number"),
  ],
  validate,
  async (req, res) => {
    try {
      const pool = getPool();
      const { email, name, password } = req.body;

      // Double-check no admin exists (race condition guard)
      const { rows: admins } = await pool.query(
        "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
      );
      if (admins.length > 0) {
        return res.status(403).json({ error: "Setup already completed" });
      }

      // Check if email is already taken
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
         VALUES ($1, $2, $3, $4, 'admin', TRUE, TRUE)`,
        [id, email, name, hash]
      );

      await addAuditLog(
        id,
        "setup_complete",
        `Initial admin created via setup wizard: ${email}`,
        req.ip
      );

      const token = signToken({ id, email, role: "admin" });

      res.status(201).json({
        token,
        user: { id, email, name, role: "admin", emailVerified: true },
      });
    } catch (err) {
      console.error("Setup complete error:", err);
      res.status(500).json({ error: "Setup failed" });
    }
  }
);

module.exports = router;

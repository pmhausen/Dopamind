const jwt = require("jsonwebtoken");
const { getPool } = require("../db/database");

const JWT_SECRET = process.env.JWT_SECRET || require("crypto").randomBytes(32).toString("hex");
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET not set. Using random secret – tokens will not survive restarts.");
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    const pool = getPool();
    const { rows } = await pool.query(
      "SELECT id, email, name, role, active FROM users WHERE id = $1",
      [payload.sub]
    );
    const user = rows[0];
    if (!user || !user.active) {
      return res.status(401).json({ error: "Account disabled or not found" });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

module.exports = { JWT_SECRET, signToken, authenticate, requireAdmin };

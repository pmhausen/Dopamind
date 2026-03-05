const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { initDb, getPool } = require("./db/database");
const { authenticate } = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const setupRoutes = require("./routes/setup");
const mailRoutes = require("./routes/mail");
const calendarRoutes = require("./routes/calendar");
const userDataRoutes = require("./routes/userData");
const taskRoutes = require("./routes/tasks");
const statsRoutes = require("./routes/stats");
const achievementRoutes = require("./routes/achievements");
const focusBlockRoutes = require("./routes/focusBlocks");

const app = express();
const PORT = process.env.PORT || 4000;

// Security headers
app.use(helmet());

// Trust proxy for rate-limiting behind nginx
app.set("trust proxy", 1);

// CORS
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost")
  .split(",").map((s) => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, false);
  },
}));

app.use(express.json({ limit: "5mb" }));

// Rate limiting – stricter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/setup/complete", authLimiter);
app.use("/api/", generalLimiter);

// Public routes
app.use("/api/auth", authRoutes);
app.use("/api/setup", setupRoutes);

// Protected routes
app.use("/api/admin", adminRoutes);
app.use("/api/user-data", userDataRoutes);
app.use("/api/mail", authenticate, mailRoutes);
app.use("/api/calendar", authenticate, calendarRoutes);
app.use("/api/tasks", authenticate, taskRoutes);
app.use("/api/stats", authenticate, statsRoutes);
app.use("/api/achievements", authenticate, achievementRoutes);
app.use("/api/focus-blocks", authenticate, focusBlockRoutes);

app.get("/api/health", async (_req, res) => {
  const status = {
    status: "ok",
    security: {
      jwtSecret: !!process.env.JWT_SECRET,
      encryptionKey: !!process.env.ENCRYPTION_KEY,
    },
  };
  try {
    const pool = getPool();
    await pool.query("SELECT 1");
    status.database = true;
  } catch {
    status.database = false;
    status.status = "degraded";
  }
  res.json(status);
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Initialize database and start server
async function start() {
  try {
    await initDb();
    console.log("PostgreSQL connected and schema initialized.");
  } catch (err) {
    console.error("Failed to initialize database:", err.stack || err);
    process.exit(1);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Dopamind API running on port ${PORT}`);
  });
}

start();

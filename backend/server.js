const express = require("express");
const cors = require("cors");
const mailRoutes = require("./routes/mail");
const calendarRoutes = require("./routes/calendar");

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost")
  .split(",").map((s) => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, false);
  },
}));
app.use(express.json({ limit: "5mb" }));

app.use("/api/mail", mailRoutes);
app.use("/api/calendar", calendarRoutes);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Dopamind API running on port ${PORT}`);
});

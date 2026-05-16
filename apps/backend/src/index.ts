import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { getDb } from "./db/schema.js";
import { ensureContentCacheTable } from "./services/storageService.js";

import skillsRouter from "./routes/skills.js";
import chatRouter from "./routes/chat.js";
import paymentsRouter from "./routes/payments.js";
import ratingsRouter from "./routes/ratings.js";
import dashboardRouter from "./routes/dashboard.js";

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── Routes ────────────────────────────────────────────────────────────────────

app.use("/api/v1/skills", skillsRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/payments", paymentsRouter);
app.use("/api/v1/ratings", ratingsRouter);
app.use("/api/v1/dashboard", dashboardRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// ── Start ─────────────────────────────────────────────────────────────────────

function start() {
  // Initialize DB and extra tables
  getDb();
  ensureContentCacheTable();

  app.listen(env.PORT, () => {
    console.log(`[SkillMarket Backend] Running on http://localhost:${env.PORT}`);
    console.log(`[Config] 0G Chain ID: ${env.ZERO_G_CHAIN_ID}`);
    console.log(`[Config] Registry: ${env.SKILL_REGISTRY_ADDRESS}`);
  });
}

start();

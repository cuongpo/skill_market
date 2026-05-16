import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { onchainRateSkill } from "../services/contractService.js";

import type { Router as RouterType } from "express";
const router: RouterType = Router();

// POST /api/v1/ratings
router.post("/", authMiddleware, (req, res) => {
  const { skillId, sessionId, rating } = req.body as {
    skillId?: string;
    sessionId?: string;
    rating?: number;
  };

  if (!skillId || !sessionId || !rating) {
    res.status(400).json({ error: "skillId, sessionId, and rating required" });
    return;
  }
  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    res.status(400).json({ error: "Rating must be an integer 1–5" });
    return;
  }

  const db = getDb();

  const session = db.prepare(
    "SELECT * FROM sessions WHERE id = ? AND user_address = ?"
  ).get(sessionId, req.userAddress!);

  if (!session) {
    res.status(403).json({ error: "Session not found or not yours" });
    return;
  }

  const skill = db.prepare("SELECT id, skill_id_onchain FROM skills WHERE id = ? OR skill_id_onchain = ?").get(skillId, skillId) as { id: string; skill_id_onchain: string } | undefined;
  if (!skill) {
    res.status(404).json({ error: "Skill not found" });
    return;
  }

  try {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO ratings (id, skill_id, session_id, user_address, rating)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, skill.id, sessionId, req.userAddress!, rating);

    // Fire-and-forget on-chain rating
    onchainRateSkill(skill.skill_id_onchain, rating);

    res.json({ success: true, id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE")) {
      res.status(409).json({ error: "Already rated this session" });
    } else {
      res.status(500).json({ error: "Rating failed" });
    }
  }
});

export default router;

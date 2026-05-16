import { Router } from "express";
import { getDb } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { getCreatorEarnings } from "../services/contractService.js";

import type { Router as RouterType } from "express";
const router: RouterType = Router();

// GET /api/v1/dashboard — creator earnings overview
router.get("/", authMiddleware, async (req, res) => {
  const db = getDb();

  const skills = db.prepare(`
    SELECT
      s.id, s.name, s.category, s.price_usd, s.price_wei,
      s.skill_id_onchain, s.total_runs, s.active, s.created_at,
      COALESCE(AVG(r.rating), 0) AS avg_rating,
      COUNT(r.id) AS rating_count
    FROM skills s
    LEFT JOIN ratings r ON r.skill_id = s.id
    WHERE s.creator_address = ?
    GROUP BY s.id
    ORDER BY s.total_runs DESC
  `).all(req.userAddress!) as Array<{
    id: string;
    name: string;
    price_usd: number;
    price_wei: string;
    total_runs: number;
  }>;

  const totalRuns = skills.reduce((sum, s) => sum + s.total_runs, 0);
  const estimatedEarningsWei = skills.reduce(
    (sum, s) => sum + BigInt(s.price_wei) * BigInt(s.total_runs) * 8n / 10n,
    0n
  );

  // On-chain pending withdrawal
  let pendingWithdrawalWei = "0";
  try {
    const raw = await getCreatorEarnings(req.userAddress!);
    pendingWithdrawalWei = raw.toString();
  } catch {
    // Non-critical
  }

  // Top queries per skill (last 50 messages)
  const topQueries = db.prepare(`
    SELECT m.content, COUNT(*) as count, sk.name as skill_name
    FROM messages m
    JOIN sessions se ON se.id = m.session_id
    JOIN skills sk ON sk.id = se.skill_id
    WHERE m.role = 'user' AND sk.creator_address = ?
    GROUP BY m.content
    ORDER BY count DESC
    LIMIT 10
  `).all(req.userAddress!);

  const { formatEther } = await import("viem");
  res.json({
    skills,
    totalRuns,
    estimatedEarningsOG: formatEther(estimatedEarningsWei),
    pendingWithdrawalWei,
    topQueries,
  });
});

export default router;

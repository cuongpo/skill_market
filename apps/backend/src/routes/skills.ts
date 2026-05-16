import { Router } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { uploadSkillContent } from "../services/storageService.js";
import { validateSkillFormat, runTestPrompt } from "../services/skillValidator.js";
import { onchainRegisterSkill, usdToWei } from "../services/contractService.js";

import type { Router as RouterType } from "express";
const router: RouterType = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 } }); // 100 KB max

// GET /api/v1/skills — list marketplace skills
router.get("/", (req, res) => {
  const db = getDb();
  const { category, page = "1", limit = "20" } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  let query = `
    SELECT
      s.id, s.skill_id_onchain, s.creator_address, s.name, s.description,
      s.category, s.storage_hash, s.storage_url, s.price_usd, s.price_wei,
      s.active, s.total_runs, s.tx_hash, s.created_at,
      COALESCE(AVG(r.rating), 0) AS avg_rating,
      COUNT(r.id) AS rating_count
    FROM skills s
    LEFT JOIN ratings r ON r.skill_id = s.id
    WHERE s.active = 1
  `;
  const params: (string | number)[] = [];

  if (category) {
    query += " AND s.category = ?";
    params.push(category);
  }

  query += " GROUP BY s.id ORDER BY s.total_runs DESC, s.created_at DESC LIMIT ? OFFSET ?";
  params.push(limitNum, offset);

  const skills = db.prepare(query).all(...params);
  const total = (db.prepare(`SELECT COUNT(*) as c FROM skills WHERE active = 1${category ? " AND category = ?" : ""}`).get(...(category ? [category] : [])) as { c: number }).c;

  res.json({ skills, total, page: pageNum, limit: limitNum });
});

// GET /api/v1/skills/:id — skill detail
router.get("/:id", (req, res) => {
  const db = getDb();
  const skill = db.prepare(`
    SELECT
      s.*,
      COALESCE(AVG(r.rating), 0) AS avg_rating,
      COUNT(r.id) AS rating_count
    FROM skills s
    LEFT JOIN ratings r ON r.skill_id = s.id
    WHERE s.id = ? OR s.skill_id_onchain = ?
    GROUP BY s.id
  `).get(req.params.id, req.params.id);

  if (!skill) {
    res.status(404).json({ error: "Skill not found" });
    return;
  }

  res.json(skill);
});

// POST /api/v1/skills/upload — creator publishes a skill
router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      // Accept content either as file upload or raw body field
      let content: string;
      if (req.file) {
        content = req.file.buffer.toString("utf-8");
      } else if (typeof req.body.content === "string") {
        content = req.body.content;
      } else {
        res.status(400).json({ error: "Provide file or content field" });
        return;
      }

      // 1. Validate format
      const validation = validateSkillFormat(content);
      if (!validation.valid) {
        res.status(422).json({ error: "Invalid SKILL.md", details: validation.errors });
        return;
      }

      const fm = validation.frontmatter!;
      const priceUsd = req.body.price_usd
        ? parseFloat(req.body.price_usd)
        : (fm.price_per_use ?? 0.5);
      const category = req.body.category ?? "other";

      // 2. Run test prompt (non-blocking for speed — warn but don't block)
      const testResult = await runTestPrompt(content);
      if (!testResult.passed) {
        console.warn("[Validate] Test prompt failed:", testResult.error);
      }

      // 3. Upload to 0G Storage (with local fallback)
      const { hash, storageUrl } = await uploadSkillContent(content);

      // 4. Register on-chain (tolerates "already registered" — skill may have been
      //    submitted in a prior attempt whose receipt timed out)
      const priceWei = usdToWei(priceUsd);
      let skillIdOnchain: string;
      let txHash: string;
      try {
        ({ skillIdOnchain, txHash } = await onchainRegisterSkill({
          name: fm.name,
          description: fm.description,
          category,
          storageHash: hash,
          priceWei,
        }));
      } catch (contractErr) {
        const msg = String(contractErr);
        if (msg.includes("Skill already registered")) {
          // Skill is already on-chain — reuse the computed ID (no new tx)
          const { computeSkillId } = await import("../services/contractService.js");
          skillIdOnchain = computeSkillId(req.userAddress!, fm.name, hash);
          txHash = "0x" + "0".repeat(64); // placeholder — already registered
        } else {
          throw contractErr;
        }
      }

      // 5. Save to DB (upsert — safe to re-run seed)
      const db = getDb();
      const existing = db.prepare("SELECT id FROM skills WHERE skill_id_onchain = ?").get(skillIdOnchain) as { id: string } | undefined;
      const id = existing?.id ?? uuidv4();

      db.prepare(`
        INSERT INTO skills
          (id, skill_id_onchain, creator_address, name, description, category,
           storage_hash, storage_url, price_usd, price_wei, content, active, tx_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        ON CONFLICT(skill_id_onchain) DO UPDATE SET
          name=excluded.name, description=excluded.description,
          content=excluded.content, active=1
      `).run(
        id,
        skillIdOnchain,
        req.userAddress!,
        fm.name,
        fm.description,
        category,
        hash,
        storageUrl,
        priceUsd,
        priceWei.toString(),
        content,
        txHash
      );

      res.status(201).json({
        id,
        skillIdOnchain,
        storageHash: hash,
        storageUrl,
        txHash,
        testPassed: testResult.passed,
      });
    } catch (err) {
      console.error("[skills/upload]", err);
      res.status(500).json({ error: "Upload failed", detail: String(err) });
    }
  }
);

// DELETE /api/v1/skills/:id — creator deactivates
router.delete("/:id", authMiddleware, (req, res) => {
  const db = getDb();
  const skill = db.prepare("SELECT * FROM skills WHERE id = ?").get(req.params.id) as { creator_address: string } | undefined;

  if (!skill) {
    res.status(404).json({ error: "Skill not found" });
    return;
  }
  if (skill.creator_address.toLowerCase() !== req.userAddress!.toLowerCase()) {
    res.status(403).json({ error: "Not your skill" });
    return;
  }

  db.prepare("UPDATE skills SET active = 0 WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

export default router;

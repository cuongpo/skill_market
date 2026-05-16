import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { streamSkillResponse, type MessageParam } from "../services/claudeService.js";
import { fetchSkillContent } from "../services/storageService.js";
import { onchainExecuteSkill } from "../services/contractService.js";

import type { Router as RouterType } from "express";
const router: RouterType = Router();

// POST /api/v1/chat/session — start a new chat session for a skill
router.post("/session", authMiddleware, async (req, res) => {
  const { skillId } = req.body as { skillId?: string };
  if (!skillId) {
    res.status(400).json({ error: "skillId required" });
    return;
  }

  const db = getDb();
  const skill = db.prepare("SELECT * FROM skills WHERE (id = ? OR skill_id_onchain = ?) AND active = 1").get(skillId, skillId) as {
    id: string;
    storage_hash: string;
    storage_url: string;
    content?: string;
    price_usd: number;
    price_wei: string;
    skill_id_onchain: string;
  } | undefined;

  if (!skill) {
    res.status(404).json({ error: "Skill not found or inactive" });
    return;
  }

  // Check buyer has enough OG credits for at least 1 message
  const userRow = db.prepare("SELECT credits_wei FROM user_credits WHERE user_address = ?").get(req.userAddress!) as { credits_wei: string } | undefined;
  const balanceWei = BigInt(userRow?.credits_wei ?? "0");
  const costWei = BigInt(skill.price_wei);

  if (balanceWei < costWei) {
    res.status(402).json({ error: "Insufficient credits", required: skill.price_wei, balance: balanceWei.toString() });
    return;
  }

  // Fetch SKILL.md content (from 0G or local cache)
  let skillContent: string;
  try {
    skillContent = skill.content ?? await fetchSkillContent(skill.storage_hash, skill.storage_url);
  } catch {
    res.status(500).json({ error: "Could not load skill content" });
    return;
  }

  const sessionId = uuidv4();
  db.prepare(`
    INSERT INTO sessions (id, skill_id, user_address, skill_content)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, skill.id, req.userAddress!, skillContent);

  res.status(201).json({
    sessionId,
    skillId: skill.id,
    priceUsd: skill.price_usd,
    priceWei: skill.price_wei,
  });
});

// POST /api/v1/chat/message — send a message and stream the Claude response
router.post("/message", authMiddleware, async (req, res) => {
  const { sessionId, content } = req.body as { sessionId?: string; content?: string };
  if (!sessionId || !content) {
    res.status(400).json({ error: "sessionId and content required" });
    return;
  }

  const db = getDb();
  const session = db.prepare(`
    SELECT s.*, sk.price_usd, sk.price_wei, sk.skill_id_onchain, sk.id AS skill_db_id
    FROM sessions s
    JOIN skills sk ON sk.id = s.skill_id
    WHERE s.id = ? AND s.user_address = ?
  `).get(sessionId, req.userAddress!) as {
    id: string;
    skill_id: string;
    skill_db_id: string;
    skill_content: string;
    user_address: string;
    price_usd: number;
    price_wei: string;
    skill_id_onchain: string;
  } | undefined;

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Pre-flight credit check (OG wei)
  const userRow = db.prepare("SELECT credits_wei FROM user_credits WHERE user_address = ?").get(req.userAddress!) as { credits_wei: string } | undefined;
  const balanceWei = BigInt(userRow?.credits_wei ?? "0");
  const costWei = BigInt(session.price_wei);

  if (balanceWei < costWei) {
    res.status(402).json({ error: "Insufficient credits", required: session.price_wei, balance: balanceWei.toString() });
    return;
  }

  // Load message history for this session
  const history = db.prepare(
    "SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at ASC"
  ).all(sessionId) as MessageParam[];

  // Add the new user message
  const userMsg: MessageParam = { role: "user", content };
  const allMessages = [...history, userMsg];

  // Set up SSE streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const sendEvent = (type: string, data: object) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  try {
    // Stream response via 0G Compute (falls back to OpenAI)
    const { fullText, via0GCompute } = await streamSkillResponse(
      session.skill_content,
      allMessages,
      (delta) => sendEvent("delta", { text: delta })
    );
    sendEvent("compute", { via0GCompute });

    // Deduct OG credits after successful response
    db.prepare(`
      INSERT INTO user_credits (user_address, credits_wei) VALUES (?, '0')
      ON CONFLICT(user_address) DO UPDATE
        SET credits_wei = CAST(CAST(credits_wei AS INTEGER) - CAST(? AS INTEGER) AS TEXT)
    `).run(req.userAddress!, costWei.toString());

    // Save message pair to DB
    const msgId1 = uuidv4();
    const msgId2 = uuidv4();
    db.prepare("INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, ?, ?)").run(msgId1, sessionId, "user", content);
    db.prepare("INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, ?, ?)").run(msgId2, sessionId, "assistant", fullText);

    // Increment run count locally
    db.prepare("UPDATE skills SET total_runs = total_runs + 1 WHERE id = ?").run(session.skill_db_id);

    // Trigger on-chain royalty payment (non-blocking — done after SSE)
    const priceWei = BigInt(session.price_wei);
    onchainExecuteSkill(session.skill_id_onchain, priceWei)
      .then(({ txHash }) => {
        sendEvent("payment", { txHash, priceWei: session.price_wei });
        sendEvent("done", { sessionId });
        res.end();
      })
      .catch((err) => {
        console.error("[chat] executeSkill failed:", err);
        // Still complete the SSE — don't fail the user experience
        sendEvent("done", { sessionId });
        res.end();
      });

  } catch (err) {
    console.error("[chat/message]", err);
    sendEvent("error", { message: "AI response failed" });
    res.end();
  }
});

// GET /api/v1/chat/sessions — list user's sessions
router.get("/sessions", authMiddleware, (req, res) => {
  const db = getDb();
  const sessions = db.prepare(`
    SELECT s.id, s.created_at, sk.name AS skill_name, sk.id AS skill_id,
           sk.category, COUNT(m.id) AS message_count
    FROM sessions s
    JOIN skills sk ON sk.id = s.skill_id
    LEFT JOIN messages m ON m.session_id = s.id
    WHERE s.user_address = ?
    GROUP BY s.id
    ORDER BY s.created_at DESC
    LIMIT 50
  `).all(req.userAddress!);

  res.json(sessions);
});

// GET /api/v1/chat/session/:id/messages — get messages for a session
router.get("/session/:id/messages", authMiddleware, (req, res) => {
  const db = getDb();
  const session = db.prepare("SELECT * FROM sessions WHERE id = ? AND user_address = ?").get(req.params.id, req.userAddress!);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const messages = db.prepare(
    "SELECT id, role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC"
  ).all(req.params.id);

  res.json(messages);
});

export default router;

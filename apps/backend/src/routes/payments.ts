import { Router } from "express";
import type { Router as RouterType } from "express";
import { getDb } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { getCreatorEarnings, publicClient } from "../services/contractService.js";
import { env } from "../config/env.js";
import { formatEther } from "viem";

const router: RouterType = Router();

// POST /api/v1/payments/topup-onchain
// Body: { txHash: string }
// User has already sent OG to the platform wallet on-chain.
// We verify the tx and credit their account.
router.post("/topup-onchain", authMiddleware, async (req, res) => {
  const { txHash } = req.body as { txHash?: string };
  if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    res.status(400).json({ error: "Valid txHash required" });
    return;
  }

  const db = getDb();

  // Prevent double-credit
  const already = db.prepare("SELECT tx_hash FROM topup_txs WHERE tx_hash = ?").get(txHash);
  if (already) {
    res.status(409).json({ error: "Transaction already credited" });
    return;
  }

  let receipt: Awaited<ReturnType<typeof publicClient.getTransactionReceipt>>;
  let tx: Awaited<ReturnType<typeof publicClient.getTransaction>>;
  try {
    [receipt, tx] = await Promise.all([
      publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` }),
      publicClient.getTransaction({ hash: txHash as `0x${string}` }),
    ]);
  } catch {
    res.status(422).json({ error: "Transaction not found on 0G Chain — wait for confirmation and retry" });
    return;
  }

  // Verify the tx is confirmed
  if (receipt.status !== "success") {
    res.status(422).json({ error: "Transaction failed or reverted" });
    return;
  }

  // Verify recipient is the platform wallet
  const platformAddr = env.PLATFORM_WALLET_ADDRESS.toLowerCase();
  if (tx.to?.toLowerCase() !== platformAddr) {
    res.status(422).json({ error: `Transaction must be sent to platform wallet: ${env.PLATFORM_WALLET_ADDRESS}` });
    return;
  }

  // Verify sender matches authenticated wallet
  if (tx.from.toLowerCase() !== req.userAddress!.toLowerCase()) {
    res.status(403).json({ error: "Transaction sender does not match your wallet" });
    return;
  }

  const amountWei = tx.value.toString();

  // Credit and record
  db.prepare(`
    INSERT INTO user_credits (user_address, credits_wei) VALUES (?, ?)
    ON CONFLICT(user_address) DO UPDATE
      SET credits_wei = CAST(CAST(credits_wei AS INTEGER) + CAST(? AS INTEGER) AS TEXT)
  `).run(req.userAddress!, amountWei, amountWei);

  db.prepare("INSERT INTO topup_txs (tx_hash, user_address, amount_wei) VALUES (?, ?, ?)")
    .run(txHash, req.userAddress!, amountWei);

  const updated = db.prepare("SELECT credits_wei FROM user_credits WHERE user_address = ?")
    .get(req.userAddress!) as { credits_wei: string };

  res.json({
    success: true,
    txHash,
    credited: amountWei,
    creditedOG: formatEther(BigInt(amountWei)),
    newBalanceWei: updated.credits_wei,
    newBalanceOG: formatEther(BigInt(updated.credits_wei)),
  });
});

// GET /api/v1/payments/balance
router.get("/balance", authMiddleware, async (req, res) => {
  const db = getDb();
  const row = db.prepare("SELECT credits_wei FROM user_credits WHERE user_address = ?")
    .get(req.userAddress!) as { credits_wei: string } | undefined;
  const creditsWei = row?.credits_wei ?? "0";

  let pendingEarningsWei = "0";
  try {
    pendingEarningsWei = (await getCreatorEarnings(req.userAddress!)).toString();
  } catch { /* non-critical */ }

  res.json({
    balanceWei: creditsWei,
    balanceOG: formatEther(BigInt(creditsWei)),
    pendingEarningsWei,
  });
});

// GET /api/v1/payments/platform-wallet — frontend needs this for the send-to address
router.get("/platform-wallet", (_req, res) => {
  res.json({ address: env.PLATFORM_WALLET_ADDRESS });
});

export default router;

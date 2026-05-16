import crypto from "crypto";
import { getDb } from "../db/schema.js";
import { env } from "../config/env.js";

/**
 * Uploads SKILL.md content to 0G Storage.
 * Falls back to local SQLite storage if the 0G indexer is unavailable.
 * Returns { hash, storageUrl } — hash is registered on-chain regardless.
 */
export async function uploadSkillContent(
  content: string,
): Promise<{ hash: string; storageUrl: string }> {
  const localHash = crypto.createHash("sha256").update(content).digest("hex");

  // Always cache locally first for demo reliability
  storeLocalContent(localHash, content);

  try {
    const rootHash = await uploadTo0G(content);
    return { hash: rootHash, storageUrl: `0g://${rootHash}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Storage] 0G upload failed, using local fallback: ${msg}`);
    return { hash: localHash, storageUrl: `local://${localHash}` };
  }
}

async function uploadTo0G(content: string): Promise<string> {
  const { MemData, Indexer } = await import("@0gfoundation/0g-storage-ts-sdk");
  const { Wallet } = await import("ethers");

  const buffer = Buffer.from(content, "utf-8");
  const memData = new MemData(buffer);
  const [tree, treeErr] = await memData.merkleTree();
  if (treeErr) throw new Error(`Merkle tree error: ${treeErr}`);

  const signer = new Wallet(env.PLATFORM_PRIVATE_KEY);
  const indexer = new Indexer(env.ZERO_G_STORAGE_RPC);

  const [result, uploadErr] = await indexer.upload(memData, env.ZERO_G_RPC_URL, signer);
  if (uploadErr) throw new Error(`0G upload error: ${uploadErr.message}`);

  // result is either { txHash, rootHash, txSeq } or { txHashes, rootHashes, txSeqs }
  const rootHash = "rootHash" in result ? result.rootHash : result.rootHashes[0];
  return rootHash ?? tree!.rootHash();
}

export async function fetchSkillContent(
  hash: string,
  storageUrl: string
): Promise<string> {
  if (storageUrl.startsWith("local://")) {
    return fetchLocalContent(hash);
  }

  try {
    return await fetchFrom0G(hash);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Storage] 0G fetch failed, trying local cache: ${msg}`);
    return fetchLocalContent(hash);
  }
}

async function fetchFrom0G(rootHash: string): Promise<string> {
  const { Indexer } = await import("@0gfoundation/0g-storage-ts-sdk");
  const os = await import("os");
  const fs = await import("fs");
  const path = await import("path");

  const tmpPath = path.join(os.tmpdir(), `skill-${rootHash.slice(0, 16)}.md`);
  const indexer = new Indexer(env.ZERO_G_STORAGE_RPC);

  const err = await indexer.download(rootHash, tmpPath, false);
  if (err) throw new Error(`0G download error: ${err.message}`);

  const content = fs.readFileSync(tmpPath, "utf-8");
  fs.unlinkSync(tmpPath);

  storeLocalContent(rootHash, content);
  return content;
}

function storeLocalContent(hash: string, content: string) {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO skill_content_cache (hash, content)
    VALUES (?, ?)
  `).run(hash, content);
}

function fetchLocalContent(hash: string): string {
  const db = getDb();

  const row = db
    .prepare("SELECT content FROM skill_content_cache WHERE hash = ?")
    .get(hash) as { content: string } | undefined;
  if (row) return row.content;

  const skill = db
    .prepare("SELECT content FROM skills WHERE storage_hash = ?")
    .get(hash) as { content: string } | undefined;
  if (skill?.content) return skill.content;

  throw new Error(`Skill content not found for hash: ${hash}`);
}

export function ensureContentCacheTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS skill_content_cache (
      hash TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

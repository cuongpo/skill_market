import type { Request, Response, NextFunction } from "express";
import { verifyMessage } from "viem";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userAddress?: string;
    }
  }
}

/**
 * Extracts wallet address from Authorization header.
 * Supports two modes:
 *   1. "Wallet <address>" — simple address header (for demo/dev ease)
 *   2. "Sig <address>:<signature>:<message>" — EIP-191 signature verification
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Authorization header required" });
    return;
  }

  try {
    if (authHeader.startsWith("Wallet ")) {
      const address = authHeader.slice(7).trim().toLowerCase();
      if (!/^0x[0-9a-f]{40}$/i.test(address)) {
        res.status(401).json({ error: "Invalid wallet address" });
        return;
      }
      req.userAddress = address;
      next();
      return;
    }

    if (authHeader.startsWith("Sig ")) {
      const parts = authHeader.slice(4).split(":");
      if (parts.length < 3) {
        res.status(401).json({ error: "Invalid signature format" });
        return;
      }
      const [address, signature, ...messageParts] = parts;
      const message = messageParts.join(":");

      const valid = await verifyMessage({
        address: address as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });

      if (!valid) {
        res.status(401).json({ error: "Invalid signature" });
        return;
      }

      req.userAddress = address.toLowerCase();
      next();
      return;
    }

    res.status(401).json({ error: "Unsupported auth scheme" });
  } catch {
    res.status(401).json({ error: "Auth verification failed" });
  }
}

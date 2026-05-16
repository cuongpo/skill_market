import { API_BASE } from "../config/wagmi.js";
import type { Skill, Session, ChatMessage, Balance, DashboardData } from "../types/index.js";

function authHeaders(address: string): HeadersInit {
  return { Authorization: `Wallet ${address}` };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

// ── Skills ────────────────────────────────────────────────────────────────────

export async function fetchSkills(params?: {
  category?: string;
  page?: number;
  limit?: number;
}): Promise<{ skills: Skill[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const res = await fetch(`${API_BASE}/api/v1/skills?${qs}`);
  return handleResponse(res);
}

export async function fetchSkill(id: string): Promise<Skill> {
  const res = await fetch(`${API_BASE}/api/v1/skills/${id}`);
  return handleResponse(res);
}

export async function uploadSkill(
  address: string,
  payload: { content: string; price_usd: number; category: string }
): Promise<{ id: string; skillIdOnchain: string; txHash: string; storageHash: string }> {
  const form = new FormData();
  form.append("content", payload.content);
  form.append("price_usd", String(payload.price_usd));
  form.append("category", payload.category);

  const res = await fetch(`${API_BASE}/api/v1/skills/upload`, {
    method: "POST",
    headers: authHeaders(address),
    body: form,
  });
  return handleResponse(res);
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function createSession(
  address: string,
  skillId: string
): Promise<Session> {
  const res = await fetch(`${API_BASE}/api/v1/chat/session`, {
    method: "POST",
    headers: { ...authHeaders(address), "Content-Type": "application/json" },
    body: JSON.stringify({ skillId }),
  });
  return handleResponse(res);
}

export async function fetchSessionMessages(
  address: string,
  sessionId: string
): Promise<ChatMessage[]> {
  const res = await fetch(`${API_BASE}/api/v1/chat/session/${sessionId}/messages`, {
    headers: authHeaders(address),
  });
  return handleResponse(res);
}

export async function fetchUserSessions(address: string) {
  const res = await fetch(`${API_BASE}/api/v1/chat/sessions`, {
    headers: authHeaders(address),
  });
  return handleResponse<Array<{
    id: string;
    skill_name: string;
    skill_id: string;
    category: string;
    message_count: number;
    created_at: string;
  }>>(res);
}

/**
 * Sends a message and returns an EventSource for the streamed response.
 * Caller is responsible for closing the stream.
 */
export function streamMessage(
  address: string,
  sessionId: string,
  content: string,
  onDelta: (text: string) => void,
  onDone: (txHash?: string) => void,
  onError: (err: string) => void
): () => void {
  let cancelled = false;

  (async () => {
    const res = await fetch(`${API_BASE}/api/v1/chat/message`, {
      method: "POST",
      headers: {
        ...authHeaders(address),
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ sessionId, content }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Stream failed" }));
      onError(err.error ?? "Request failed");
      return;
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      if (cancelled) break;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6)) as {
            type: string;
            text?: string;
            txHash?: string;
            message?: string;
          };
          if (event.type === "delta" && event.text) onDelta(event.text);
          if (event.type === "done") onDone(undefined);
          if (event.type === "payment") onDone(event.txHash);
          if (event.type === "error") onError(event.message ?? "Unknown error");
        } catch {
          // Ignore malformed SSE lines
        }
      }
    }
  })().catch((err) => onError(String(err)));

  return () => { cancelled = true; };
}

// ── Payments ──────────────────────────────────────────────────────────────────

export async function confirmTopUp(
  address: string,
  txHash: string
): Promise<{ newBalanceOG: string; creditedOG: string }> {
  const res = await fetch(`${API_BASE}/api/v1/payments/topup-onchain`, {
    method: "POST",
    headers: { ...authHeaders(address), "Content-Type": "application/json" },
    body: JSON.stringify({ txHash }),
  });
  return handleResponse(res);
}

export async function fetchPlatformWallet(): Promise<{ address: string }> {
  const res = await fetch(`${API_BASE}/api/v1/payments/platform-wallet`);
  return handleResponse(res);
}

export async function fetchBalance(address: string): Promise<Balance> {
  const res = await fetch(`${API_BASE}/api/v1/payments/balance`, {
    headers: authHeaders(address),
  });
  return handleResponse(res);
}

// ── Ratings ───────────────────────────────────────────────────────────────────

export async function submitRating(
  address: string,
  skillId: string,
  sessionId: string,
  rating: number
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/ratings`, {
    method: "POST",
    headers: { ...authHeaders(address), "Content-Type": "application/json" },
    body: JSON.stringify({ skillId, sessionId, rating }),
  });
  await handleResponse(res);
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function fetchDashboard(address: string): Promise<DashboardData> {
  const res = await fetch(`${API_BASE}/api/v1/dashboard`, {
    headers: authHeaders(address),
  });
  return handleResponse(res);
}

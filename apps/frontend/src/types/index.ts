export interface Skill {
  id: string;
  skill_id_onchain: string;
  creator_address: string;
  name: string;
  description: string;
  category: string;
  storage_hash: string;
  storage_url: string;
  price_usd: number;
  price_wei: string;
  active: boolean;
  total_runs: number;
  avg_rating: number;
  rating_count: number;
  tx_hash: string;
  created_at: string;
}

export interface Session {
  sessionId: string;
  skillId: string;
  priceUsd: number;
  priceWei: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export interface Balance {
  balanceWei: string;
  balanceOG: string;
  pendingEarningsWei: string;
}

export interface DashboardData {
  skills: Skill[];
  totalRuns: number;
  estimatedEarningsOG: string;
  pendingWithdrawalWei: string;
  topQueries: Array<{ content: string; count: number; skill_name: string }>;
}

export type SkillCategory =
  | "accounting"
  | "legal"
  | "design"
  | "finance"
  | "engineering"
  | "marketing"
  | "other";

export const CATEGORIES: { value: SkillCategory; label: string; emoji: string }[] = [
  { value: "accounting", label: "Accounting", emoji: "📊" },
  { value: "legal", label: "Legal", emoji: "⚖️" },
  { value: "design", label: "Design", emoji: "🎨" },
  { value: "finance", label: "Finance", emoji: "💹" },
  { value: "engineering", label: "Engineering", emoji: "⚙️" },
  { value: "marketing", label: "Marketing", emoji: "📣" },
  { value: "other", label: "Other", emoji: "✨" },
];

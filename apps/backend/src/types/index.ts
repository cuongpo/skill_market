export interface Skill {
  id: string;
  skill_id_onchain: string; // bytes32 from contract
  creator_address: string;
  name: string;
  description: string;
  category: string;
  storage_hash: string;
  storage_url: string;
  price_usd: number;
  price_wei: string;
  content?: string; // SKILL.md full content (cached locally)
  active: boolean;
  total_runs: number;
  avg_rating: number;
  rating_count: number;
  tx_hash: string; // registration tx hash
  created_at: string;
}

export interface Session {
  id: string;
  skill_id: string;
  user_address: string;
  skill_content: string;
  created_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface UserCredit {
  user_address: string;
  credits_usd: number; // stored in cents (100 = $1.00)
}

export interface Rating {
  id: string;
  skill_id: string;
  session_id: string;
  user_address: string;
  rating: number;
  created_at: string;
}

export type SkillCategory =
  | "accounting"
  | "legal"
  | "design"
  | "finance"
  | "engineering"
  | "marketing"
  | "other";

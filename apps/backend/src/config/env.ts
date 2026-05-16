import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default("gpt-4o"),
  ZERO_G_RPC_URL: z
    .string()
    .default("https://evmrpc-testnet.0g.ai"),
  ZERO_G_CHAIN_ID: z.coerce.number().default(16602),
  ZERO_G_STORAGE_RPC: z
    .string()
    .default("https://indexer-storage-testnet-standard.0g.ai"),
  ZERO_G_FLOW_ADDRESS: z.string().default("0xbD2C3F0E65eDF5582141C35969d66e34629cC768"),
  SKILL_REGISTRY_ADDRESS: z.string().default("0x0000000000000000000000000000000000000000"),
  PLATFORM_WALLET_ADDRESS: z.string().default("0x0000000000000000000000000000000000000000"),
  PLATFORM_PRIVATE_KEY: z.string().default("0x0000000000000000000000000000000000000000000000000000000000000001"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().default("./data/skillmarket.db"),
  JWT_SECRET: z.string().default("dev-secret-change-in-prod"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;

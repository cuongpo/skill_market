import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";

const ZERO_G_CHAIN_ID = parseInt(import.meta.env.VITE_ZERO_G_CHAIN_ID ?? "16602");

export const zeroGTestnet = defineChain({
  id: 16602,
  name: "0G Galileo Testnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evmrpc-testnet.0g.ai"] },
    public: { http: ["https://evmrpc-testnet.0g.ai"] },
  },
  blockExplorers: {
    default: {
      name: "0G Explorer",
      url: "https://chainscan-galileo.0g.ai",
    },
  },
  testnet: true,
});

export const zeroGMainnet = defineChain({
  id: 16661,
  name: "0G Newton Mainnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evmrpc.0g.ai"] },
    public: { http: ["https://evmrpc.0g.ai"] },
  },
  blockExplorers: {
    default: {
      name: "0G Explorer",
      url: "https://chainscan.0g.ai",
    },
  },
});

export const activeChain = ZERO_G_CHAIN_ID === 16661 ? zeroGMainnet : zeroGTestnet;

export const wagmiConfig = getDefaultConfig({
  appName: "SkillMarket",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "skillmarket-dev",
  chains: [zeroGTestnet, zeroGMainnet],
  ssr: false,
});

export const SKILL_REGISTRY_ADDRESS = import.meta.env.VITE_SKILL_REGISTRY_ADDRESS as `0x${string}` | undefined;

export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

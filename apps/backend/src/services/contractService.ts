import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  keccak256,
  encodePacked,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { env } from "../config/env.js";

// 0G Chain definitions
const zeroGTestnet = {
  id: 16602,
  name: "0G Galileo Testnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: {
    default: { http: [env.ZERO_G_RPC_URL] },
    public: { http: [env.ZERO_G_RPC_URL] },
  },
} as const;

const zeroGMainnet = {
  id: 16661,
  name: "0G Newton Mainnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evmrpc.0g.ai"] },
    public: { http: ["https://evmrpc.0g.ai"] },
  },
} as const;

const activeChain =
  env.ZERO_G_CHAIN_ID === 16661 ? zeroGMainnet : zeroGTestnet;

export const publicClient = createPublicClient({
  chain: activeChain,
  transport: http(env.ZERO_G_RPC_URL),
});

const platformAccount = privateKeyToAccount(
  env.PLATFORM_PRIVATE_KEY as Hex
);

export const platformWalletClient = createWalletClient({
  account: platformAccount,
  chain: activeChain,
  transport: http(env.ZERO_G_RPC_URL),
});

// Minimal ABI — only what the backend calls
export const SKILL_REGISTRY_ABI = [
  {
    type: "function",
    name: "registerSkill",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "description", type: "string" },
      { name: "category", type: "string" },
      { name: "storageHash", type: "string" },
      { name: "priceWei", type: "uint256" },
    ],
    outputs: [{ name: "skillId", type: "bytes32" }],
  },
  {
    type: "function",
    name: "executeSkill",
    stateMutability: "payable",
    inputs: [{ name: "skillId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "rateSkill",
    stateMutability: "nonpayable",
    inputs: [
      { name: "skillId", type: "bytes32" },
      { name: "rating", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "pendingWithdrawal",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "skills",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [
      { name: "creator", type: "address" },
      { name: "storageHash", type: "string" },
      { name: "name", type: "string" },
      { name: "description", type: "string" },
      { name: "category", type: "string" },
      { name: "priceWei", type: "uint256" },
      { name: "active", type: "bool" },
      { name: "totalRuns", type: "uint256" },
      { name: "totalEarningsWei", type: "uint256" },
      { name: "createdAt", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getAverageRating",
    stateMutability: "view",
    inputs: [{ name: "skillId", type: "bytes32" }],
    outputs: [
      { name: "avgX100", type: "uint256" },
      { name: "count", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "getCreatorSkills",
    stateMutability: "view",
    inputs: [{ name: "creator", type: "address" }],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
  {
    type: "event",
    name: "SkillRegistered",
    inputs: [
      { name: "skillId", type: "bytes32", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "storageHash", type: "string", indexed: false },
      { name: "priceWei", type: "uint256", indexed: false },
      { name: "category", type: "string", indexed: false },
    ],
  },
] as const;

const registryAddress = env.SKILL_REGISTRY_ADDRESS as Hex;

/**
 * Registers a skill on-chain. Returns the skillId (bytes32) and tx hash.
 * SkillId is computed client-side (mirrors contract keccak256 formula)
 * so we don't block waiting for the slow testnet receipt.
 */
export async function onchainRegisterSkill(params: {
  name: string;
  description: string;
  category: string;
  storageHash: string;
  priceWei: bigint;
}): Promise<{ skillIdOnchain: string; txHash: string }> {
  // Compute skillId the same way the contract does:
  // keccak256(abi.encodePacked(msg.sender, name, storageHash))
  const skillIdOnchain = keccak256(
    encodePacked(
      ["address", "string", "string"],
      [platformAccount.address, params.name, params.storageHash]
    )
  );

  if (registryAddress === "0x0000000000000000000000000000000000000000") {
    console.warn("[Contract] No registry address set — skipping on-chain registration");
    return { skillIdOnchain, txHash: "0x" + "0".repeat(64) };
  }

  // Fire-and-forget: don't await receipt — testnet confirmation is slow
  const txHash = await platformWalletClient.writeContract({
    address: registryAddress,
    abi: SKILL_REGISTRY_ABI,
    functionName: "registerSkill",
    args: [
      params.name,
      params.description,
      params.category,
      params.storageHash,
      params.priceWei,
    ],
  });

  // Log receipt asynchronously without blocking
  publicClient
    .waitForTransactionReceipt({ hash: txHash, timeout: 60_000 })
    .then(() => console.log(`[Contract] registerSkill confirmed: ${txHash}`))
    .catch((e: Error) => console.warn(`[Contract] registerSkill unconfirmed (ok): ${e.message}`));

  return { skillIdOnchain, txHash };
}

/**
 * Called by the platform after each successful Claude response.
 * Reads the on-chain priceWei to ensure msg.value matches exactly what the contract expects.
 */
export async function onchainExecuteSkill(
  skillIdOnchain: string,
  _dbPriceWei: bigint  // kept for signature compat; actual price read from chain
): Promise<{ txHash: string }> {
  if (registryAddress === "0x0000000000000000000000000000000000000000") {
    console.warn("[Contract] No registry address set — skipping on-chain execution");
    return { txHash: "0x" + "0".repeat(64) };
  }

  // Read actual on-chain price — contract requires msg.value == skill.priceWei exactly
  const skillData = await publicClient.readContract({
    address: registryAddress,
    abi: SKILL_REGISTRY_ABI,
    functionName: "skills",
    args: [skillIdOnchain as Hex],
  }) as readonly [string, string, string, string, string, bigint, boolean, bigint, bigint, bigint];
  const onchainPriceWei = skillData[5];

  const nonce = await publicClient.getTransactionCount({
    address: platformAccount.address,
    blockTag: "pending",
  });

  const txHash = await platformWalletClient.writeContract({
    address: registryAddress,
    abi: SKILL_REGISTRY_ABI,
    functionName: "executeSkill",
    args: [skillIdOnchain as Hex],
    value: onchainPriceWei,
    nonce,
  });

  return { txHash };
}

/**
 * Records a skill rating on-chain (fire-and-forget pattern — don't await in routes).
 */
export async function onchainRateSkill(
  skillIdOnchain: string,
  rating: number
): Promise<void> {
  if (registryAddress === "0x0000000000000000000000000000000000000000") return;

  try {
    await platformWalletClient.writeContract({
      address: registryAddress,
      abi: SKILL_REGISTRY_ABI,
      functionName: "rateSkill",
      args: [skillIdOnchain as Hex, rating],
    });
  } catch (err) {
    console.error("[Contract] rateSkill failed:", err);
  }
}

/**
 * Reads creator pending withdrawal balance from contract.
 */
export async function getCreatorEarnings(
  creatorAddress: string
): Promise<bigint> {
  if (registryAddress === "0x0000000000000000000000000000000000000000") {
    return 0n;
  }
  return publicClient.readContract({
    address: registryAddress,
    abi: SKILL_REGISTRY_ABI,
    functionName: "pendingWithdrawal",
    args: [creatorAddress as Hex],
  }) as Promise<bigint>;
}

/** USD price → wei conversion (naive: 1 0G token ≈ $1 for demo) */
export function usdToWei(usdPrice: number): bigint {
  return parseEther(usdPrice.toFixed(6));
}

/** Mirrors the contract's keccak256(abi.encodePacked(creator, name, storageHash)) */
export function computeSkillId(creator: string, name: string, storageHash: string): string {
  return keccak256(
    encodePacked(["address", "string", "string"], [creator as Hex, name, storageHash])
  );
}

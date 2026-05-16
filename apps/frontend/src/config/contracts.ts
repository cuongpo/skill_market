import { SKILL_REGISTRY_ADDRESS } from "./wagmi.js";

export const REGISTRY_ADDRESS = (
  SKILL_REGISTRY_ADDRESS ?? "0xA02127D1c30541C38abe5Def7b5474D91bAc176c"
) as `0x${string}`;

export const REGISTRY_ABI = [
  {
    type: "function",
    name: "pendingWithdrawal",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

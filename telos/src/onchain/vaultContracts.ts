import type { Address, Chain } from "viem";
import { arbitrumSepolia, baseSepolia } from "viem/chains";

/**
 * Matches Telos-Core-Contracts/src/TelosVault.sol. Vaults are deployed directly
 * from the TelosVault bytecode (there is no factory).
 */
export const VAULT_ABI = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { type: "function", name: "creator", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "creatorFeeBps", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "deployedValue", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "totalAssets", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "previewWithdraw",
    stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ name: "netAssets", type: "uint256" }],
  },
  {
    type: "function",
    name: "deposit",
    stateMutability: "payable",
    inputs: [{ name: "receiver", type: "address" }],
    outputs: [{ name: "shares", type: "uint256" }],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "shares", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ name: "netAssets", type: "uint256" }],
  },
  {
    type: "function",
    name: "quoteBridgeOut",
    stateMutability: "view",
    inputs: [
      { name: "dstEid", type: "uint32" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [
      { name: "nativeFee", type: "uint256" },
      { name: "amountReceived", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "bridgeOut",
    stateMutability: "payable",
    inputs: [
      { name: "dstEid", type: "uint32" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "minAmountReceived", type: "uint256" },
    ],
    outputs: [{ name: "guid", type: "bytes32" }],
  },
  {
    type: "function",
    name: "setDeployedValue",
    stateMutability: "nonpayable",
    inputs: [{ name: "value", type: "uint256" }],
    outputs: [],
  },
] as const;

/** Vault shares use 18 decimals + 3 virtual-share decimals (Vault.decimals()). */
export const SHARE_DECIMALS = 21;

export type TelosChain = {
  id: number;
  name: string;
  chain: Chain;
  /** Stargate V2 native ETH pool on this chain (TelosVault requires one). */
  stargate: Address | undefined;
  /** Stargate native ETH pool exists here, so bridgeOut works. */
  canBridge: boolean;
};

/** Wallet-independent deploy settings shared by every vault. */
export const VAULT_DEPLOY_CONFIG = {
  agent: import.meta.env.VITE_TELOS_AGENT_ADDRESS as Address | undefined,
  protocolTreasury: import.meta.env.VITE_PROTOCOL_TREASURY as Address | undefined,
};

export const TELOS_CHAINS: TelosChain[] = [
  {
    id: baseSepolia.id,
    name: "Base Sepolia",
    chain: baseSepolia,
    stargate: import.meta.env.VITE_STARGATE_ETH_BASE_SEPOLIA as Address | undefined,
    canBridge: false,
  },
  {
    id: arbitrumSepolia.id,
    name: "Arbitrum Sepolia",
    chain: arbitrumSepolia,
    stargate: import.meta.env.VITE_STARGATE_ETH_ARB_SEPOLIA as Address | undefined,
    canBridge: true,
  },
];

export function telosChain(chainId: number): TelosChain | undefined {
  return TELOS_CHAINS.find((item) => item.id === chainId);
}

/** Stargate destination endpoint ids (LayerZero v2 testnet). */
export const BRIDGE_DESTINATIONS = [
  { eid: 40231, name: "Arbitrum Sepolia" },
  { eid: 40232, name: "OP Sepolia" },
  { eid: 40161, name: "Ethereum Sepolia" },
] as const;

export function parseCreatorFeeBps(percent: string): bigint | null {
  const value = Number(percent);
  if (!Number.isFinite(value) || value < 0 || value > 10) return null;
  return BigInt(Math.round(value * 100));
}

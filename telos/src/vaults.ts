export type VaultKind = "ready" | "custom";

export type Vault = {
  name: string;
  asset: string;
  chain: string;
  kind: VaultKind;
  proto?: string;
  apy: number;
  tvl: string;
  fee: number;
  creator: string;
  color: string;
  h: number[];
};

export type VaultFilterKind = "all" | VaultKind;

/* SAMPLE DATA ONLY. Each creator sets their own fee. Replace with real vaults from your API / registry. */
export const VAULTS: Vault[] = [
  {
    name: "USDC/WETH LP",
    asset: "AE",
    chain: "Base",
    kind: "ready",
    proto: "Aerodrome",
    apy: 14.2,
    tvl: "2.4M",
    fee: 10,
    creator: "0x4a1f…9c2e",
    color: "#3b82f6",
    h: [3, 4, 4, 6, 5, 7, 8, 8, 10, 11],
  },
  {
    name: "PT-sUSDe Fixed Yield",
    asset: "PE",
    chain: "Arbitrum",
    kind: "ready",
    proto: "Pendle",
    apy: 11.6,
    tvl: "1.8M",
    fee: 8,
    creator: "0x91bc…d04a",
    color: "#2dd4bf",
    h: [5, 5, 6, 6, 7, 7, 8, 8, 9, 9],
  },
  {
    name: "USDC Lending",
    asset: "MO",
    chain: "Base",
    kind: "ready",
    proto: "Morpho",
    apy: 6.8,
    tvl: "3.1M",
    fee: 12,
    creator: "0x7e20…31ff",
    color: "#60a5fa",
    h: [4, 4, 5, 5, 5, 6, 6, 6, 7, 7],
  },
  {
    name: "WETH Supply",
    asset: "AA",
    chain: "Arbitrum",
    kind: "ready",
    proto: "Aave",
    apy: 3.9,
    tvl: "5.2M",
    fee: 5,
    creator: "0x03d9…aa71",
    color: "#a78bfa",
    h: [4, 4, 3, 4, 4, 5, 4, 5, 5, 5],
  },
  {
    name: "GM ETH/USD Pool",
    asset: "GM",
    chain: "Arbitrum",
    kind: "ready",
    proto: "GMX",
    apy: 17.5,
    tvl: "960K",
    fee: 15,
    creator: "0xb5c4…6e18",
    color: "#38bdf8",
    h: [2, 4, 3, 6, 7, 6, 9, 10, 9, 12],
  },
  {
    name: "USDC/ARB LP",
    asset: "CA",
    chain: "Arbitrum",
    kind: "ready",
    proto: "Camelot",
    apy: 12.1,
    tvl: "740K",
    fee: 10,
    creator: "0x2ff8…0b93",
    color: "#f59e0b",
    h: [3, 5, 4, 6, 6, 7, 8, 7, 9, 9],
  },
  {
    name: "Delta-Neutral ETH",
    asset: "DN",
    chain: "Base",
    kind: "custom",
    apy: 9.4,
    tvl: "410K",
    fee: 20,
    creator: "0xc3a7…42d0",
    color: "#ec6a4c",
    h: [2, 3, 5, 4, 6, 7, 7, 8, 9, 9],
  },
  {
    name: "Stable Basis Carry",
    asset: "SB",
    chain: "Arbitrum",
    kind: "custom",
    apy: 8.2,
    tvl: "280K",
    fee: 15,
    creator: "0x58e1…c7b6",
    color: "#f6a88f",
    h: [4, 4, 5, 6, 5, 6, 7, 7, 8, 8],
  },
  {
    name: "Blue-chip Rotator",
    asset: "BR",
    chain: "Base",
    kind: "custom",
    apy: 10.7,
    tvl: "150K",
    fee: 25,
    creator: "0xd90e…18a2",
    color: "#4ade80",
    h: [3, 3, 5, 6, 5, 7, 8, 8, 9, 10],
  },
];

export const ASSETS = ["USDC", "WETH", "DAI", "WBTC"];

export const CHAINS = ["Base", "Arbitrum"];

export const STRATS = [
  "Lending",
  "Liquidity provision",
  "Delta-neutral",
  "Fixed yield",
];

export function tvlValue(tvl: string): number {
  const value = Number.parseFloat(tvl);
  if (!Number.isFinite(value)) return 0;
  const upper = tvl.toUpperCase();
  if (upper.includes("M")) return value * 1_000_000;
  if (upper.includes("K")) return value * 1_000;
  return value;
}

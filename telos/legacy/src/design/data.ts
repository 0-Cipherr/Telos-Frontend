import type { Chain, Thesis, Vault } from "./types";

/**
 * These are the same sample vaults used by Home.tsx, extended with the
 * identifier, strategy category and risk label the redesigned cards show.
 * Replace this array with the registry API response when wiring real data.
 */
export const VAULTS: Vault[] = [
  {
    id: "TL-001",
    name: "USDC/WETH LP",
    asset: "AE",
    chain: "Base",
    kind: "ready",
    proto: "Aerodrome",
    strategy: "Liquidity provision",
    risk: "HIGH",
    apy: 14.2,
    tvl: 2_400_000,
    fee: 10,
    creator: "0x4a1f…9c2e",
    history: [3, 4, 4, 6, 5, 7, 8, 8, 10, 11],
    summary:
      "Two-asset liquidity provision that earns swap fees. Example strategy target: an Aerodrome pool on Base — shown for design preview, not a live integration.",
  },
  {
    id: "TL-002",
    name: "PT-sUSDe Fixed Yield",
    asset: "PE",
    chain: "Arbitrum",
    kind: "ready",
    proto: "Pendle",
    strategy: "Fixed yield",
    risk: "LOW",
    apy: 11.6,
    tvl: 1_800_000,
    fee: 8,
    creator: "0x91bc…d04a",
    history: [5, 5, 6, 6, 7, 7, 8, 8, 9, 9],
    summary:
      "A principal-token position that targets a fixed rate to maturity. Example strategy target: a Pendle market on Arbitrum. Sample terms only.",
  },
  {
    id: "TL-003",
    name: "USDC Lending",
    asset: "MO",
    chain: "Base",
    kind: "ready",
    proto: "Morpho",
    strategy: "Lending",
    risk: "LOW",
    apy: 6.8,
    tvl: 3_100_000,
    fee: 12,
    creator: "0x7e20…31ff",
    history: [4, 4, 5, 5, 5, 6, 6, 6, 7, 7],
    summary:
      "Overcollateralised stablecoin lending with utilisation-driven rates. Example strategy target: a Morpho market on Base.",
  },
  {
    id: "TL-004",
    name: "WETH Supply",
    asset: "AA",
    chain: "Arbitrum",
    kind: "ready",
    proto: "Aave",
    strategy: "Lending",
    risk: "LOW",
    apy: 3.9,
    tvl: 5_200_000,
    fee: 5,
    creator: "0x03d9…aa71",
    history: [4, 4, 3, 4, 4, 5, 4, 5, 5, 5],
    summary:
      "Single-asset ETH supply into a money market. Example strategy target: Aave on Arbitrum. Rates are illustrative.",
  },
  {
    id: "TL-005",
    name: "GM ETH/USD Pool",
    asset: "GM",
    chain: "Arbitrum",
    kind: "ready",
    proto: "GMX",
    strategy: "Liquidity provision",
    risk: "HIGH",
    apy: 17.5,
    tvl: 960_000,
    fee: 15,
    creator: "0xb5c4…6e18",
    history: [2, 4, 3, 6, 7, 6, 9, 10, 9, 12],
    summary:
      "Liquidity supplied against a perp market, exposed to trader PnL and pool composition. Example strategy target: a GMX market on Arbitrum.",
  },
  {
    id: "TL-006",
    name: "USDC/ARB LP",
    asset: "CA",
    chain: "Arbitrum",
    kind: "ready",
    proto: "Camelot",
    strategy: "Liquidity provision",
    risk: "HIGH",
    apy: 12.1,
    tvl: 740_000,
    fee: 10,
    creator: "0x2ff8…0b93",
    history: [3, 5, 4, 6, 6, 7, 8, 7, 9, 9],
    summary:
      "Concentrated liquidity on a volatile pair, with divergence loss during large moves. Example strategy target: Camelot on Arbitrum.",
  },
  {
    id: "TL-007",
    name: "Delta-Neutral ETH",
    asset: "DN",
    chain: "Base",
    kind: "custom",
    strategy: "Delta-neutral",
    risk: "MEDIUM",
    apy: 9.4,
    tvl: 410_000,
    fee: 20,
    creator: "0xc3a7…42d0",
    history: [2, 3, 5, 4, 6, 7, 7, 8, 9, 9],
    summary:
      "Spot ETH exposure paired with a perpetual short to target funding carry while reducing directional exposure. Execution details live outside this preview.",
  },
  {
    id: "TL-008",
    name: "Stable Basis Carry",
    asset: "SB",
    chain: "Arbitrum",
    kind: "custom",
    strategy: "Basis carry",
    risk: "MEDIUM",
    apy: 8.2,
    tvl: 280_000,
    fee: 15,
    creator: "0x58e1…c7b6",
    history: [4, 4, 5, 6, 5, 6, 7, 7, 8, 8],
    summary:
      "Stablecoin basis and funding carry spread across venues. Counterparty and venue risk remain; returns are not guaranteed.",
  },
  {
    id: "TL-009",
    name: "Blue-chip Rotator",
    asset: "BR",
    chain: "Base",
    kind: "custom",
    strategy: "Rotation",
    risk: "MEDIUM",
    apy: 10.7,
    tvl: 150_000,
    fee: 25,
    creator: "0xd90e…18a2",
    history: [3, 3, 5, 6, 5, 7, 8, 8, 9, 10],
    summary:
      "Rules-based rotation between blue-chip lending venues. Rotation timing and venue selection are creator-defined.",
  },
];

export const THESES: Thesis[] = [
  {
    id: "TH-01",
    name: "Lending & money markets",
    summary:
      "Take the senior position: lend against overcollateralised debt and let utilisation set the rate.",
    body:
      "Money-market yield is compensation for supplying liquidity that borrowers post collateral to access. The risk is not price direction — it is liquidation mechanics, oracle behaviour and smart-contract surface. A thesis in this category should name the market, the collateral set and the supply cap you consider acceptable before any capital moves.",
    assets: ["USDC", "WETH", "DAI"],
    networks: ["Base", "Arbitrum"],
    risk: "LOW",
  },
  {
    id: "TH-02",
    name: "Liquidity provision",
    summary:
      "Earn pool fees, but underwrite divergence loss and inventory risk honestly.",
    body:
      "An LP position sells volatility. Fee income can look smooth while the underlying inventory drifts. A credible thesis states the pair, the fee tier, the expected turnover and the drawdown you are prepared to absorb when the pair trends. Higher headline APY usually means more inventory risk, not more edge.",
    assets: ["USDC", "WETH", "ARB"],
    networks: ["Base", "Arbitrum"],
    risk: "HIGH",
  },
  {
    id: "TH-03",
    name: "Delta-neutral carry",
    summary:
      "Harvest funding and basis while trying to keep net directional exposure near zero.",
    body:
      "Delta-neutral strategies combine a spot leg with a short derivative, or offset two venues against each other. The yield is real, but so are basis blowouts, funding flips and exchange counterparty risk. The thesis should explain how the hedge is rebalanced and what happens in a liquidation cascade.",
    assets: ["WETH", "USDC"],
    networks: ["Base", "Arbitrum"],
    risk: "MEDIUM",
  },
  {
    id: "TH-04",
    name: "Fixed yield & principal tokens",
    summary:
      "Trade certainty for a known rate — if you can hold to maturity and accept the wrapper's risk.",
    body:
      "Principal tokens let a depositor lock a rate by separating yield from principal. The trade-off is liquidity before maturity and dependence on the issuer's contracts. A thesis should state the maturity, the implied rate at entry and the exit path if the position must be closed early.",
    assets: ["USDC", "DAI"],
    networks: ["Arbitrum"],
    risk: "LOW",
  },
];

/** Same option sets as the existing builder. */
export const ASSETS = ["USDC", "WETH", "DAI", "WBTC"];
export const CHAINS: Chain[] = ["Base", "Arbitrum"];
export const STRATEGIES = [
  "Lending",
  "Liquidity provision",
  "Delta-neutral",
  "Fixed yield",
];

/** Synthetic index series for the terminal chart. Clearly labelled as demo data. */
export const DEMO_TREND = [
  5.1, 5.6, 5.3, 6.2, 6.0, 6.7, 7.1, 6.8, 7.6, 7.2, 8.0, 8.4, 8.1, 8.9, 9.3,
  9.0, 9.8, 10.4, 10.1, 10.7,
];

export function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function formatUsdCompact(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function truncateAddress(address?: string): string {
  if (!address) return "DISCONNECT";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

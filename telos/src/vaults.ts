import { EVM_CHAIN_NAMES } from "./chains";

export type VaultKind = "ready" | "custom";
export type VaultStatus = "live" | "paused" | "draft";
export type VaultRisk = "LOW" | "MEDIUM" | "HIGH";

export type VaultAllocation = {
  label: string;
  pct: number;
};

/** A token created by a launchpad, and the asset it trades against. */
export type VaultLaunchpadToken = {
  launchpad: "pons" | "hookr";
  symbol: string;
  name: string;
  address?: string;
  logo?: string;
  /** Quote/stock symbol the token is paired with (AAPL, WETH, …). */
  pairedWith?: string;
  /** Contract address of the paired asset, when known. */
  pairAddress?: string;
};

export type Vault = {
  /** Stable registry identifier, also used in URLs. */
  id: string;
  name: string;
  asset: string;
  /** Primary network, kept for compact tables and deposit defaults. */
  chain: string;
  /** Every EVM network the vault is available on. */
  chains: string[];
  kind: VaultKind;
  proto?: string;
  strategy: string;
  /** Longer explanation of the current strategy. */
  strategySummary: string;
  /** What the vault does, in plain language. */
  description: string;
  /** Current strategy sleeves. */
  allocations?: VaultAllocation[];
  risk: VaultRisk;
  apy: number;
  tvl: string;
  tvlUsd: number;
  fee: number;
  /** Fixed protocol fee recorded when the vault was created. */
  protocolFee?: number;
  creator: string;
  /** Full creator address when available (used by the creator profile). */
  creatorAddress?: string;
  color: string;
  h: number[];
  status?: VaultStatus;
  createdAt?: string;
  /** address[] parameter stored with a user-created vault. */
  addresses?: string[];
  /** Deployed TelosVault on a supported chain. Present for user-created vaults. */
  onchain?: { chainId: number; vaultId: number; address: string };
  /** Launchpad listings selected at creation time. */
  launchpads?: string[];
  /** Robinhood stock token paired to a pons launch (and its reward asset). */
  launchpadStock?: {
    symbol: string;
    name: string;
    address: string;
    logo: string;
  };
  /** Token created by a launchpad launch. */
  launchpadToken?: VaultLaunchpadToken;
  /** Every token a vault launched, when it lists more than one launchpad. */
  launchpadTokens?: VaultLaunchpadToken[];
  /** Where the creator's share of yield is routed. */
  creatorRewards?: CreatorRewardMode;
  /** Whether vault shares can be staked from the vault page. */
  stakeEnabled?: boolean;
  /** Whether the creator-rewards box is shown on the vault page. */
  showCreatorRewards?: boolean;
  /** Contract source attached from the strategy lab. */
  contractCode?: string;
  contractName?: string;
  /** Optional onchain strategy agent settings selected at creation. */
  agentEnabled?: boolean;
  /** Model that runs the vault's onchain strategy agent between harvests. */
  agentModel?: string;
  /** Whether the agent opted into the Telos Eco scheduled-task pool. */
  agentEco?: boolean;
  /** Model that authored the attached strategy contract. */
  strategyModel?: string;
};

/** Asset shown for a launchpad vault: a launched token or a stock pair. */
export type VaultLaunchpadAsset = {
  launchpad: "pons" | "hookr";
  kind: "stock" | "token";
  symbol: string;
  name: string;
  address?: string;
  logo?: string;
  /** Quote/stock symbol the token is paired with. */
  pairedWith?: string;
  /** Contract address of the paired asset, when known. */
  pairAddress?: string;
};

export type VaultFilterKind = "all" | VaultKind;

/**
 * Fixed protocol fee charged on yield. The creator fee is capped so the
 * combined fee stays at 8% or less and depositors keep most of the yield.
 */
export const PROTOCOL_FEE_PERCENT = 5;
export const MAX_CREATOR_FEE_PERCENT = 3;
export const MAX_TOTAL_FEE_PERCENT =
  PROTOCOL_FEE_PERCENT + MAX_CREATOR_FEE_PERCENT;

export type CreatorRewardMode = "mine-ai" | "stake" | "fees";

export type CreatorRewardOption = {
  id: CreatorRewardMode;
  label: string;
  description: string;
  emoji: string;
};

/**
 * Where a creator's share of yield goes. The first two options route rewards
 * into the Telos AI economy instead of paying them out as cash.
 */
export const CREATOR_REWARDS: CreatorRewardOption[] = [
  {
    id: "mine-ai",
    label: "Mine AI tokens",
    description: "Route creator rewards into AI token mining rewards.",
    emoji: "⛏️",
  },
  {
    id: "stake",
    label: "Stake",
    description: "Auto-stake creator rewards for compounding yield.",
    emoji: "🥩",
  },
  {
    id: "fees",
    label: "Claim fees",
    description: "Keep creator rewards as claimable fees.",
    emoji: "💸",
  },
];

export function creatorRewardLabel(mode?: CreatorRewardMode): string {
  const option = CREATOR_REWARDS.find((item) => item.id === mode);
  return option ? `${option.emoji} ${option.label}` : "💸 Claim fees";
}

export type Launchpad = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  /** Local logo asset served from /public. */
  logo: string;
  /** Chain the launchpad listing lives on. */
  chain: string;
  url?: string;
};

/**
 * Launchpad listings shown as checkboxes in the create-vault flow.
 * Change this array to add/remove distribution partners.
 */
export const LAUNCHPADS: Launchpad[] = [
  {
    id: "pons",
    name: "Pons on Robinhood",
    description: "Stock-paired bonding-curve launchpad on Robinhood Chain.",
    emoji: "🅿️",
    logo: "/launchpads/pons.png",
    chain: "Robinhood Testnet",
    url: "https://ponsfamily.com/launchpad",
  },
  {
    id: "hookr",
    name: "Hookr.fun on Robinhood",
    description: "Uniswap v4 hook launchpad on Robinhood Chain.",
    emoji: "🪝",
    logo: "/launchpads/hookr.png",
    chain: "Robinhood Testnet",
    url: "https://hookr.fun",
  },
];

// Registry starts empty. Vaults appear here once creators create them.
export const VAULTS: Vault[] = [];

export const ASSETS = ["USDC", "USDT", "DAI", "WETH", "WBTC"];

/** Every EVM network the app supports. */
export const CHAINS = EVM_CHAIN_NAMES;

export const STRATS = [
  "Lending",
  "Liquidity provision",
  "Delta-neutral",
  "Fixed yield",
  "Basis carry",
  "Rotation",
];

export function tvlValue(tvl: string): number {
  const value = Number.parseFloat(tvl);
  if (!Number.isFinite(value)) return 0;
  const upper = tvl.toUpperCase();
  if (upper.includes("M")) return value * 1_000_000;
  if (upper.includes("K")) return value * 1_000;
  return value;
}

/** Estimated weekly earnings on a deposit, in USD (simple, non-compounded). */
export function weeklyEarnings(apy: number, principal = 1_000): number {
  if (!Number.isFinite(apy) || apy <= 0) return 0;
  return (principal * apy) / 100 / 52;
}

export function formatUsd(value: number, digits = 0): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
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

/** Launchpad assets attached to a vault, in display order. */
export function vaultLaunchpadPairs(vault: Vault): VaultLaunchpadAsset[] {
  const pairs: VaultLaunchpadAsset[] = [];
  const tokens = vault.launchpadTokens?.length
    ? vault.launchpadTokens
    : vault.launchpadToken
      ? [vault.launchpadToken]
      : [];
  const hasPonsToken = tokens.some((token) => token.launchpad === "pons");

  for (const token of tokens) {
    const launchpad = token.launchpad ?? "hookr";
    pairs.push({
      ...token,
      launchpad,
      kind: "token",
      pairedWith:
        token.pairedWith ??
        (launchpad === "pons" ? vault.launchpadStock?.symbol : "WETH"),
      pairAddress:
        token.pairAddress ??
        (launchpad === "pons" ? vault.launchpadStock?.address : undefined),
    });
  }

  // A stock-only entry (older vaults or a pons listing without token data)
  // still needs to surface the stock it pairs with.
  if (vault.launchpadStock && !hasPonsToken) {
    pairs.push({
      launchpad: "pons",
      kind: "stock",
      ...vault.launchpadStock,
      pairedWith: vault.launchpadStock.symbol,
      pairAddress: vault.launchpadStock.address,
    });
  }

  return pairs;
}

/** Full creator address when known, otherwise the stored display address. */
export function creatorIdentity(vault: Vault): string {
  return vault.creatorAddress || vault.creator;
}

export function creatorProfilePath(vault: Vault): string {
  return `/creators/${encodeURIComponent(creatorIdentity(vault))}`;
}

/** Estimated annual creator share: TVL × APY × creator fee. */
export function annualCreatorEarnings(vault: Vault): number {
  if (!Number.isFinite(vault.tvlUsd) || vault.tvlUsd <= 0) return 0;
  if (!Number.isFinite(vault.apy) || vault.apy <= 0) return 0;
  return vault.tvlUsd * (vault.apy / 100) * (vault.fee / 100);
}

export function shortAddress(value: string, head = 6, tail = 4): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

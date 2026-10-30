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

/* SAMPLE DATA ONLY. Replace with real vaults from the registry API. */
export const VAULTS: Vault[] = [
  {
    id: "TL-001",
    name: "USDC/WETH LP",
    asset: "AE",
    chain: "Base",
    chains: ["Base", "Arbitrum", "Optimism", "Ethereum"],
    kind: "ready",
    proto: "Aerodrome",
    strategy: "Liquidity provision",
    strategySummary:
      "Concentrated USDC/WETH liquidity on Aerodrome. Swap fees compound weekly and the range rebalances after a 5% drift.",
    description:
      "A two-asset liquidity vault for the USDC/WETH pair. Fees accrue from swap volume; inventory can drift when ETH trends. Built as an example strategy target for the Base deployment.",
    allocations: [
      { label: "Aerodrome USDC/WETH — Base", pct: 60 },
      { label: "Camelot USDC/WETH — Arbitrum", pct: 25 },
      { label: "Idle buffer / rebalance gas", pct: 15 },
    ],
    risk: "HIGH",
    apy: 14.2,
    tvl: "2.4M",
    tvlUsd: 2_400_000,
    fee: 10,
    creator: "0x4a1f…9c2e",
    color: "#3b82f6",
    h: [3, 4, 4, 6, 5, 7, 8, 8, 10, 11],
    status: "live",
    agentModel: "openai/gpt-4o-mini",
    strategyModel: "anthropic/claude-3.5-sonnet",
    createdAt: "2026-02-14",
    creatorRewards: "stake",
    stakeEnabled: true,
    showCreatorRewards: true,
  },
  {
    id: "TL-002",
    name: "PT-sUSDe Fixed Yield",
    asset: "PE",
    chain: "Arbitrum",
    chains: ["Ethereum", "Arbitrum", "Base"],
    kind: "ready",
    proto: "Pendle",
    strategy: "Fixed yield",
    strategySummary:
      "Buy PT-sUSDe and hold to maturity to lock a fixed rate. A small stable buffer covers early exits and gas.",
    description:
      "A principal-token position that targets a fixed rate to maturity. The trade-off is liquidity before maturity and dependence on the issuer contracts. Sample terms only.",
    allocations: [
      { label: "Pendle PT-sUSDe — maturity Sep 2026", pct: 85 },
      { label: "USDC liquidity buffer", pct: 15 },
    ],
    risk: "LOW",
    apy: 11.6,
    tvl: "1.8M",
    tvlUsd: 1_800_000,
    fee: 8,
    creator: "0x91bc…d04a",
    color: "#2dd4bf",
    h: [5, 5, 6, 6, 7, 7, 8, 8, 9, 9],
    status: "live",
    agentModel: "google/gemini-2.5-flash",
    strategyModel: "anthropic/claude-3.5-sonnet",
    createdAt: "2026-01-22",
  },
  {
    id: "TL-003",
    name: "USDC Lending",
    asset: "MO",
    chain: "Base",
    chains: ["Base", "Ethereum", "Polygon", "Optimism", "Scroll"],
    kind: "ready",
    proto: "Morpho",
    strategy: "Lending",
    strategySummary:
      "Supply USDC to curated Morpho markets and let utilisation set the rate. Deposits pause if utilisation exceeds 92%.",
    description:
      "Overcollateralised stablecoin lending with utilisation-driven rates. The risk is liquidation and oracle mechanics, not price direction. Example strategy target: Morpho on Base.",
    allocations: [
      { label: "Morpho USDC Blue — Base", pct: 55 },
      { label: "Morpho USDC — Ethereum", pct: 30 },
      { label: "Idle USDC", pct: 15 },
    ],
    risk: "LOW",
    apy: 6.8,
    tvl: "3.1M",
    tvlUsd: 3_100_000,
    fee: 12,
    creator: "0x7e20…31ff",
    color: "#60a5fa",
    h: [4, 4, 5, 5, 5, 6, 6, 6, 7, 7],
    status: "live",
    agentModel: "openai/gpt-4.1-mini",
    strategyModel: "openai/gpt-4o",
    createdAt: "2025-12-08",
  },
  {
    id: "TL-004",
    name: "WETH Supply",
    asset: "AA",
    chain: "Ethereum",
    chains: ["Ethereum", "Arbitrum", "Polygon", "Optimism", "Base", "Linea"],
    kind: "ready",
    proto: "Aave",
    strategy: "Lending",
    strategySummary:
      "Single-asset ETH supply across Aave v3 markets. The strategy routes to the market with the highest net supply APR, checked at each harvest.",
    description:
      "Supply WETH into a money market and earn the borrow rate. Rates are illustrative and move with utilisation. No leverage, no directional hedge.",
    allocations: [
      { label: "Aave v3 WETH — Ethereum", pct: 45 },
      { label: "Aave v3 WETH — Arbitrum", pct: 35 },
      { label: "Idle WETH buffer", pct: 20 },
    ],
    risk: "LOW",
    apy: 3.9,
    tvl: "5.2M",
    tvlUsd: 5_200_000,
    fee: 5,
    creator: "0x03d9…aa71",
    color: "#a78bfa",
    h: [4, 4, 3, 4, 4, 5, 4, 5, 5, 5],
    status: "live",
    agentModel: "meta-llama/llama-3.3-70b-instruct",
    strategyModel: "meta-llama/llama-3.3-70b-instruct",
    createdAt: "2025-11-30",
  },
  {
    id: "TL-005",
    name: "GM ETH/USD Pool",
    asset: "GM",
    chain: "Arbitrum",
    chains: ["Arbitrum", "Avalanche"],
    kind: "ready",
    proto: "GMX",
    strategy: "Liquidity provision",
    strategySummary:
      "Provide liquidity against the ETH/USD perp market. Fees offset trader PnL; inventory risk rises in one-way markets.",
    description:
      "Liquidity supplied against a perp market, exposed to trader PnL and pool composition. The headline APY reflects fee income before inventory drawdown.",
    allocations: [
      { label: "GMX GM ETH/USD — Arbitrum", pct: 70 },
      { label: "GMX GM AVAX/USD — Avalanche", pct: 20 },
      { label: "Stable buffer", pct: 10 },
    ],
    risk: "HIGH",
    apy: 17.5,
    tvl: "960K",
    tvlUsd: 960_000,
    fee: 15,
    creator: "0xb5c4…6e18",
    color: "#38bdf8",
    h: [2, 4, 3, 6, 7, 6, 9, 10, 9, 12],
    status: "live",
    agentModel: "deepseek/deepseek-chat-v3",
    strategyModel: "deepseek/deepseek-chat-v3",
    createdAt: "2026-03-03",
  },
  {
    id: "TL-006",
    name: "USDC/ARB LP",
    asset: "CA",
    chain: "Arbitrum",
    chains: ["Arbitrum", "Base"],
    kind: "ready",
    proto: "Camelot",
    strategy: "Liquidity provision",
    strategySummary:
      "Concentrated USDC/ARB liquidity with a wide range. Rebalances when price exits the active band; divergence loss is expected.",
    description:
      "Concentrated liquidity on a volatile pair, with divergence loss during large moves. Example strategy target: Camelot on Arbitrum.",
    allocations: [
      { label: "Camelot USDC/ARB — Arbitrum", pct: 65 },
      { label: "Aerodrome USDC/ARB — Base", pct: 20 },
      { label: "Idle buffer", pct: 15 },
    ],
    risk: "HIGH",
    apy: 12.1,
    tvl: "740K",
    tvlUsd: 740_000,
    fee: 10,
    creator: "0x2ff8…0b93",
    color: "#f59e0b",
    h: [3, 5, 4, 6, 6, 7, 8, 7, 9, 9],
    status: "live",
    agentModel: "qwen/qwen-2.5-coder-32b-instruct",
    strategyModel: "qwen/qwen-2.5-coder-32b-instruct",
    createdAt: "2026-02-27",
  },
  {
    id: "TL-007",
    name: "Delta-Neutral ETH",
    asset: "DN",
    chain: "Base",
    chains: ["Base", "Arbitrum", "Ethereum", "Optimism"],
    kind: "custom",
    proto: "Pendle",
    strategy: "Delta-neutral",
    strategySummary:
      "Spot ETH plus a perp short to harvest funding while keeping net delta near zero. Hedge rebalances on 3% drift or a funding flip.",
    description:
      "Spot ETH exposure paired with a perpetual short to target funding carry. Basis blowouts, funding flips and venue counterparty risk remain.",
    allocations: [
      { label: "Spot ETH sleeve", pct: 48 },
      { label: "Perp short hedge", pct: 42 },
      { label: "Stable buffer / margin", pct: 10 },
    ],
    risk: "MEDIUM",
    apy: 9.4,
    tvl: "410K",
    tvlUsd: 410_000,
    fee: 20,
    creator: "0xc3a7…42d0",
    color: "#ec6a4c",
    h: [2, 3, 5, 4, 6, 7, 7, 8, 9, 9],
    status: "live",
    agentModel: "mistralai/mistral-large",
    strategyModel: "mistralai/mistral-large",
    createdAt: "2026-04-01",
  },
  {
    id: "TL-008",
    name: "Stable Basis Carry",
    asset: "SB",
    chain: "Ethereum",
    chains: ["Ethereum", "Arbitrum", "Base", "BNB Chain"],
    kind: "custom",
    proto: "Pendle",
    strategy: "Basis carry",
    strategySummary:
      "Capture stablecoin basis and funding spreads across venues. Capital rotates toward the highest positive carry and exits when it inverts.",
    description:
      "Stablecoin basis and funding carry spread across venues. Counterparty and venue risk remain; returns are not guaranteed.",
    allocations: [
      { label: "Funding carry basket", pct: 55 },
      { label: "Basis trade basket", pct: 30 },
      { label: "Stable buffer", pct: 15 },
    ],
    risk: "MEDIUM",
    apy: 8.2,
    tvl: "280K",
    tvlUsd: 280_000,
    fee: 15,
    creator: "0x58e1…c7b6",
    color: "#4ade80",
    h: [4, 4, 5, 6, 5, 6, 7, 7, 8, 8],
    status: "live",
    agentModel: "cohere/north-mini-code:free",
    strategyModel: "cohere/north-mini-code:free",
    createdAt: "2026-03-19",
  },
  {
    id: "TL-009",
    name: "Blue-chip Rotator",
    asset: "BR",
    chain: "Ethereum",
    chains: ["Ethereum", "Base", "Optimism", "Linea"],
    kind: "custom",
    proto: "Aave",
    strategy: "Rotation",
    strategySummary:
      "Rules-based rotation between blue-chip lending venues. The current sleeve favours Ethereum and Base when net APR spreads exceed 1.5%.",
    description:
      "Rules-based rotation between blue-chip lending venues. Rotation timing and venue selection are creator-defined; the strategy can sit in cash.",
    allocations: [
      { label: "Aave v3 — Ethereum", pct: 40 },
      { label: "Morpho — Base", pct: 35 },
      { label: "Cash / dry powder", pct: 25 },
    ],
    risk: "MEDIUM",
    apy: 10.7,
    tvl: "150K",
    tvlUsd: 150_000,
    fee: 25,
    creator: "0xd90e…18a2",
    color: "#22d3ee",
    h: [3, 3, 5, 6, 5, 7, 8, 8, 9, 10],
    status: "live",
    agentModel: "nvidia/nemotron-3-ultra-550b-a55b:free",
    strategyModel: "nvidia/nemotron-3-ultra-550b-a55b:free",
    createdAt: "2026-04-11",
  },
  {
    id: "TL-010",
    name: "Telos USDC Prime",
    asset: "TP",
    chain: "Telos",
    chains: ["Telos", "Base", "Arbitrum"],
    kind: "ready",
    proto: "Telos",
    strategy: "Lending",
    strategySummary:
      "Native Telos USDC lending with a cross-chain buffer on Base and Arbitrum. Designed as the default first vault for new depositors.",
    description:
      "A conservative stablecoin vault on Telos with cross-chain liquidity buffers. Rates are sample data and reset at each harvest.",
    allocations: [
      { label: "Telos USDC lending", pct: 60 },
      { label: "Base USDC buffer", pct: 20 },
      { label: "Arbitrum USDC buffer", pct: 20 },
    ],
    risk: "LOW",
    apy: 9.8,
    tvl: "1.2M",
    tvlUsd: 1_200_000,
    fee: 6,
    creator: "0x91f0…7c4d",
    color: "#8fd400",
    h: [4, 4, 5, 5, 6, 6, 7, 7, 8, 9],
    status: "live",
    agentModel: "telos/strategist-7b",
    strategyModel: "telos/strategist-7b",
    createdAt: "2026-04-20",
  },
  {
    id: "TL-011",
    name: "zkSync ETH Yield",
    asset: "ZY",
    chain: "zkSync",
    chains: ["zkSync", "Ethereum", "Scroll"],
    kind: "custom",
    proto: "Aave",
    strategy: "Lending",
    strategySummary:
      "ETH supply on zkSync with a small Ethereum bridge allocation. Withdrawals prefer the local market to avoid bridge latency.",
    description:
      "A zk-rollup ETH strategy that keeps most capital local and uses Ethereum only when the rate spread justifies a bridge.",
    allocations: [
      { label: "Aave v3 WETH — zkSync", pct: 70 },
      { label: "Aave v3 WETH — Ethereum", pct: 20 },
      { label: "Idle buffer", pct: 10 },
    ],
    risk: "MEDIUM",
    apy: 7.4,
    tvl: "620K",
    tvlUsd: 620_000,
    fee: 8,
    creator: "0x6b2a…19ef",
    color: "#818cf8",
    h: [3, 4, 4, 5, 5, 5, 6, 6, 7, 7],
    status: "live",
    agentModel: "openai/gpt-4o-mini",
    strategyModel: "google/gemini-2.5-pro",
    createdAt: "2026-03-28",
  },
  {
    id: "TL-012",
    name: "Avalanche Stable Pool",
    asset: "AS",
    chain: "Avalanche",
    chains: ["Avalanche", "Arbitrum", "Base"],
    kind: "ready",
    proto: "Aave",
    strategy: "Liquidity provision",
    strategySummary:
      "Stablecoin LP on Avalanche with a Base fallback. Fees are collected in USDC and compounded weekly.",
    description:
      "A stable-pair liquidity vault targeting low-drawdown fee income. Depeg events and pool composition remain the main risks.",
    allocations: [
      { label: "Avalanche USDC/USDT pool", pct: 65 },
      { label: "Base USDC buffer", pct: 25 },
      { label: "Idle buffer", pct: 10 },
    ],
    risk: "MEDIUM",
    apy: 11.3,
    tvl: "840K",
    tvlUsd: 840_000,
    fee: 9,
    creator: "0xe2c1…4a08",
    color: "#e84142",
    h: [4, 5, 5, 6, 6, 6, 7, 7, 8, 8],
    status: "live",
    agentModel: "anthropic/claude-3.5-haiku",
    strategyModel: "anthropic/claude-3.5-sonnet",
    createdAt: "2026-04-06",
  },
  {
    id: "TL-013",
    name: "Omnichain USDC Carry",
    asset: "OC",
    chain: "Ethereum",
    chains: [...EVM_CHAIN_NAMES],
    kind: "custom",
    proto: "Telos Router",
    strategy: "Basis carry",
    strategySummary:
      "A cross-EVM stablecoin carry vault. The router ranks venues across every supported EVM network and moves size only when net carry beats the bridge and gas cost.",
    description:
      "The flagship multi-chain vault. It demonstrates how one registry entry can expose the same strategy on every EVM network while keeping a single accounting unit. Sample data.",
    allocations: [
      { label: "Ethereum + L2 carry venues", pct: 45 },
      { label: "Alt-L1 / L2 carry venues", pct: 35 },
      { label: "Idle / bridge float", pct: 20 },
    ],
    risk: "MEDIUM",
    apy: 12.6,
    tvl: "4.8M",
    tvlUsd: 4_800_000,
    fee: 7,
    creator: "0x0f92…d3aa",
    color: "#a3e635",
    h: [5, 5, 6, 6, 7, 7, 8, 9, 9, 10],
    status: "live",
    agentModel: "nvidia/nemotron-3.5-lightning:free",
    strategyModel: "openai/gpt-4o",
    createdAt: "2026-04-22",
  },
  {
    id: "TL-014",
    name: "AAPL Stock Curve",
    asset: "AAPL",
    chain: "Robinhood Testnet",
    chains: ["Robinhood Testnet", "Base"],
    kind: "custom",
    proto: "Pons",
    strategy: "Stock-paired launch",
    strategySummary:
      "A pons bonding-curve launch paired with tokenized AAPL. Buyers spend AAPL, sellers get AAPL back, and creator rewards accrue in AAPL.",
    description:
      "Example launchpad vault showing how a pons stock pair appears in the registry. AAPL is both the pair token and the reward asset. Sample data.",
    allocations: [{ label: "AAPL / launch token curve", pct: 100 }],
    risk: "HIGH",
    apy: 18.4,
    tvl: "420K",
    tvlUsd: 420_000,
    fee: 8,
    creator: "0x7a21…4f8c",
    color: "#8fd400",
    h: [7, 8, 8, 9, 9, 10, 11, 11, 12, 13],
    status: "live",
    launchpads: ["pons"],
    launchpadStock: {
      symbol: "AAPL",
      name: "Apple",
      address: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9",
      logo: "https://cdn.robinhood.com/ncw_assets/logos/0xaf3d76f1834a1d425780943c99ea8a608f8a93f9.png",
    },
    launchpadToken: {
      launchpad: "pons",
      symbol: "AAPLX",
      name: "AAPL Curve",
      logo: "/launchpads/pons.png",
      pairedWith: "AAPL",
      pairAddress: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9",
    },
    createdAt: "2026-10-20",
  },
  {
    id: "TL-015",
    name: "Hookr Plunder",
    asset: "PLD",
    chain: "Robinhood Testnet",
    chains: ["Robinhood Testnet"],
    kind: "custom",
    proto: "Hookr.fun",
    strategy: "Hookr launch",
    strategySummary:
      "A Hookr.fun launch with fixed reward hooks: 0.5% burn, 3% LP rewards, 10% creator royalty and 20% protocol share.",
    description:
      "Example Hookr.fun vault. The launch token is PLUNDER, paired with WETH in its Hookr pool. Sample data.",
    allocations: [{ label: "PLUNDER / WETH Hookr pool", pct: 100 }],
    risk: "HIGH",
    apy: 22.1,
    tvl: "180K",
    tvlUsd: 180_000,
    fee: 10,
    creator: "0x3c88…b1e2",
    color: "#c084fc",
    h: [8, 9, 9, 10, 11, 12, 12, 13, 14, 15],
    status: "live",
    launchpads: ["hookr"],
    launchpadToken: {
      launchpad: "hookr",
      symbol: "PLUNDER",
      name: "Plunder",
      logo: "/launchpads/hookr.png",
      pairedWith: "WETH",
      pairAddress: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
    },
    createdAt: "2026-10-22",
  },
  {
    id: "TL-016",
    name: "NVDA Stock Curve",
    asset: "NVDA",
    chain: "Robinhood Testnet",
    chains: ["Robinhood Testnet"],
    kind: "custom",
    proto: "Pons",
    strategy: "Stock-paired launch",
    strategySummary:
      "A pons curve paired with tokenized NVDA. Buyers spend NVDA, sellers are paid in NVDA, and creator fees accrue in NVDA.",
    description:
      "Pons launch paired with NVIDIA stock tokens. The pairing asset is also the payout asset, so deed cash flow arrives in NVDA. Sample data.",
    allocations: [{ label: "NVDA / launch token curve", pct: 100 }],
    risk: "HIGH",
    apy: 24.6,
    tvl: "310K",
    tvlUsd: 310_000,
    fee: 8,
    creator: "0x2b91…4d7e",
    color: "#8fd400",
    h: [9, 10, 10, 11, 12, 13, 13, 14, 15, 16],
    status: "live",
    launchpads: ["pons"],
    launchpadStock: {
      symbol: "NVDA",
      name: "NVIDIA",
      address: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC",
      logo: "https://cdn.robinhood.com/ncw_assets/logos/0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec.png",
    },
    launchpadToken: {
      launchpad: "pons",
      symbol: "NVDAC",
      name: "NVDA Curve",
      logo: "/launchpads/pons.png",
      pairedWith: "NVDA",
      pairAddress: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC",
    },
    createdAt: "2026-10-21",
  },
  {
    id: "TL-017",
    name: "TSLA Stock Curve",
    asset: "TSLA",
    chain: "Robinhood Testnet",
    chains: ["Robinhood Testnet"],
    kind: "custom",
    proto: "Pons",
    strategy: "Stock-paired launch",
    strategySummary:
      "A pons curve paired with tokenized TSLA. Fees and rewards settle in TSLA rather than ETH.",
    description:
      "Pons launch paired with Tesla stock tokens. The curve graduates into a Uniswap v4 pool quoted in TSLA. Sample data.",
    allocations: [{ label: "TSLA / launch token curve", pct: 100 }],
    risk: "HIGH",
    apy: 21.3,
    tvl: "260K",
    tvlUsd: 260_000,
    fee: 8,
    creator: "0x84c0…91b3",
    color: "#8fd400",
    h: [8, 9, 9, 10, 10, 12, 12, 13, 13, 14],
    status: "live",
    launchpads: ["pons"],
    launchpadStock: {
      symbol: "TSLA",
      name: "Tesla",
      address: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d",
      logo: "https://cdn.robinhood.com/ncw_assets/logos/0x322f0929c4625ed5bad873c95208d54e1c003b2d.png",
    },
    launchpadToken: {
      launchpad: "pons",
      symbol: "TSLAC",
      name: "TSLA Curve",
      logo: "/launchpads/pons.png",
      pairedWith: "TSLA",
      pairAddress: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d",
    },
    createdAt: "2026-10-19",
  },
  {
    id: "TL-018",
    name: "SPY Index Curve",
    asset: "SPY",
    chain: "Robinhood Testnet",
    chains: ["Robinhood Testnet", "Base"],
    kind: "custom",
    proto: "Pons",
    strategy: "Stock-paired launch",
    strategySummary:
      "A pons curve paired with tokenized SPY. Broad-market exposure prices the launch and pays its creator fees.",
    description:
      "Pons launch paired with the SPDR S&P 500 ETF token. Lower volatility pairing, so the fee stream is steadier than single-name stock pairs. Sample data.",
    allocations: [{ label: "SPY / launch token curve", pct: 100 }],
    risk: "MEDIUM",
    apy: 12.8,
    tvl: "540K",
    tvlUsd: 540_000,
    fee: 7,
    creator: "0x1f73…c580",
    color: "#8fd400",
    h: [5, 6, 6, 6, 7, 7, 8, 8, 8, 9],
    status: "live",
    launchpads: ["pons"],
    launchpadStock: {
      symbol: "SPY",
      name: "SPDR S&P 500 ETF Trust",
      address: "0x117cc2133c37B721F49dE2A7a74833232B3B4C0C",
      logo: "https://cdn.robinhood.com/ncw_assets/logos/0x117cc2133c37b721f49de2a7a74833232b3b4c0c.png",
    },
    launchpadToken: {
      launchpad: "pons",
      symbol: "SPYC",
      name: "SPY Curve",
      logo: "/launchpads/pons.png",
      pairedWith: "SPY",
      pairAddress: "0x117cc2133c37B721F49dE2A7a74833232B3B4C0C",
    },
    createdAt: "2026-10-17",
  },
  {
    id: "TL-019",
    name: "MSFT Stock Curve",
    asset: "MSFT",
    chain: "Robinhood Testnet",
    chains: ["Robinhood Testnet"],
    kind: "custom",
    proto: "Pons",
    strategy: "Stock-paired launch",
    strategySummary:
      "A pons curve paired with tokenized MSFT. Creator fees are credited in MSFT in the pons fee escrow.",
    description:
      "Pons launch paired with Microsoft stock tokens. Small book, high fee share, rewards paid in MSFT. Sample data.",
    allocations: [{ label: "MSFT / launch token curve", pct: 100 }],
    risk: "MEDIUM",
    apy: 16.2,
    tvl: "190K",
    tvlUsd: 190_000,
    fee: 8,
    creator: "0x6ad2…0f44",
    color: "#8fd400",
    h: [6, 7, 7, 8, 8, 9, 9, 10, 10, 11],
    status: "live",
    launchpads: ["pons"],
    launchpadStock: {
      symbol: "MSFT",
      name: "Microsoft",
      address: "0xe93237C50D904957Cf27E7B1133b510C669c2e74",
      logo: "https://cdn.robinhood.com/ncw_assets/logos/0xe93237c50d904957cf27e7b1133b510c669c2e74.png",
    },
    launchpadToken: {
      launchpad: "pons",
      symbol: "MSFTC",
      name: "MSFT Curve",
      logo: "/launchpads/pons.png",
      pairedWith: "MSFT",
      pairAddress: "0xe93237C50D904957Cf27E7B1133b510C669c2e74",
    },
    createdAt: "2026-10-16",
  },
  {
    id: "TL-020",
    name: "QQQ Index Curve",
    asset: "QQQ",
    chain: "Robinhood Testnet",
    chains: ["Robinhood Testnet", "Base"],
    kind: "custom",
    proto: "Pons",
    strategy: "Stock-paired launch",
    strategySummary:
      "A pons curve paired with tokenized QQQ. Tech-index exposure as the quote asset, with fees paid in QQQ.",
    description:
      "Pons launch paired with the Invesco QQQ ETF token. Index pairing keeps the curve liquid while fees accumulate in QQQ. Sample data.",
    allocations: [{ label: "QQQ / launch token curve", pct: 100 }],
    risk: "MEDIUM",
    apy: 14.9,
    tvl: "380K",
    tvlUsd: 380_000,
    fee: 7,
    creator: "0x9c35…7a10",
    color: "#8fd400",
    h: [6, 6, 7, 7, 8, 8, 9, 9, 10, 10],
    status: "live",
    launchpads: ["pons"],
    launchpadStock: {
      symbol: "QQQ",
      name: "Invesco QQQ",
      address: "0xD5f3879160bc7c32ebb4dC785F8a4F505888de68",
      logo: "https://cdn.robinhood.com/ncw_assets/logos/0xd5f3879160bc7c32ebb4dc785f8a4f505888de68.png",
    },
    launchpadToken: {
      launchpad: "pons",
      symbol: "QQQC",
      name: "QQQ Curve",
      logo: "/launchpads/pons.png",
      pairedWith: "QQQ",
      pairAddress: "0xD5f3879160bc7c32ebb4dC785F8a4F505888de68",
    },
    createdAt: "2026-10-15",
  },
];

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

/**
 * SinjohFees.ts
 * Fee presets, validation and split math for Sinjoh launches.
 * Fees are in basis points (100 bps = 1%).
 *
 * Single fixed config (SINJOH_FEES): buy 3% / sell 4%, split evenly between
 * owner, creator and the holder airdrop pool (airdrop slightly higher on sells).
 */

export interface FeeSplit {
  totalBps: number;
  ownerBps: number;
  creatorBps: number;
  airdropBps: number;
}

export interface FeeConfig {
  label: string;
  buy: FeeSplit;
  sell: FeeSplit;
}

export const BPS = 10_000;
export const MAX_TAX_BPS = 500; // 5% hard cap per side
export const MIN_AIRDROP_SHARE = 0.3; // of each tax
export const MIN_PARTY_SHARE = 0.1; // owner and creator minimum, of each tax

/**
 * The one fixed Sinjoh fee config. Not configurable at runtime.
 *
 * Buy  3.00% = owner 1.00 + creator 1.00 + airdrop 1.00  (each ~33%)
 * Sell 4.00% = owner 1.25 + creator 1.25 + airdrop 1.50  (airdrop 37.5%)
 *
 * Why this works for everyone:
 *  - Owner and creator earn the same cut on every trade, so both are
 *    motivated to drive volume.
 *  - Holders get the largest single slice on sells, which rewards holding
 *    and penalizes dumping.
 *  - 3% / 4% sits at the normal range for tax tokens and well under the
 *    5% hard cap, so it won't scare traders away.
 */
export const SINJOH_FEES: Readonly<FeeConfig> = Object.freeze({
  label: "Sinjoh Fixed Fees",
  buy: Object.freeze({
    totalBps: 300,
    ownerBps: 100,
    creatorBps: 100,
    airdropBps: 100,
  }),
  sell: Object.freeze({
    totalBps: 400,
    ownerBps: 125,
    creatorBps: 125,
    airdropBps: 150,
  }),
});

export function validateSplit(side: "buy" | "sell", s: FeeSplit): void {
  const sum = s.ownerBps + s.creatorBps + s.airdropBps;
  if (sum !== s.totalBps) {
    throw new Error(
      `${side}: split sums to ${sum} bps but total is ${s.totalBps} bps`,
    );
  }
  if (s.totalBps <= 0 || s.totalBps > MAX_TAX_BPS) {
    throw new Error(
      `${side}: total tax must be between 1 and ${MAX_TAX_BPS} bps`,
    );
  }
  if (s.airdropBps / s.totalBps < MIN_AIRDROP_SHARE) {
    throw new Error(
      `${side}: airdrop pool must get at least ${MIN_AIRDROP_SHARE * 100}% of the tax`,
    );
  }
  if (
    s.ownerBps / s.totalBps < MIN_PARTY_SHARE ||
    s.creatorBps / s.totalBps < MIN_PARTY_SHARE
  ) {
    throw new Error(
      `${side}: owner and creator must each get at least ${MIN_PARTY_SHARE * 100}% of the tax`,
    );
  }
}

export function validateFeeConfig(cfg: FeeConfig): void {
  validateSplit("buy", cfg.buy);
  validateSplit("sell", cfg.sell);
}

export interface FeeBreakdown {
  gross: bigint;
  owner: bigint;
  creator: bigint;
  airdrop: bigint;
  net: bigint;
}

/** Rounding dust goes to the airdrop pool. */
export function computeFees(amount: bigint, split: FeeSplit): FeeBreakdown {
  const b = BigInt(BPS);
  const owner = (amount * BigInt(split.ownerBps)) / b;
  const creator = (amount * BigInt(split.creatorBps)) / b;
  const totalTax = (amount * BigInt(split.totalBps)) / b;
  return {
    gross: amount,
    owner,
    creator,
    airdrop: totalTax - owner - creator,
    net: amount - totalTax,
  };
}

export interface HolderSnapshot {
  address: string;
  balance: bigint;
}

export interface AirdropAllocation {
  address: string;
  amount: bigint;
}

/** Pro-rata airdrop by balance. Exclude the pool, owner and burn addresses via `exclude`. */
export function computeAirdrop(
  pool: bigint,
  holders: HolderSnapshot[],
  opts: { exclude?: string[]; minBalance?: bigint } = {},
): AirdropAllocation[] {
  const exclude = new Set((opts.exclude ?? []).map((a) => a.toLowerCase()));
  const minBalance = opts.minBalance ?? 0n;
  const eligible = holders.filter(
    (h) =>
      !exclude.has(h.address.toLowerCase()) &&
      h.balance > 0n &&
      h.balance >= minBalance,
  );
  const totalWeight = eligible.reduce((acc, h) => acc + h.balance, 0n);
  if (totalWeight === 0n || pool === 0n) return [];
  return eligible
    .map((h) => ({
      address: h.address,
      amount: (pool * h.balance) / totalWeight,
    }))
    .filter((a) => a.amount > 0n);
}

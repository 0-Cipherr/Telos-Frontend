import { annualCreatorEarnings, type Vault } from "./vaults";

/**
 * Deed pricing is quoted in ETH. This is a fixed reference for the USD
 * estimate shown in the preview UI, not a live price feed.
 */
export const ETH_USD_REFERENCE = 3_200;

/** Suggested ask = this many years of the vault's creator fee stream. */
export const DEED_FEE_MULTIPLE = 3;

/**
 * Deeds are a pons-only market. A deed buys the creator fee stream of a
 * vault launched on pons, and pons pays that stream in the vault's paired
 * Robinhood stock token rather than in ETH.
 */
export const DEED_LAUNCHPAD = "pons";

/** True when a vault's fee stream comes from a pons stock-paired launch. */
export function isPonsDeedVault(vault: Vault): boolean {
  return (
    vault.launchpadStock !== undefined ||
    vault.launchpadToken?.launchpad === DEED_LAUNCHPAD ||
    vault.launchpadTokens?.some((token) => token.launchpad === DEED_LAUNCHPAD) ===
      true ||
    vault.proto === "Pons"
  );
}

/** Stock ticker the deed's fees are paid in, when the vault is pons-paired. */
export function deedStockSymbol(vault: Vault): string | undefined {
  return vault.launchpadStock?.symbol ?? vault.launchpadToken?.pairedWith;
}

/**
 * Local identity used by the wallet-less preview so the buy/sell loop can be
 * demonstrated without Privy. A connected wallet always takes precedence.
 */
export const DEMO_DEED_TRADER =
  "0x7e1e00000000000000000000000000000000beef";

export type DeedListing = {
  id: string;
  vaultId: string;
  /** Display address of the seller. */
  seller: string;
  /** Full seller wallet, used to recognise the current user's listings. */
  sellerAddress?: string;
  /** Ask price in ETH, stored as a decimal string. */
  priceEth: string;
  createdAt: string;
  note?: string;
};

export type DeedOwnership = {
  vaultId: string;
  owner: string;
  acquiredAt: string;
  priceEth: string;
  txHash: string;
};

/** Sample deeds so the market has inventory before anyone lists a vault. */
export const SEED_DEED_LISTINGS: DeedListing[] = [
  {
    id: "DEED-001",
    vaultId: "TL-014",
    seller: "0x7a21…4f8c",
    priceEth: "5.80",
    createdAt: "2026-10-25",
    note: "AAPL-paired pons curve. Fees paid in AAPL.",
  },
  {
    id: "DEED-002",
    vaultId: "TL-016",
    seller: "0x2b91…4d7e",
    priceEth: "5.72",
    createdAt: "2026-10-24",
    note: "NVDA-paired pons curve. Fees paid in NVDA.",
  },
  {
    id: "DEED-003",
    vaultId: "TL-018",
    seller: "0x1f73…c580",
    priceEth: "5.18",
    createdAt: "2026-10-24",
    note: "SPY index pair. Steadier stock-denominated fees.",
  },
  {
    id: "DEED-004",
    vaultId: "TL-017",
    seller: "0x84c0…91b3",
    priceEth: "4.15",
    createdAt: "2026-10-23",
    note: "TSLA-paired pons curve. Fees paid in TSLA.",
  },
  {
    id: "DEED-005",
    vaultId: "TL-020",
    seller: "0x9c35…7a10",
    priceEth: "4.25",
    createdAt: "2026-10-22",
    note: "QQQ index pair. Fees paid in QQQ.",
  },
  {
    id: "DEED-006",
    vaultId: "TL-019",
    seller: "0x6ad2…0f44",
    priceEth: "2.31",
    createdAt: "2026-10-21",
    note: "MSFT-paired pons curve. Small book, high fee share.",
  },
];

export function deedPriceUsd(priceEth: string | number): number {
  const value =
    typeof priceEth === "number" ? priceEth : Number.parseFloat(priceEth);
  return Number.isFinite(value) ? value * ETH_USD_REFERENCE : 0;
}

/** Format an ETH amount for display, without forcing trailing zeroes. */
export function formatEth(value: string | number, digits = 4): string {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return "Ξ 0";
  return `Ξ ${parsed.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })}`;
}

/** Format an ETH amount for an input field. */
export function ethPriceInput(value: string | number): string {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "0";
  return parsed
    .toFixed(4)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}

/** Three years of fees, converted at the fixed ETH reference. */
export function suggestedDeedPriceEth(vault: Vault): number {
  const annualFees = annualCreatorEarnings(vault);
  return Math.max(
    0.1,
    (annualFees * DEED_FEE_MULTIPLE) / ETH_USD_REFERENCE,
  );
}

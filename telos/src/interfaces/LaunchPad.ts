import { OnchainExecutor } from "../onchain/OnchainExecutor";
import type { address } from "../types/solidity-types";

/**
 * Token record returned by `createToken`, shaped so it can be inserted into
 * the database without further transformation. Numeric onchain values are
 * decimal strings so the payload is JSON-safe.
 */
export type TokenCreationResult = {
  launchpad: "hookr" | "pons";
  chainId: number;
  chainName: string;
  /** Address of the ERC-20 created by the launch. */
  tokenAddress: string;
  /** Backwards-compatible alias used by the vault flow. */
  deployedTokenAddress: string;
  name: string;
  ticker: string;
  supply: string;
  decimals: number;
  /** Wallet that signed the launch, when known. */
  deployer?: string;
  /** Creator / fee recipient recorded by the launchpad. */
  creator?: string;
  txHash?: string;
  createdAt: string;
  [key: string]: unknown;
};

/** One asset claimed by `claimRewards`. */
export type ClaimedReward = {
  asset: "native" | "erc20" | "erc6909";
  token?: string;
  symbol?: string;
  amount: string;
  txHash?: string;
  [key: string]: unknown;
};

/** Result of a claim, with the amounts read immediately before claiming. */
export type ClaimRewardsResult = {
  launchpad: "hookr" | "pons";
  /** Address whose reward balance was read and claimed. */
  account: string;
  /** Address that received the rewards. */
  recipient: string;
  claims: ClaimedReward[];
  txHashes: string[];
  [key: string]: unknown;
};

export interface LaunchPad<TLaunchParams = unknown, TClaimParams = unknown> {
  factory: address;
  abi: any[];
  onchainExecutor: OnchainExecutor;
  functionName: string;
  updateFactory(_factory: address): void;
  createToken(params: TLaunchParams): Promise<TokenCreationResult>;
  claimRewards(params?: TClaimParams): Promise<ClaimRewardsResult>;
  updateABI(_abi: any[]): void;
}

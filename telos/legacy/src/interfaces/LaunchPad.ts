import { decodeEventLog } from "viem";
import { OnchainExecutor } from "../onchain/OnchainExecutor";
import type { address } from "../types/solidity-types";
import type {
  ClaimRewardsResult,
  Launchpad,
  TokenCreationResult,
} from "../vaults";
import { SINJOH_FEES, validateFeeConfig, type FeeConfig } from "./SinjohFees";

export * from "./SinjohFees";

export type SinjohLaunchParams = {
  name: string;
  ticker: string;
  supply: string;
  creator: address;
};

export type SinjohClaimParams = {
  account?: address;
  recipient?: address;
};

export type SinjohOptions = {
  factory: address;
  abi: any[];
  onchainExecutor: OnchainExecutor;
  /** Event emitted by the factory on launch. Must exist in the ABI. */
  tokenCreatedEvent?: string;
  /** Name of the field in that event that holds the new token address. */
  tokenAddressField?: string;
  /** Contract that holds rewards (defaults to the factory). */
  rewardsContract?: address;
  /** ABI function names for rewards. Must exist in the ABI. */
  claimableFunction?: string;
  claimFunction?: string;
  /**
   * Maps launch params to the factory call args. Default is
   * [name, ticker, supply, creator]. Override this if your factory also
   * takes the fee config (buy/sell bps) or other arguments.
   */
  buildCreateArgs?: (params: SinjohLaunchParams, fees: FeeConfig) => unknown[];
};

const UINT_RE = /^\d+$/;

export class Sinjoh implements Launchpad {
  factory: address;
  abi: any[];
  onchainExecutor: OnchainExecutor;
  functionName = "createToken";
  fees: FeeConfig;

  private readonly opts: SinjohOptions;

  constructor(options: SinjohOptions) {
    this.factory = options.factory;
    this.abi = options.abi;
    this.onchainExecutor = options.onchainExecutor;
    this.opts = options;

    // Fees are fixed; there is no way to override them per instance.
    validateFeeConfig(SINJOH_FEES);
    this.fees = SINJOH_FEES;
  }

  updateFactory(factory: address): void {
    this.factory = factory;
  }

  updateABI(abi: any[]): void {
    this.abi = abi;
  }

  async createToken(params: SinjohLaunchParams): Promise<TokenCreationResult> {
    if (!params.name.trim() || !params.ticker.trim()) {
      throw new Error("Sinjoh.createToken: name and ticker are required");
    }
    if (!UINT_RE.test(params.supply) || BigInt(params.supply) <= 0n) {
      throw new Error(
        "Sinjoh.createToken: supply must be a positive integer string (base units)",
      );
    }
    this.requireFunction(this.functionName);

    const args = this.opts.buildCreateArgs
      ? this.opts.buildCreateArgs(params, this.fees)
      : [params.name, params.ticker, BigInt(params.supply), params.creator];

    // ASSUMPTION: OnchainExecutor exposes writeContract / waitForTransactionReceipt.
    // Rename these two calls if your executor uses different method names.
    const sent = await this.onchainExecutor.writeContract({
      address: this.factory,
      abi: this.abi,
      functionName: this.functionName,
      args,
    });
    const txHash = typeof sent === "string" ? sent : sent.hash;
    const receipt =
      await this.onchainExecutor.waitForTransactionReceipt(txHash);

    if (receipt.status && receipt.status !== "success") {
      throw new Error(`Sinjoh.createToken: transaction ${txHash} reverted`);
    }

    // Read the token address from the factory's launch event; never guess it.
    const tokenAddress = this.tokenFromReceipt(receipt);

    return {
      tokenAddress,
      txHash,
      name: params.name,
      ticker: params.ticker,
      supply: params.supply,
      creator: params.creator,
    } as unknown as TokenCreationResult;
  }

  async claimRewards(params?: SinjohClaimParams): Promise<ClaimRewardsResult> {
    const target = this.opts.rewardsContract ?? this.factory;
    const claimable = this.opts.claimableFunction ?? "claimable";
    const claim = this.opts.claimFunction ?? "claim";
    this.requireFunction(claimable);
    this.requireFunction(claim);

    const account = params?.account;
    if (!account) {
      throw new Error(
        "Sinjoh.claimRewards: account is required (the wallet whose rewards are claimed)",
      );
    }

    // ASSUMPTION: OnchainExecutor exposes readContract.
    const owed = (await this.onchainExecutor.readContract({
      address: target,
      abi: this.abi,
      functionName: claimable,
      args: [account],
    })) as bigint;

    if (owed === 0n) {
      return {
        claimed: false,
        amount: "0",
        account,
        recipient: params?.recipient ?? account,
      } as unknown as ClaimRewardsResult;
    }

    const claimInputs =
      this.abi.find((f) => f.type === "function" && f.name === claim)?.inputs ??
      [];
    const args =
      claimInputs.length >= 2
        ? [account, params?.recipient ?? account]
        : claimInputs.length === 1
          ? [params?.recipient ?? account]
          : [];

    const sent = await this.onchainExecutor.writeContract({
      address: target,
      abi: this.abi,
      functionName: claim,
      args,
    });
    const txHash = typeof sent === "string" ? sent : sent.hash;
    const receipt =
      await this.onchainExecutor.waitForTransactionReceipt(txHash);
    if (receipt.status && receipt.status !== "success") {
      throw new Error(`Sinjoh.claimRewards: transaction ${txHash} reverted`);
    }

    return {
      claimed: true,
      amount: owed.toString(),
      txHash,
      account,
      recipient: params?.recipient ?? account,
    } as unknown as ClaimRewardsResult;
  }

  private requireFunction(name: string): void {
    const found = this.abi.some(
      (f) => f.type === "function" && f.name === name,
    );
    if (!found) throw new Error(`Sinjoh: function "${name}" not found in ABI`);
  }

  private tokenFromReceipt(receipt: {
    logs: Array<{ data: `0x${string}`; topics: `0x${string}`[] }>;
  }): address {
    const eventName = this.opts.tokenCreatedEvent ?? "TokenCreated";
    const field = this.opts.tokenAddressField ?? "token";

    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: this.abi,
          data: log.data,
          topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
        }) as { eventName?: string; args?: Record<string, unknown> };
        if (decoded.eventName === eventName) {
          const value = decoded.args?.[field];
          if (typeof value === "string" && value.startsWith("0x"))
            return value as address;
        }
      } catch {
        // log from another contract/event; skip
      }
    }
    throw new Error(
      `Sinjoh.createToken: no "${eventName}" event with field "${field}" in the receipt; cannot determine token address`,
    );
  }
}

export default Sinjoh;

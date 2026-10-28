import { decodeEventLog, parseAbi } from "viem";
import { OnchainExecutor } from "../onchain/OnchainExecutor";
import type { address } from "../types/solidity-types";
import type {
  ClaimRewardsResult,
  Launchpad,
  TokenCreationResult,
} from "../vaults";
import { SINJOH_FEES, validateFeeConfig, type FeeConfig } from "./Sinjohfees";

/**
 * Everything is fixed here. There is no per-instance configuration:
 * `new Sinjoh({ onchainExecutor })` is all you need.
 *
 * The ONE value you must fill in is SINJOH_FACTORY: your deployed factory
 * contract address. I can't know it, so it is a zero-address placeholder that
 * makes the class throw a clear error until you set it.
 */
export const SINJOH_FACTORY =
  "0x22f1755c85febcd486acff07fc5a3f5f60504950" as address;

/**
 * Minimal ABI matching the interface this class calls. If your deployed
 * factory differs, edit these lines to match it.
 */
export const SINJOH_ABI = parseAbi([
  "function createToken(string name, string symbol, uint256 supply, address creator) returns (address token)",
  "event TokenCreated(address indexed token, address indexed creator, string name, string symbol, uint256 supply)",
  "function claimable(address account) view returns (uint256)",
  "function claim(address account, address recipient)",
]) as unknown as any[];

const CREATE_FUNCTION = "createToken";
const CLAIMABLE_FUNCTION = "claimable";
const CLAIM_FUNCTION = "claim";
const TOKEN_CREATED_EVENT = "TokenCreated";
const TOKEN_ADDRESS_FIELD = "token";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const UINT_RE = /^\d+$/;

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

export class Sinjoh implements Launchpad {
  readonly id = "sinjoh";
  readonly name = "Sinjoh";
  readonly description =
    "Launch tokens with fixed fees and on-chain reward claims.";
  readonly emoji = "🪙";
  readonly logo = "/launchpads/sinjoh.png";
  readonly chain = "Robinhood Testnet";

  factory: address = SINJOH_FACTORY;
  abi: any[] = SINJOH_ABI;
  onchainExecutor: OnchainExecutor;
  functionName = CREATE_FUNCTION;
  readonly fees: FeeConfig = SINJOH_FEES;

  constructor(options: { onchainExecutor: OnchainExecutor }) {
    this.onchainExecutor = options.onchainExecutor;
    // Fees are fixed; this just guards against a bad edit to SinjohFees.ts.
    validateFeeConfig(SINJOH_FEES);
  }

  updateFactory(factory: address): void {
    this.factory = factory;
  }

  updateABI(abi: any[]): void {
    this.abi = abi;
  }

  async createToken(params: SinjohLaunchParams): Promise<TokenCreationResult> {
    this.requireFactory();
    if (!params.name.trim() || !params.ticker.trim()) {
      throw new Error("Sinjoh.createToken: name and ticker are required");
    }
    if (!UINT_RE.test(params.supply) || BigInt(params.supply) <= 0n) {
      throw new Error(
        "Sinjoh.createToken: supply must be a positive integer string (base units)",
      );
    }
    this.requireFunction(CREATE_FUNCTION);

    // ASSUMPTION: OnchainExecutor exposes writeContract / waitForTransactionReceipt.
    // Rename these calls if your executor uses different method names.
    const sent = await this.onchainExecutor.writeContract({
      address: this.factory,
      abi: this.abi,
      functionName: CREATE_FUNCTION,
      args: [params.name, params.ticker, BigInt(params.supply), params.creator],
    });
    const txHash = typeof sent === "string" ? sent : sent.hash;
    const receipt = await this.onchainExecutor.waitForTransactionReceip(txHash);

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
    this.requireFactory();
    this.requireFunction(CLAIMABLE_FUNCTION);
    this.requireFunction(CLAIM_FUNCTION);

    const account = params?.account;
    if (!account) {
      throw new Error(
        "Sinjoh.claimRewards: account is required (the wallet whose rewards are claimed)",
      );
    }
    const recipient = params?.recipient ?? account;

    // ASSUMPTION: OnchainExecutor exposes readContract.
    const owed = (await this.onchainExecutor.readContract({
      address: this.factory,
      abi: this.abi,
      functionName: CLAIMABLE_FUNCTION,
      args: [account],
    })) as bigint;

    if (owed === 0n) {
      return {
        claimed: false,
        amount: "0",
        account,
        recipient,
      } as unknown as ClaimRewardsResult;
    }

    const sent = await this.onchainExecutor.writeContract({
      address: this.factory,
      abi: this.abi,
      functionName: CLAIM_FUNCTION,
      args: [account, recipient],
    });
    const txHash = typeof sent === "string" ? sent : sent.hash;
    const receipt = await this.onchainExecutor.waitForTransactionReceip(txHash);
    if (receipt.status && receipt.status !== "success") {
      throw new Error(`Sinjoh.claimRewards: transaction ${txHash} reverted`);
    }

    return {
      claimed: true,
      amount: owed.toString(),
      txHash,
      account,
      recipient,
    } as unknown as ClaimRewardsResult;
  }

  private requireFactory(): void {
    if (!this.factory || this.factory.toLowerCase() === ZERO_ADDRESS) {
      throw new Error(
        "Sinjoh: factory address is not set. Fill in SINJOH_FACTORY at the top of Sinjoh.ts.",
      );
    }
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
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: this.abi,
          data: log.data,
          topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
        }) as { eventName?: string; args?: Record<string, unknown> };
        if (decoded.eventName === TOKEN_CREATED_EVENT) {
          const value = decoded.args?.[TOKEN_ADDRESS_FIELD];
          if (typeof value === "string" && value.startsWith("0x"))
            return value as address;
        }
      } catch {
        // log from another contract/event; skip
      }
    }
    throw new Error(
      `Sinjoh.createToken: no "${TOKEN_CREATED_EVENT}" event in the receipt; cannot determine token address`,
    );
  }
}

export default Sinjoh;

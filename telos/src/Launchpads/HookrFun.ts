import {
  HOOKR_1,
  RECAPTURE_OFF,
  RULES_GAS_LIMIT,
  ZERO,
  ZERO_HASH,
  defaultRulesLaunch,
  launcherAbi,
  rulesAbi,
  type RulesConfig,
} from "hookr-sdk";
import { createPublicClient, http, keccak256, toHex } from "viem";
import type {
  ClaimRewardsResult,
  LaunchPad,
  TokenCreationResult,
} from "../interfaces/LaunchPad";
import type { OnchainExecutor } from "../onchain/OnchainExecutor";
import type { address } from "../types/solidity-types";

/**
 * Hookr.fun deployment on Robinhood Chain.
 *
 * Source of truth: https://hookr.fun/docs/reference/contracts-and-addresses
 * A launch mints one ERC-20 and opens one to eight Uniswap V4 pools through
 * HookrLauncher. Every pool freezes its Hook Blocks when it opens.
 */
export const HOOKR_DEPLOYMENT = {
  chainId: 4663,
  chainName: "Robinhood Chain",
  rpc: "https://rpc.mainnet.chain.robinhood.com",
  explorer: "https://robin.etherscan.io",
  launcher: HOOKR_1.contracts.HookrLauncher,
  root: HOOKR_1.contracts.HookrRoot,
  rules: HOOKR_1.contracts.HookrRules,
  registry: HOOKR_1.contracts.HookrRegistry,
  weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
  usdg: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
} as const;

/**
 * Fixed creator-reward terms for every Telos launch.
 *
 * All values are basis points (1e-4). Hookr caps Auto Burn + LP Rewards at
 * 10% of a buy, and the protocol share must sit between 20% and 50%.
 *
 * - 0.5% Auto Burn
 * - 3% LP Rewards
 * - 10% of LP Rewards to the creator royalty
 * - 20% protocol share (the release floor)
 */
export const HOOKR_FIXED_REWARDS = {
  burnBps: 50,
  lpBps: 300,
  potBps: 0,
  royaltyBps: 1_000,
  protocolShareBps: 2_000,
} as const;

/**
 * Fixed launch terms. The opening price, ticks and liquidity are per-launch
 * values, so those stay in `HookrMemberSeed`; everything else is fixed here.
 */
export const HOOKR_FIXED_OPTIONS = {
  supply: 1_000_000_000n * 10n ** 18n,
  baseLpFeePips: 3_000,
  tickSpacing: 60,
  maxFeePips: 23_000,
  quote: HOOKR_DEPLOYMENT.weth,
  /** Dynamic-fee liquidity divisor HookrLauncher binds. */
  dynamicFeeLiquidityDivisor: 0,
  caps: {
    maxLpFeePips: 600_000,
    maxQuoteTakePips: 600_000,
    maxSubjectTakeBps: 1_000,
  },
  /** HookrRules admission gas is exactly 2,000,000; any other value reverts at bind. */
  rulesGasLimit: RULES_GAS_LIMIT,
  /** Read `launchFee()` on chain before sending and pass it as `value`. */
  launchFee: 0n,
} as const;

/** The per-pool values a launch must supply. */
export type HookrMemberSeed = {
  sqrtPriceX96: bigint;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  amount0Max: bigint;
  amount1Max: bigint;
  quote?: address;
  tickSpacing?: number;
  advisory?: address;
  policyId?: `0x${string}`;
  caps?: {
    maxLpFeePips: number;
    maxQuoteTakePips: number;
    maxSubjectTakeBps: number;
  };
  rulesGasLimit?: number;
  advisoryGasLimit?: number;
  advisoryPhases?: number;
  advisoryFailOpen?: boolean;
  recapture?: typeof RECAPTURE_OFF;
};

export type HookrLaunchOptions = {
  name: string;
  symbol: string;
  supply?: bigint;
  salt?: `0x${string}`;
  /** Receives the creator royalty. */
  creator?: address;
  /** Pre-built HookrLauncher.Member[] (takes precedence over `seed`). */
  members?: any[];
  /** Build one WETH-quoted member with the fixed reward terms. */
  seed?: HookrMemberSeed;
  deadline?: bigint;
  /** Native launch fee + native liquidity budget. */
  value?: bigint;
  /** Address predicted by HookrLauncher.predictToken, when available. */
  tokenAddress?: address;
};

/** Options for claiming the creator royalty held by a pool's HookrRules. */
export type HookrClaimOptions = {
  /** New-token address. Its currency side is claimed alongside the quote. */
  tokenAddress?: address;
  /** Rules module holding the claim. Defaults to the release HookrRules. */
  rules?: address;
  /** Explicit currencies to check. Defaults to [tokenAddress, quote]. */
  currencies?: address[];
  /** Receives the rewards. Defaults to the executor account. */
  recipient?: address;
  /** Take the claim as Uniswap v4 ERC-6909 claims instead of tokens. */
  asClaims?: boolean;
  /** Skip balances at or below this amount, as a decimal string. */
  minAmount?: string | number | bigint;
  /** Read the claimable amounts without sending a transaction. */
  preview?: boolean;
};

function randomSalt(): `0x${string}` {
  return keccak256(
    toHex(`${Date.now()}-${Math.random()}-${Math.random()}`),
  );
}

/** Read-only client used to predict the token address before the launch. */
const hookrReadClient = createPublicClient({
  transport: http(HOOKR_DEPLOYMENT.rpc),
});

export class HookrFun
  implements LaunchPad<HookrLaunchOptions, HookrClaimOptions>
{
  factory: address;
  abi: any[];
  onchainExecutor: OnchainExecutor;
  functionName: string;

  readonly fixedOptions = HOOKR_FIXED_OPTIONS;
  readonly rewards = HOOKR_FIXED_REWARDS;

  constructor(
    _factory: address,
    _abi: any[],
    _onchainExecutor: OnchainExecutor,
    _functionName: string,
  ) {
    this.factory = _factory;
    this.abi = _abi;
    this.onchainExecutor = _onchainExecutor;
    this.functionName = _functionName;
  }

  updateFactory(_factory: address) {
    this.factory = _factory;
  }

  updateABI(_abi: any[]) {
    this.abi = _abi;
  }

  /**
   * The RulesConfig every Telos Hookr launch uses. Hookr SDK defaults are
   * kept for the non-reward knobs (Anti-Snipe, dynamic fees, buy cap).
   */
  buildFixedRules(creator?: address): RulesConfig {
    const defaults = defaultRulesLaunch({ creator }).rules;
    return {
      ...defaults,
      ...HOOKR_FIXED_REWARDS,
      royaltyBps: creator ? HOOKR_FIXED_REWARDS.royaltyBps : 0,
      royaltyTo: creator ?? ZERO,
      integrator: ZERO,
    };
  }

  /** Build a WETH-quoted member with the fixed caps, gas and reward terms. */
  buildMember(seed: HookrMemberSeed, creator?: address) {
    const quote = seed.quote ?? this.fixedOptions.quote;
    return {
      quote,
      tickSpacing: seed.tickSpacing ?? this.fixedOptions.tickSpacing,
      sqrtPriceX96: seed.sqrtPriceX96,
      tickLower: seed.tickLower,
      tickUpper: seed.tickUpper,
      liquidity: seed.liquidity,
      amount0Max: seed.amount0Max,
      amount1Max: seed.amount1Max,
      config: {
        subject: ZERO, // HookrLauncher fills in the new token.
        quote,
        rules: HOOKR_DEPLOYMENT.rules,
        advisory: seed.advisory ?? ZERO,
        liquidityOwner: this.factory,
        baseLpFeePips: this.fixedOptions.baseLpFeePips,
        caps: seed.caps ?? this.fixedOptions.caps,
        rulesGasLimit:
          seed.rulesGasLimit ?? this.fixedOptions.rulesGasLimit,
        advisoryGasLimit: seed.advisoryGasLimit ?? 0,
        advisoryPhases: seed.advisoryPhases ?? 0,
        advisoryFailOpen: seed.advisoryFailOpen ?? false,
        policyId: seed.policyId ?? ZERO_HASH,
      },
      rules: this.buildFixedRules(creator),
      recapture: seed.recapture ?? RECAPTURE_OFF,
    };
  }

  /**
   * Deploy one Hookr launch and return the DB-ready token record.
   *
   * Pass a `HookrLaunchOptions` object directly. Either pass fully built
   * `members` (for multi-pool or dev-buy launches) or a `seed` for a single
   * WETH pool with the fixed reward terms.
   *
   * The token address is read from `HookrLauncher.predictToken` before the
   * transaction is sent, so the record can be uploaded immediately even
   * though the launch result is not awaited here.
   */
  async createToken(params: HookrLaunchOptions): Promise<TokenCreationResult> {
    try {
      const options = this.resolveOptions(params);
      const deployer = this.onchainExecutor.getAccountAddress();
      /** Royalty recipient. Falls back to the signer so rewards stay claimable. */
      const creator = options.creator ?? deployer;
      const members =
        options.members?.length
          ? options.members
          : options.seed
            ? [this.buildMember(options.seed, creator)]
            : [];

      if (!members.length) {
        throw new Error("Hookr launch needs members or a pool seed");
      }

      const token = {
        existing: ZERO,
        name: options.name,
        symbol: options.symbol,
        supply: options.supply ?? this.fixedOptions.supply,
        salt: options.salt ?? randomSalt(),
      };
      const deadline =
        options.deadline ??
        BigInt(Math.floor(Date.now() / 1000) + 20 * 60);

      let tokenAddress = options.tokenAddress;
      let predictionError: string | undefined;
      if (!tokenAddress && deployer) {
        try {
          tokenAddress = (await hookrReadClient.readContract({
            address: this.factory,
            abi: launcherAbi,
            functionName: "predictToken",
            args: [deployer, token],
          })) as address;
        } catch (error) {
          // A failed prediction must not block a valid launch; the caller can
          // backfill the address from the FamilyLaunched event.
          predictionError =
            error instanceof Error ? error.message : String(error);
          console.log(error);
        }
      }

      const txHash = await this.onchainExecutor.writeContract({
        abi: this.abi,
        address: this.factory,
        functionName: this.functionName,
        args: [token, HOOKR_DEPLOYMENT.root, members, deadline],
        value: options.value ?? this.fixedOptions.launchFee,
      });

      return {
        launchpad: "hookr",
        chainId: HOOKR_DEPLOYMENT.chainId,
        chainName: HOOKR_DEPLOYMENT.chainName,
        explorer: HOOKR_DEPLOYMENT.explorer,
        tokenAddress: tokenAddress ?? "",
        deployedTokenAddress: tokenAddress ?? "",
        name: token.name,
        ticker: token.symbol,
        supply: token.supply.toString(),
        decimals: 18,
        deployer: deployer ?? "",
        creator: creator ?? "",
        feeReceiver: creator ?? "",
        salt: token.salt,
        deadline: deadline.toString(),
        factory: this.factory,
        launcher: this.factory,
        root: HOOKR_DEPLOYMENT.root,
        rules: HOOKR_DEPLOYMENT.rules,
        quote: members[0]?.quote ?? this.fixedOptions.quote,
        pools: members.map((member) => this.describeMember(member)),
        rewards: HOOKR_FIXED_REWARDS,
        launchFee: (options.value ?? this.fixedOptions.launchFee).toString(),
        /** Vault-shaped metadata for the created token and its quote. */
        launchpadToken: {
          launchpad: "hookr",
          symbol: token.symbol,
          name: token.name,
          address: tokenAddress ?? "",
          logo: "/launchpads/hookr.png",
          pairedWith: "WETH",
          pairAddress: this.fixedOptions.quote,
        },
        txHash: txHash ?? "",
        createdAt: new Date().toISOString(),
        tokenAddressPredicted: Boolean(tokenAddress),
        tokenAddressPredictionError: predictionError,
      };
    } catch (error) {
      console.log(error);
      throw error instanceof Error ? error : new Error("Could not create Token");
    }
  }

  /**
   * Claim this executor's creator royalty from a Hookr pool's Rules module.
   *
   * Royalties are held per currency until claimed. By default the launched
   * token and the WETH quote are both checked; pass `currencies` to check
   * others. Hookr pays only the caller's own claim, so the executor account
   * must be the royalty `royaltyTo` address (or its fee receiver).
   *
   * Pass a `HookrClaimOptions` object directly. Use `{ preview: true }` to
   * read the amounts without sending a transaction.
   */
  async claimRewards(
    params: HookrClaimOptions = {},
  ): Promise<ClaimRewardsResult> {
    try {
      const options = params;
      const account = this.onchainExecutor.getAccountAddress();
      if (!account) {
        throw new Error("Hookr claim needs a connected executor account");
      }

      const rulesAddress = options.rules ?? HOOKR_DEPLOYMENT.rules;
      const recipient = options.recipient ?? account;
      const minAmount = BigInt(options.minAmount ?? 0);
      const currencies = this.resolveClaimCurrencies(options);
      const claims: ClaimRewardsResult["claims"] = [];
      const seen = new Set<string>();

      for (const currency of currencies) {
        const key = currency.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        const amount = (await hookrReadClient.readContract({
          address: rulesAddress,
          abi: rulesAbi,
          functionName: "claimable",
          args: [currency, account],
        })) as bigint;

        if (amount <= minAmount) continue;

        const claim: ClaimRewardsResult["claims"][number] = {
          asset: options.asClaims ? "erc6909" : "erc20",
          token: currency,
          symbol:
            currency.toLowerCase() ===
            this.fixedOptions.quote.toLowerCase()
              ? "WETH"
              : undefined,
          amount: amount.toString(),
        };

        if (!options.preview) {
          claim.txHash = await this.onchainExecutor.writeContract({
            abi: rulesAbi,
            address: rulesAddress,
            functionName: options.asClaims ? "claimAsClaims" : "claimTo",
            args: [currency, recipient],
          }) ?? undefined;
        }

        claims.push(claim);
      }

      return {
        launchpad: "hookr",
        account,
        recipient,
        rules: rulesAddress,
        asClaims: options.asClaims ?? false,
        preview: options.preview ?? false,
        tokenAddress: options.tokenAddress ?? "",
        claims,
        txHashes: claims.flatMap((claim) =>
          claim.txHash ? [claim.txHash] : [],
        ),
        claimedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.log(error);
      throw error instanceof Error
        ? error
        : new Error("Could not claim Hookr rewards");
    }
  }

  /** Flatten a launch member into JSON-safe pool metadata for the database. */
  private describeMember(member: any) {
    return {
      quote: member.quote,
      tickSpacing: member.tickSpacing,
      sqrtPriceX96: member.sqrtPriceX96?.toString() ?? "",
      tickLower: member.tickLower,
      tickUpper: member.tickUpper,
      liquidity: member.liquidity?.toString() ?? "",
      amount0Max: member.amount0Max?.toString() ?? "",
      amount1Max: member.amount1Max?.toString() ?? "",
      rules: member.config?.rules ?? HOOKR_DEPLOYMENT.rules,
      baseLpFeePips: member.config?.baseLpFeePips ?? null,
      maxLpFeePips: member.config?.caps?.maxLpFeePips ?? null,
      maxQuoteTakePips: member.config?.caps?.maxQuoteTakePips ?? null,
      maxSubjectTakeBps: member.config?.caps?.maxSubjectTakeBps ?? null,
    };
  }

  private resolveClaimCurrencies(options: HookrClaimOptions): address[] {
    if (options.currencies?.length) return options.currencies;
    return options.tokenAddress
      ? [options.tokenAddress, this.fixedOptions.quote]
      : [this.fixedOptions.quote];
  }

  private resolveOptions(params: HookrLaunchOptions): HookrLaunchOptions {
    if (!params?.name || !params?.symbol) {
      throw new Error("Hookr launch needs a name and symbol");
    }
    return { ...params };
  }
}

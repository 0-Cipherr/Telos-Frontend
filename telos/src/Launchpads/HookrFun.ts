import {
  HOOKR_1,
  RECAPTURE_OFF,
  RULES_GAS_LIMIT,
  ZERO,
  ZERO_HASH,
  defaultRulesLaunch,
  type RulesConfig,
} from "hookr-sdk";
import { keccak256, toHex } from "viem";
import type { LaunchPad } from "../interfaces/LaunchPad";
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

function randomSalt(): `0x${string}` {
  return keccak256(
    toHex(`${Date.now()}-${Math.random()}-${Math.random()}`),
  );
}

export class HookrFun implements LaunchPad {
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
   * Deploy one Hookr launch.
   *
   * `encodedParams` is a JSON string of `HookrLaunchOptions`. Either pass
   * fully built `members` (for multi-pool or dev-buy launches) or a `seed`
   * for a single WETH pool with the fixed reward terms.
   */
  async createToken(encodedParams: string) {
    try {
      const options = this.resolveOptions(encodedParams);
      const members =
        options.members?.length
          ? options.members
          : options.seed
            ? [this.buildMember(options.seed, options.creator)]
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

      await this.onchainExecutor.writeContract({
        abi: this.abi,
        address: this.factory,
        functionName: this.functionName,
        args: [token, HOOKR_DEPLOYMENT.root, members, deadline],
        value: options.value ?? this.fixedOptions.launchFee,
      });

      return {
        name: token.name,
        ticker: token.symbol,
        deployedTokenAddress: options.tokenAddress ?? "",
      };
    } catch (error) {
      console.log(error);
      throw new Error("Could not create Token");
    }
  }

  private resolveOptions(encodedParams: string): HookrLaunchOptions {
    let parsed: Partial<HookrLaunchOptions> = {};
    if (encodedParams?.trim()) {
      try {
        parsed = JSON.parse(encodedParams) as Partial<HookrLaunchOptions>;
      } catch {
        throw new Error("Hookr launch params must be a JSON object");
      }
    }

    if (!parsed.name || !parsed.symbol) {
      throw new Error("Hookr launch needs a name and symbol");
    }
    return parsed as HookrLaunchOptions;
  }
}

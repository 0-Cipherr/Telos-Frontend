import { createPublicClient, http, keccak256, toHex } from "viem";
import type { LaunchPad } from "../interfaces/LaunchPad";
import type { OnchainExecutor } from "../onchain/OnchainExecutor";
import type { address } from "../types/solidity-types";

/**
 * pons (ponsfamily.com) deployment on Robinhood Chain.
 *
 * Source of truth: https://docs.ponsfamily.com (Contracts section).
 * Every pons v2 launch mints a fixed-supply ERC-20 on a bonding curve. The
 * curve is priced in a pons-approved pair token and graduates into a Uniswap
 * v4 pool paired against that same token.
 *
 * Telos launches use a tokenized Robinhood stock as the pair token, so buyers
 * spend that stock, sellers receive it back, and creator fees are paid in it.
 */
export const PONS_DEPLOYMENT = {
  chainId: 4663,
  chainName: "Robinhood Chain",
  rpc: "https://rpc.mainnet.chain.robinhood.com",
  explorer: "https://robin.etherscan.io",
  /** Current pons v2 factory (stock pairs, Uniswap v4 graduation). */
  factory: "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e",
  locker: "0x267444D099b10fB5Ed7c3Cc7B7c767AdcA574952",
  memeHook: "0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044",
  feeEscrow: "0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e",
  buybackVault: "0x42df2a798f82289E177311362e8f5ccC45c1219c",
  launchAndBuy: "0xe33E9E479dF8802cb0866d5d05258bEc4cF62948",
  launchDeployer: "0x3711ceA4feaDE896C913C68F01Eda97Cb06D1A42",
  graduationExecutor: "0xC7819B64A1dAECD7eC19856d026cb14EfBd89046",
  graduationGuard: "0xf5695117b99B6f6401e67d4195BD653628176C6C",
  /** v1 stack, retained for older launches and vault metadata. */
  legacyFactory: "0xA5aAb3F0c6EeadF30Ef1D3Eb997108E976351feB",
  legacyLocker: "0x736D76699C26D0d966744cAe304C000d471f7F35",
  v1LegacyFactory: "0x0c37a24F5D23A486FA692d1500881d698B1F77a4",
  v1LegacyLocker: "0x31ca5E101941A93A7DD6d0497928700625CF54B5",
  /** v1 Uniswap v3 stack, retained for older launches. */
  v3Factory: "0x1f7d7550B1b028f7571E69A784071F0205FD2EfA",
  positionManager: "0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3",
  swapRouter: "0xCaf681a66D020601342297493863E78C959E5cb2",
  quoterV2: "0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7",
  weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
} as const;

/**
 * Fixed pons v2 launch terms. The factory snapshots these per launch, so they
 * are intentionally not editable in the UI.
 *
 * - Launch config 0 is the active config on the factory.
 * - Supply is 1,000,000,000 tokens (18 decimals).
 * - Curve fee is 1% (100 bps); graduated pool fee is 0 because pons charges
 *   its fee inside the hook, and tick spacing is 200.
 * - Creator tax is 0, so buyers pay only the standard pons fee.
 * - Buybacks are off, so the creator/vault share stays in the pairing stock
 *   instead of being converted into the launch token.
 * - The launch fee is 0.0005 ETH.
 *
 * The per-stock graduation threshold is not hardcoded: pons stores it in
 * `pairTokenEconomics(stock)` and `previewLaunchEconomics` pins the exact
 * terms for each launch.
 */
export const PONS_FIXED_OPTIONS = {
  launchConfigId: 0n,
  launchFee: 500_000_000_000_000n,
  supply: 1_000_000_000n * 10n ** 18n,
  curveFeeBps: 100,
  poolFee: 0,
  tickSpacing: 200,
  creatorTaxBps: 0,
  buybackEnabled: false,
} as const;

/** A Robinhood Chain tokenized stock / ETF (ERC-20, 18 decimals). */
export type PonsStockToken = {
  symbol: string;
  name: string;
  address: address;
  /** Canonical Robinhood asset logo. */
  logo: string;
};

/**
 * Fixed stock universe used by the pons launch flow.
 *
 * The addresses are the canonical Robinhood Stock Token contracts on chain
 * 4663, not look-alike tokens. Every address here is approved by the pons
 * factory as a pair token. Keep this list fixed so a vault always records a
 * verifiable stock address.
 */
export const PONS_STOCK_TOKENS: PonsStockToken[] = [
  {
    symbol: "AAPL",
    name: "Apple",
    address: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9",
    logo: "https://cdn.robinhood.com/ncw_assets/logos/0xaf3d76f1834a1d425780943c99ea8a608f8a93f9.png",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA",
    address: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC",
    logo: "https://cdn.robinhood.com/ncw_assets/logos/0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec.png",
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    address: "0xe93237C50D904957Cf27E7B1133b510C669c2e74",
    logo: "https://cdn.robinhood.com/ncw_assets/logos/0xe93237c50d904957cf27e7b1133b510c669c2e74.png",
  },
  {
    symbol: "AMZN",
    name: "Amazon",
    address: "0x12f190a9F9d7D37a250758b26824B97CE941bF54",
    logo: "https://cdn.robinhood.com/ncw_assets/logos/0x12f190a9f9d7d37a250758b26824b97ce941bf54.png",
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Class A",
    address: "0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3",
    logo: "https://cdn.robinhood.com/ncw_assets/logos/0x2e0847e8910a9732eb3fb1bb4b70a580adad4fe3.png",
  },
  {
    symbol: "META",
    name: "Meta Platforms",
    address: "0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35",
    logo: "https://cdn.robinhood.com/ncw_assets/logos/0xc0d6457c16cc70d6790dd43521c899c87ce02f35.png",
  },
  {
    symbol: "TSLA",
    name: "Tesla",
    address: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d",
    logo: "https://cdn.robinhood.com/ncw_assets/logos/0x322f0929c4625ed5bad873c95208d54e1c003b2d.png",
  },
  {
    symbol: "NFLX",
    name: "Netflix",
    address: "0xE0444EF8BF4eD74f74FD73686e2ddF4C1c5591E8",
    logo: "https://cdn.robinhood.com/ncw_assets/logos/0xe0444ef8bf4ed74f74fd73686e2ddf4c1c5591e8.png",
  },
  {
    symbol: "SPY",
    name: "SPDR S&P 500 ETF Trust",
    address: "0x117cc2133c37B721F49dE2A7a74833232B3B4C0C",
    logo: "https://cdn.robinhood.com/ncw_assets/logos/0x117cc2133c37b721f49de2a7a74833232b3b4c0c.png",
  },
  {
    symbol: "QQQ",
    name: "Invesco QQQ",
    address: "0xD5f3879160bc7c32ebb4dC785F8a4F505888de68",
    logo: "https://cdn.robinhood.com/ncw_assets/logos/0xd5f3879160bc7c32ebb4dc785f8a4f505888de68.png",
  },
];

export type PonsSocials = {
  twitter: string;
  telegram: string;
  discord: string;
  website: string;
  farcaster: string;
};

export type PonsTokenOptions = {
  name: string;
  symbol: string;
  description?: string;
  /** Defaults to the selected stock's logo when one is chosen. */
  logo?: string;
  socials?: Partial<PonsSocials>;
  /**
   * Receives creator fees. pons pays them in the selected stock. For a Telos
   * vault this should be the vault's fee receiver/splitter so the stock
   * rewards reach vault users.
   */
  feeWallet: address;
  /**
   * Stock symbol or contract address from PONS_STOCK_TOKENS. Required: the
   * selected stock becomes the pons pair token and the reward asset.
   */
  stock: string;
  salt?: `0x${string}`;
};

const EMPTY_SOCIALS: PonsSocials = {
  twitter: "",
  telegram: "",
  discord: "",
  website: "",
  farcaster: "",
};

type PonsLaunchConfig = {
  supply: bigint;
  curveFeeBps: bigint;
  phantomQuote: bigint;
  graduationThreshold: bigint;
  poolFee: number;
  tickSpacing: number;
  enabled: boolean;
};

/** Minimal ABI for PonsV2LaunchFactory.launchToken + the read helpers we use. */
export const PONS_ABI: any[] = [  {
    type: "function",
    name: "launchToken",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "logo", type: "string" },
          { name: "description", type: "string" },
          {
            name: "socials",
            type: "tuple",
            components: [
              { name: "twitter", type: "string" },
              { name: "telegram", type: "string" },
              { name: "discord", type: "string" },
              { name: "website", type: "string" },
              { name: "farcaster", type: "string" },
            ],
          },
          { name: "creatorFeeRecipient", type: "address" },
          { name: "creatorTaxBps", type: "uint16" },
          { name: "buybackEnabled", type: "bool" },
          { name: "expectedEconomics", type: "bytes32" },
          { name: "salt", type: "bytes32" },
        ],
      },
      { name: "launchConfigId", type: "uint256" },
      { name: "pairToken", type: "address" },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "curve", type: "address" },
    ],
  },
  {
    type: "function",
    name: "previewLaunchEconomics",
    stateMutability: "view",
    inputs: [
      { name: "launchConfigId", type: "uint256" },
      { name: "pairToken", type: "address" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "approvedPairTokens",
    stateMutability: "view",
    inputs: [{ name: "pairToken", type: "address" }],
    outputs: [{ name: "approved", type: "bool" }],
  },
  {
    type: "function",
    name: "pairTokenEconomics",
    stateMutability: "view",
    inputs: [{ name: "pairToken", type: "address" }],
    outputs: [
      { name: "phantomQuote", type: "uint256" },
      { name: "graduationThreshold", type: "uint256" },
      { name: "decimals", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "launchFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "launchEnabled",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "canLaunch",
    stateMutability: "view",
    inputs: [{ name: "launcher", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getLaunchConfig",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "supply", type: "uint256" },
          { name: "curveFeeBps", type: "uint256" },
          { name: "phantomQuote", type: "uint256" },
          { name: "graduationThreshold", type: "uint256" },
          { name: "poolFee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "enabled", type: "bool" },
        ],
      },
    ],
  },
];

function randomSalt(): `0x${string}` {
  return keccak256(
    toHex(`${Date.now()}-${Math.random()}-${Math.random()}`),
  );
}

/** Read-only client used to pin pons economics before sending the launch. */
const ponsReadClient = createPublicClient({
  transport: http(PONS_DEPLOYMENT.rpc),
});

export class Pons implements LaunchPad {
  factory: address;
  abi: any[];
  onchainExecutor: OnchainExecutor;
  functionName: string;

  /** Fixed pons terms, shared by every launch. */
  readonly fixedOptions = PONS_FIXED_OPTIONS;
  /** Fixed stock universe shown in the create-vault flow. */
  readonly stocks = PONS_STOCK_TOKENS;

  private readonly defaults: Partial<PonsTokenOptions>;

  constructor(
    _factory: address,
    _abi: any[],
    _onchainExecutor: OnchainExecutor,
    _functionName: string,
    _defaults: Partial<PonsTokenOptions> = {},
  ) {
    this.factory = _factory;
    this.abi = _abi;
    this.onchainExecutor = _onchainExecutor;
    this.functionName = _functionName;
    this.defaults = _defaults;
  }

  updateFactory(_factory: address) {
    this.factory = _factory;
  }

  updateABI(_abi: any[]) {
    this.abi = _abi;
  }

  /** Look up a stock by ticker or canonical address. */
  getStock(symbolOrAddress?: string): PonsStockToken | undefined {
    if (!symbolOrAddress) return undefined;
    const needle = symbolOrAddress.trim().toLowerCase();
    return this.stocks.find(
      (stock) =>
        stock.symbol.toLowerCase() === needle ||
        stock.address.toLowerCase() === needle,
    );
  }

  /**
   * Deploy one pons token paired against a Robinhood stock.
   *
   * `encodedParams` is a JSON string of `PonsTokenOptions`. The selected stock
   * is passed to pons as `pairToken`, so it is the quote asset of the curve
   * and of the graduated Uniswap v4 pool. `feeWallet` is the creator fee
   * recipient; pons pays that recipient in the pair token, which means the
   * vault's stock rewards accrue in the stock rather than in ETH.
   */
  async createToken(encodedParams: string) {
    try {
      const options = this.resolveOptions(encodedParams);
      const stock = this.getStock(options.stock);

      if (!stock) {
        throw new Error(`Unknown pons stock token: ${options.stock}`);
      }

      const pairToken = stock.address;

      const [launchEnabled, approved, economics, launchFee, config] =
        await Promise.all([
          ponsReadClient.readContract({
            address: this.factory,
            abi: PONS_ABI,
            functionName: "launchEnabled",
          }) as Promise<boolean>,
          ponsReadClient.readContract({
            address: this.factory,
            abi: PONS_ABI,
            functionName: "approvedPairTokens",
            args: [pairToken],
          }) as Promise<boolean>,
          ponsReadClient.readContract({
            address: this.factory,
            abi: PONS_ABI,
            functionName: "pairTokenEconomics",
            args: [pairToken],
          }) as Promise<readonly [bigint, bigint, number]>,
          ponsReadClient.readContract({
            address: this.factory,
            abi: PONS_ABI,
            functionName: "launchFee",
          }) as Promise<bigint>,
          ponsReadClient.readContract({
            address: this.factory,
            abi: PONS_ABI,
            functionName: "getLaunchConfig",
            args: [this.fixedOptions.launchConfigId],
          }) as Promise<PonsLaunchConfig>,
        ]);

      if (!launchEnabled) {
        throw new Error("Pons launches are currently disabled");
      }
      if (!config.enabled) {
        throw new Error(
          `Pons launch config ${this.fixedOptions.launchConfigId} is disabled`,
        );
      }
      if (
        config.supply !== this.fixedOptions.supply ||
        config.curveFeeBps !== BigInt(this.fixedOptions.curveFeeBps) ||
        config.poolFee !== this.fixedOptions.poolFee ||
        config.tickSpacing !== this.fixedOptions.tickSpacing
      ) {
        throw new Error(
          `Pons launch config ${this.fixedOptions.launchConfigId} no longer matches the fixed Telos terms`,
        );
      }
      if (!approved) {
        throw new Error(`${stock.symbol} is not an approved pons pair token`);
      }

      const [phantomQuote, graduationThreshold, quoteDecimals] = economics;
      if (phantomQuote === 0n || graduationThreshold === 0n) {
        throw new Error(`Pons has no economics configured for ${stock.symbol}`);
      }

      // Pin the exact economics immediately before launching. If pons changes
      // the config between this read and the transaction, the launch reverts
      // instead of settling on terms we did not quote.
      const expectedEconomics = (await ponsReadClient.readContract({
        address: this.factory,
        abi: PONS_ABI,
        functionName: "previewLaunchEconomics",
        args: [this.fixedOptions.launchConfigId, pairToken],
      })) as `0x${string}`;

      const tokenParams = {
        name: options.name,
        symbol: options.symbol,
        logo: options.logo ?? stock.logo,
        description:
          options.description ??
          `${stock.name} stock-paired launch on pons.`,
        socials: { ...EMPTY_SOCIALS, ...options.socials },
        // pons pays this recipient in `pairToken`, so the vault earns stock.
        creatorFeeRecipient: options.feeWallet,
        creatorTaxBps: this.fixedOptions.creatorTaxBps,
        // Keep the creator share in stock instead of buying back the launch
        // token; buybacks would divert part of the reward into the token.
        buybackEnabled: this.fixedOptions.buybackEnabled,
        expectedEconomics,
        salt: options.salt ?? randomSalt(),
      };

      await this.onchainExecutor.writeContract({
        abi: this.abi,
        address: this.factory,
        functionName: this.functionName,
        args: [
          tokenParams,
          this.fixedOptions.launchConfigId,
          pairToken,
        ],
        value: launchFee,
      });

      return {
        name: tokenParams.name,
        ticker: tokenParams.symbol,
        deployedTokenAddress: "",
        /** Stock the launch is paired against and paid out in. */
        stock: stock.address,
        stockSymbol: stock.symbol,
        pairToken,
        rewardToken: stock.address,
        /** pons creator fees accrue to this recipient in the stock token. */
        stockRewards: {
          token: stock.address,
          symbol: stock.symbol,
          recipient: options.feeWallet,
        },
        expectedEconomics,
        launchFee,
        economics: {
          phantomQuote,
          graduationThreshold,
          quoteDecimals,
        },
      };
    } catch (error) {
      console.log(error);
      throw error instanceof Error ? error : new Error("Could not create Token");
    }
  }

  private resolveOptions(encodedParams: string): PonsTokenOptions {
    let parsed: Partial<PonsTokenOptions> = {};
    if (encodedParams?.trim()) {
      try {
        parsed = JSON.parse(encodedParams) as Partial<PonsTokenOptions>;
      } catch {
        throw new Error("Pons launch params must be a JSON object");
      }
    }

    const options = { ...this.defaults, ...parsed };
    if (!options.name || !options.symbol) {
      throw new Error("Pons launch needs a name and symbol");
    }
    if (!options.feeWallet) {
      throw new Error("Pons launch needs a fee wallet");
    }
    if (!options.stock) {
      throw new Error("Pons launch needs a stock pair token");
    }
    if (!this.getStock(options.stock)) {
      throw new Error(`Unknown pons stock token: ${options.stock}`);
    }
    return options as PonsTokenOptions;
  }
}

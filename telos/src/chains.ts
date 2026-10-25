import {
  NetworkArbitrumOne,
  NetworkAurora,
  NetworkAvalanche,
  NetworkBase,
  NetworkBerachain,
  NetworkBinanceSmartChain,
  NetworkBlast,
  NetworkBob,
  NetworkCelo,
  NetworkCore,
  NetworkEthereum,
  NetworkFantom,
  NetworkGnosis,
  NetworkInk,
  NetworkKava,
  NetworkLinea,
  NetworkLisk,
  NetworkMantle,
  NetworkMetisAndromeda,
  NetworkMode,
  NetworkMoonbeam,
  NetworkOpbnb,
  NetworkOptimism,
  NetworkPolygon,
  NetworkPolygonZkevm,
  NetworkRobinhood,
  NetworkScroll,
  NetworkSeiNetwork,
  NetworkSonic,
  NetworkTaiko,
  NetworkTelos,
  NetworkUnichain,
  NetworkWorld,
  NetworkZksync,
  NetworkZora,
} from "@web3icons/react";

/** Shared icon component type for every network returned by @web3icons/react. */
export type EvmChainIcon = typeof NetworkEthereum;

export type EvmChain = {
  /** Canonical name used in vault data and form state. */
  name: string;
  /** Short display name used on dense cards. */
  short: string;
  /** Icon from @web3icons/react. */
  Icon: EvmChainIcon;
  /** Block explorer base URL (append a tx hash). */
  explorer: string;
  /** Accepted aliases for chat intake and free-text search. */
  aliases: string[];
};

/**
 * Every EVM network the product is targeting.
 *
 * This is the single source of truth for:
 *  - the create-vault launchpad/network picker
 *  - vault filters
 *  - chat strategy intake ("ethereum", "eth", "arb", ...)
 *
 * Add or remove a network here and every picker/filter updates automatically.
 */
export const EVM_CHAINS: EvmChain[] = [
  {
    name: "Ethereum",
    short: "ETH",
    Icon: NetworkEthereum,
    explorer: "https://etherscan.io/tx/",
    aliases: ["ethereum", "eth", "mainnet", "ethereum mainnet"],
  },
  {
    name: "Base",
    short: "BASE",
    Icon: NetworkBase,
    explorer: "https://basescan.org/tx/",
    aliases: ["base", "base mainnet"],
  },
  {
    name: "Arbitrum",
    short: "ARB",
    Icon: NetworkArbitrumOne,
    explorer: "https://arbiscan.io/tx/",
    aliases: ["arbitrum", "arb", "arbitrum one"],
  },
  {
    name: "Optimism",
    short: "OP",
    Icon: NetworkOptimism,
    explorer: "https://optimistic.etherscan.io/tx/",
    aliases: ["optimism", "op", "op mainnet", "optimistic"],
  },
  {
    name: "Polygon",
    short: "POL",
    Icon: NetworkPolygon,
    explorer: "https://polygonscan.com/tx/",
    aliases: ["polygon", "matic", "pol"],
  },
  {
    name: "BNB Chain",
    short: "BNB",
    Icon: NetworkBinanceSmartChain,
    explorer: "https://bscscan.com/tx/",
    aliases: ["bnb", "bsc", "bnb chain", "binance", "binance smart chain"],
  },
  {
    name: "Avalanche",
    short: "AVAX",
    Icon: NetworkAvalanche,
    explorer: "https://snowtrace.io/tx/",
    aliases: ["avalanche", "avax", "avalanche c-chain"],
  },
  {
    name: "Linea",
    short: "LINEA",
    Icon: NetworkLinea,
    explorer: "https://lineascan.build/tx/",
    aliases: ["linea"],
  },
  {
    name: "Scroll",
    short: "SCR",
    Icon: NetworkScroll,
    explorer: "https://scrollscan.com/tx/",
    aliases: ["scroll"],
  },
  {
    name: "zkSync",
    short: "ZK",
    Icon: NetworkZksync,
    explorer: "https://explorer.zksync.io/tx/",
    aliases: ["zksync", "zk sync", "zksync era", "era"],
  },
  {
    name: "Blast",
    short: "BLAST",
    Icon: NetworkBlast,
    explorer: "https://blastscan.io/tx/",
    aliases: ["blast"],
  },
  {
    name: "Mantle",
    short: "MNT",
    Icon: NetworkMantle,
    explorer: "https://explorer.mantle.xyz/tx/",
    aliases: ["mantle"],
  },
  {
    name: "Gnosis",
    short: "GNO",
    Icon: NetworkGnosis,
    explorer: "https://gnosisscan.io/tx/",
    aliases: ["gnosis", "xdai", "gnosis chain"],
  },
  {
    name: "Celo",
    short: "CELO",
    Icon: NetworkCelo,
    explorer: "https://celoscan.io/tx/",
    aliases: ["celo"],
  },
  {
    name: "Sonic",
    short: "S",
    Icon: NetworkSonic,
    explorer: "https://sonicscan.org/tx/",
    aliases: ["sonic", "fantom sonic"],
  },
  {
    name: "Berachain",
    short: "BERA",
    Icon: NetworkBerachain,
    explorer: "https://berascan.com/tx/",
    aliases: ["berachain", "bera"],
  },
  {
    name: "Unichain",
    short: "UNI",
    Icon: NetworkUnichain,
    explorer: "https://uniscan.xyz/tx/",
    aliases: ["unichain", "uni chain"],
  },
  {
    name: "World Chain",
    short: "WLD",
    Icon: NetworkWorld,
    explorer: "https://worldscan.org/tx/",
    aliases: ["world", "world chain", "worldchain"],
  },
  {
    name: "Mode",
    short: "MODE",
    Icon: NetworkMode,
    explorer: "https://modescan.io/tx/",
    aliases: ["mode", "mode network"],
  },
  {
    name: "Zora",
    short: "ZORA",
    Icon: NetworkZora,
    explorer: "https://explorer.zora.energy/tx/",
    aliases: ["zora"],
  },
  {
    name: "Bob",
    short: "BOB",
    Icon: NetworkBob,
    explorer: "https://explorer.gobob.xyz/tx/",
    aliases: ["bob", "build on bitcoin"],
  },
  {
    name: "Taiko",
    short: "TAIKO",
    Icon: NetworkTaiko,
    explorer: "https://taikoscan.io/tx/",
    aliases: ["taiko"],
  },
  {
    name: "Aurora",
    short: "AURORA",
    Icon: NetworkAurora,
    explorer: "https://explorer.aurora.dev/tx/",
    aliases: ["aurora"],
  },
  {
    name: "Fantom",
    short: "FTM",
    Icon: NetworkFantom,
    explorer: "https://ftmscan.com/tx/",
    aliases: ["fantom", "ftm"],
  },
  {
    name: "Kava",
    short: "KAVA",
    Icon: NetworkKava,
    explorer: "https://kavascan.com/tx/",
    aliases: ["kava", "kava evm"],
  },
  {
    name: "Moonbeam",
    short: "GLMR",
    Icon: NetworkMoonbeam,
    explorer: "https://moonscan.io/tx/",
    aliases: ["moonbeam", "glmr"],
  },
  {
    name: "Metis",
    short: "METIS",
    Icon: NetworkMetisAndromeda,
    explorer: "https://andromeda-explorer.metis.io/tx/",
    aliases: ["metis", "metis andromeda"],
  },
  {
    name: "Lisk",
    short: "LSK",
    Icon: NetworkLisk,
    explorer: "https://blockscout.lisk.com/tx/",
    aliases: ["lisk"],
  },
  {
    name: "Ink",
    short: "INK",
    Icon: NetworkInk,
    explorer: "https://explorer.inkonchain.com/tx/",
    aliases: ["ink", "ink chain"],
  },
  {
    name: "Telos",
    short: "TLOS",
    Icon: NetworkTelos,
    explorer: "https://teloscan.io/tx/",
    aliases: ["telos", "tlos"],
  },
  {
    name: "Robinhood Testnet",
    short: "RH",
    Icon: NetworkRobinhood,
    explorer: "https://explorer.testnet.chain.robinhood.com/tx/",
    aliases: ["robinhood", "robinhood chain", "robinhood testnet", "rh", "hood"],
  },
  {
    name: "Core",
    short: "CORE",
    Icon: NetworkCore,
    explorer: "https://scan.coredao.org/tx/",
    aliases: ["core", "core dao"],
  },
  {
    name: "opBNB",
    short: "opBNB",
    Icon: NetworkOpbnb,
    explorer: "https://opbnb.bscscan.com/tx/",
    aliases: ["opbnb", "op bnb"],
  },
  {
    name: "Sei",
    short: "SEI",
    Icon: NetworkSeiNetwork,
    explorer: "https://seitrace.com/tx/",
    aliases: ["sei", "sei network", "sei evm"],
  },
  {
    name: "Polygon zkEVM",
    short: "zkEVM",
    Icon: NetworkPolygonZkevm,
    explorer: "https://zkevm.polygonscan.com/tx/",
    aliases: ["polygon zkevm", "zkevm", "polygon zk evm"],
  },
];

export const EVM_CHAIN_NAMES = EVM_CHAINS.map((chain) => chain.name);

/**
 * Deposits are intentionally settled on a single chain so a user can access
 * yield from every network with one balance. Robinhood Chain testnet is the
 * current settlement rail while the product is in testnet.
 */
export const ROBINHOOD_TESTNET = {
  name: "Robinhood Testnet",
  chainId: 46630,
  rpc: "https://rpc.testnet.chain.robinhood.com",
  explorer: "https://explorer.testnet.chain.robinhood.com",
} as const;

export const DEPOSIT_CHAIN = ROBINHOOD_TESTNET.name;

/** Networks that get a one-tap filter button on the home page. */
export const POPULAR_CHAIN_NAMES = [
  "Ethereum",
  "Base",
  "Arbitrum",
  "Optimism",
  "Polygon",
  "BNB Chain",
  "Avalanche",
  "Telos",
];

export function findChain(name?: string): EvmChain | undefined {
  if (!name) return undefined;
  const needle = name.trim().toLowerCase();
  // Models often append a network stage ("Base Sepolia", "Arbitrum testnet").
  // Resolve those to the canonical chain instead of dropping to a raw label.
  const base = needle.replace(/\s+(sepolia|testnet|devnet|mainnet)$/i, "").trim();
  return EVM_CHAINS.find(
    (chain) =>
      chain.name.toLowerCase() === needle ||
      chain.short.toLowerCase() === needle ||
      chain.aliases.includes(needle) ||
      (base !== needle &&
        (chain.name.toLowerCase() === base ||
          chain.short.toLowerCase() === base ||
          chain.aliases.includes(base))),
  );
}

/** Resolve any alias to the canonical display name. */
export function normalizeChain(name?: string, fallback = "Base"): string {
  return findChain(name)?.name ?? (name?.trim() || fallback);
}

/** Regex fragment for chat intake: matches every chain alias. */
export const CHAIN_ALIAS_PATTERN = new RegExp(
  `\\b(${EVM_CHAINS.flatMap((chain) => [chain.name, ...chain.aliases])
    .map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .sort((a, b) => b.length - a.length)
    .join("|")})\\b`,
  "i",
);

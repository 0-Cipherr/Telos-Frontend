// Server-side agent wallet tool. Never imported by the browser bundle.
//
//   node --env-file=.env scripts/agent-wallets.mjs address 0 1 2
//   node --env-file=.env scripts/agent-wallets.mjs fund 0 1 2 --target 0.001
//   node --env-file=.env scripts/agent-wallets.mjs fund 0 1 2 --target 0.001 --send
//
// Agent keys are derived from TELOS_MASTER_PRIVATE_KEY, so nothing per-agent is
// stored and every agent wallet can be rebuilt from the one key.
// `fund --all` covers every agent the server has allocated (.agent-index.json).
// `fund` is a dry run unless --send is passed.

import {
  concatHex,
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  keccak256,
  parseEther,
  toHex,
} from "viem";
import { readFile } from "node:fs/promises";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const DOMAIN = "telos-agent-wallet:v1";
const chain = baseSepolia;
const rpcUrl = process.env.TELOS_RPC_URL || undefined;

export function deriveAgentPrivateKey(masterKey, index) {
  return keccak256(concatHex([masterKey, toHex(`${DOMAIN}:${index}`)]));
}

export function deriveAgentAccount(masterKey, index) {
  return privateKeyToAccount(deriveAgentPrivateKey(masterKey, index));
}

function requireMaster() {
  const key = process.env.TELOS_MASTER_PRIVATE_KEY?.trim();
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error("TELOS_MASTER_PRIVATE_KEY must be a 0x-prefixed 32-byte hex key in .env");
  }
  return key;
}

const indexFile = new URL("../.agent-index.json", import.meta.url);

async function allocatedCount() {
  try {
    return Number(JSON.parse(await readFile(indexFile, "utf8")).next) || 0;
  } catch {
    return 0;
  }
}

async function parseArgs(argv) {
  const indexes = [];
  const flags = { send: false, all: false, target: "0.001" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--send") flags.send = true;
    else if (arg === "--all") flags.all = true;
    else if (arg === "--target") flags.target = argv[++i];
    else if (/^\d+$/.test(arg)) indexes.push(Number(arg));
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (flags.all) {
    const count = await allocatedCount();
    for (let index = 0; index < count; index += 1) indexes.push(index);
  }
  if (indexes.length === 0) throw new Error("give agent indexes (e.g. 0 1 2) or --all");
  return { indexes, flags };
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const masterKey = requireMaster();
  const master = privateKeyToAccount(masterKey);

  if (command === "address") {
    const { indexes } = await parseArgs(rest);
    console.log(`operator (master): ${master.address}`);
    for (const index of indexes) {
      console.log(`agent ${index}: ${deriveAgentAccount(masterKey, index).address}`);
    }
    return;
  }

  if (command === "fund") {
    const { indexes, flags } = await parseArgs(rest);
    const target = parseEther(flags.target);
    const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
    const walletClient = createWalletClient({ account: master, chain, transport: http(rpcUrl) });

    const masterBalance = await publicClient.getBalance({ address: master.address });
    console.log(`master ${master.address} balance: ${formatEther(masterBalance)} ETH`);

    let remaining = masterBalance;
    for (const index of indexes) {
      const agent = deriveAgentAccount(masterKey, index);
      const balance = await publicClient.getBalance({ address: agent.address });
      const need = target > balance ? target - balance : 0n;
      if (need === 0n) {
        console.log(`agent ${index} ${agent.address}: funded (${formatEther(balance)} ETH), skipping`);
        continue;
      }
      const gasPrice = await publicClient.getGasPrice();
      const gasReserve = gasPrice * 21_000n * 2n;
      if (need + gasReserve > remaining) {
        console.log(`agent ${index}: not enough master balance, stopping`);
        break;
      }
      if (!flags.send) {
        console.log(`[dry run] agent ${index} ${agent.address}: send ${formatEther(need)} ETH`);
        remaining -= need + gasReserve;
        continue;
      }
      const hash = await walletClient.sendTransaction({ to: agent.address, value: need });
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`agent ${index} ${agent.address}: sent ${formatEther(need)} ETH, tx ${hash}`);
      remaining -= need + gasReserve;
    }
    if (!flags.send) console.log("dry run only. add --send to broadcast.");
    return;
  }

  throw new Error("usage: address <i...> | fund <i...> [--target 0.001] [--send]");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

import { createPublicClient, createWalletClient, custom, http, type Address } from "viem";
import type { TelosChain } from "./vaultContracts";

type PrivyWallet = {
  address: string;
  chainId: string;
  switchChain: (chainId: number) => Promise<void>;
  getEthereumProvider: () => Promise<unknown>;
};

export function publicClientFor(telos: TelosChain) {
  return createPublicClient({ chain: telos.chain, transport: http() });
}

/** Switches the connected wallet to `telos` if needed and returns a client bound to it. */
export async function walletClientFor(wallet: PrivyWallet, telos: TelosChain) {
  if (wallet.chainId !== `eip155:${telos.id}`) {
    await wallet.switchChain(telos.id);
  }
  const provider = await wallet.getEthereumProvider();
  return createWalletClient({
    account: wallet.address as Address,
    chain: telos.chain,
    transport: custom(provider as Parameters<typeof custom>[0]),
  });
}

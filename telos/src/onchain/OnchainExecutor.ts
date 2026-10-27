import {
  createWalletClient,
  http,
  type WalletClient,
  type WriteContractReturnType,
} from "viem";
import type { address } from "../types/solidity-types";

export class OnchainExecutor {
  protected client: any | null = null;

  constructor() {}

  async writeContract(params: any): Promise<WriteContractReturnType | null> {
    try {
      return await this.client.writeContract(params);
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  /** Address of the connected signer, when one has been configured. */
  getAccountAddress(): address | undefined {
    const account = this.client?.account;
    if (!account) return undefined;
    if (typeof account === "string") return account as address;
    return account.address as address | undefined;
  }

  async updateAccount(_account: any) {
    this.client.account = _account;
  }

  async updateChain(_chain: any) {
    this.client.chain = _chain;
  }

  async createClient(accountAddress: address, chain: any) {
    const walletClient: WalletClient<any> = createWalletClient({
      account: accountAddress,
      chain: chain,
      transport: http(),
    });

    this.client = walletClient;
  }
}

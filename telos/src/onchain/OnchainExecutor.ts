import { createWalletClient, http } from "viem";
import type { address } from "../types/solidity-types";

export class OnchainExecutor {
  protected client: any;

  constructor() {}

  async writeContract(params: any) {
    try {
      await this.client.writeContract(params);
    } catch (error) {
      console.log(error);
    }
  }

  async updateAccount(_account: any) {
    this.client.account = _account;
  }

  async updateChain(_chain: any) {
    this.client.chain = _chain;
  }

  async createClient(accountAddress: address, chain: any) {
    const walletClient = createWalletClient({
      account: accountAddress,
      chain: chain,
      transport: http(),
    });
    this.client = walletClient;
  }
}

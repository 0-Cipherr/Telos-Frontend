import { createWalletClient, http } from "viem";
import type { address } from "../types/solidity-types";

export class Registry {
  client: any;
  registry: any = "0x";
  async deployHubVault(owner: address, deployParams: any[]) {
    try {
      await this.writeContract({
        address: this.registry,
        functionName: "deployHubVault",
        args: [owner, this.encodeDeployParams(deployParams)],
        value: 0,
      });
    } catch (error) {
      console.log(error);
    }
  }

  async encodeDeployParams(params: any[]) {
    const ecnoder = new TextEncoder();
    return ecnoder.encode(...params);
  }

  async writeContract(params: any) {
    try {
      await this.client.writeContract(params);
    } catch (error) {
      console.log(error);
    }
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

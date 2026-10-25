import { createWalletClient, http } from "viem";
import type { address } from "../types/solidity-types";
import type { OnchainAgentManager } from "./OnchainAgent";

export class Registry {
  client: any;
  registry: any = "0x";
  protocolFeeReciever: any;
  protocolFee: any;
  endpoint: any;
  agentManager: OnchainAgentManager;
  constructor(
    _registry: address,
    _protocolFeeReciever: any,
    _protocolFee: any,
    _endpoint: any,
    _agentManaget: OnchainAgentManager,
  ) {
    this.registry = _registry;
    this.protocolFee = _protocolFee;
    this.protocolFeeReciever = _protocolFeeReciever;
    this.endpoint = _endpoint;
    this.agentManager = _agentManaget;
  }
  //[0, {}]
  async deployHubVault(owner: any, deployParams: any, isAgent: boolean) {
    try {
      if (isAgent) {
        // await concurrency to handle multple scheduled tscthis.createAgent(deployParams[2], deployParams[3]);
      }
      deployParams.fees.protocolFee = this.protocolFee;
      deployParams.fees.protocolFeeReciever = this.protocolFeeReciever;

      deployParams[1] = this.encodeDeployParams(deployParams[1]);
      await this.writeContract({
        address: this.registry,
        functionName: "deployHubVault",
        args: [owner, this.encodeDeployParams(deployParams)],
      });
    } catch (error) {
      console.log(error);
    }
  }

  async createAgent(username: any, hasKey: boolean) {
    await this.agentManager.createAgent(username, hasKey);
  }

  async getProtocolFeeReciever() {}

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

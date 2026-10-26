import type { address } from "../types/solidity-types";
import type { OnchainAgentManager } from "./OnchainAgent";
import type { OnchainExecutor } from "./OnchainExecutor";
//one hsared instance
export class Registry {
  protected client: any;
  protected registry: any = "0x";
  protected protocolFeeReciever: any;
  protected protocolFee: any;
  protected endpoint: any;
  protected agentManager: OnchainAgentManager;
  protected onchainExecutor: OnchainExecutor;
  constructor(
    _registry: address,
    _protocolFeeReciever: any,
    _protocolFee: any,
    _endpoint: any,
    _agentManager: OnchainAgentManager,
    _onchainExecutor: OnchainExecutor,
  ) {
    this.registry = _registry;
    this.protocolFee = _protocolFee;
    this.protocolFeeReciever = _protocolFeeReciever;
    this.endpoint = _endpoint;
    this.agentManager = _agentManager;
    this.onchainExecutor = _onchainExecutor;
  }
  //[0, {}]
  async deployHubVault(
    userName: string,
    owner: address,
    model: string,
    deployParams: any,
    isAgent: boolean,
  ) {
    try {
      if (isAgent) {
        const agentKey = await this.createLLMAgent(userName, owner, model);
        // await concurrency to handle multple scheduled tscthis.createAgent(deployParams[2], deployParams[3]);
      }
      deployParams.fees.protocolFee = this.protocolFee;
      deployParams.fees.protocolFeeReciever = this.protocolFeeReciever;

      deployParams[1] = this.encodeDeployParams(deployParams[1]);
      await this.onchainExecutor.writeContract({
        address: this.registry,
        functionName: "deployHubVault",
        args: [owner, this.encodeDeployParams(deployParams)],
      });
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  async createLLMAgent(username: any, creatorAddr: address, model: string) {
    return await this.agentManager.createAgent(username, creatorAddr, model);
  }

  async encodeDeployParams(params: any[]) {
    const ecnoder = new TextEncoder();
    return ecnoder.encode(...params);
  }
}

import type { WriteContractReturnType } from "viem";
import type TelosAPI from "../api-handler/Telos/telos-api-methods";
import type { address } from "../types/solidity-types";
import type { OnchainAgentManager } from "./OnchainAgentManager";
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
  protected telosAPI: TelosAPI;
  constructor(
    _registry: address,
    _protocolFeeReciever: any,
    _protocolFee: any,
    _endpoint: any,
    _agentManager: OnchainAgentManager,
    _onchainExecutor: OnchainExecutor,
    _telosAPI: TelosAPI,
  ) {
    this.registry = _registry;
    this.protocolFee = _protocolFee;
    this.protocolFeeReciever = _protocolFeeReciever;
    this.endpoint = _endpoint;
    this.agentManager = _agentManager;
    this.onchainExecutor = _onchainExecutor;
    this.telosAPI = _telosAPI;
  }

  async getRegistryDeployment() {}
  //[0, {}]

  async assignModel() {
    return "";
  }

  //if agent make agent assing then call api to post agent
  async deployHubVault(
    userName: string | null,
    owner: address,
    model: string | null,
    deployParams: any,
    isAgent: boolean,
  ): Promise<any | null> {
    try {
      if (isAgent) {
        const _model: string = model == null ? await this.assignModel() : model;

        const createdAgent: any[] = await this.createLLMAgent(
          userName,
          owner,
          _model,
        );
        await this.telosAPI.uploadAgent(createdAgent);
        // await concurrency to handle multple scheduled tscthis.createAgent(deployParams[2], deployParams[3]);
      }
      deployParams.fees.protocolFee = this.protocolFee;
      deployParams.fees.protocolFeeReciever = this.protocolFeeReciever;
      /**
       *
       * needs         (IERC20 vaultAsset, VaultHelper.VaultDeployParams memory deployParams)
        structure     
        struct VaultDeployParams {
              address deployer;
              address[] authorizedVip;
              string vaultName;
              string vaultTicker;
              IERC20 vaultAsset;
              address creator;
              address vaultEndpoint;
              VaultAssets.FeesInfo fees;
              VaultAssets.feeReceiversInfo feeReceivers;
          }
          */
      deployParams[1] = this.encodeDeployParams(deployParams[1]); //index one is ther dpeloymernt params
      const reciept: WriteContractReturnType | null =
        await this.onchainExecutor.writeContract({
          address: this.registry,
          functionName: "deployHubVault",
          args: [owner, this.encodeDeployParams(deployParams)],
        });
      const creatorFound = await this.telosAPI.getCreatorIdByAddress(owner);
      let creatorId;
      if (creatorFound.length == 0)
        creatorId = await this.telosAPI.uploadCreator([owner]);
      const vaultId = await this.telosAPI.uploadVault(deployParams);
      //makes creator /creates vault
      return { reciept, creatorId, vaultId };
    } catch (error) {
      console.log(error);
      // throw new Error("Transaction was not processed please try again!");
      return null;
    }
  }

  async deployVaultCrossChain() {
    try {
    } catch (error) {
      console.log(error);
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

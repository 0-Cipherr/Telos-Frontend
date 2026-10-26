import type { LaunchPad } from "../interfaces/LaunchPad";
import type { OnchainExecutor } from "../onchain/OnchainExecutor";
import type { address } from "../types/solidity-types";

export class HookrFun implements LaunchPad {
  factory: address;
  abi: any[];
  onchainExecutor: OnchainExecutor;
  functionName: string;
  constructor(
    _factory: address,
    _abi: any[],
    _onchainExecutor: OnchainExecutor,
    _functionName: string,
  ) {
    this.factory = _factory;
    this.abi = _abi;
    this.onchainExecutor = _onchainExecutor;
    this.functionName = _functionName;
  }

  updateFactory(_factory: address) {
    this.factory = _factory;
  }

  async createToken(encodedParams: string) {
    try {
      await this?.onchainExecutor.writeContract({
        abi: this.abi,
        address: this.factory,
        functionName: this.functionName,
      });
      return {
        name: "",
        ticker: "",
        deployedTokenAddress: "",
      };
    } catch (error) {
      console.log(error);
      throw new Error("Could not create Token");
    }
  }

  updateABI(_abi: any[]) {
    this.abi = _abi;
  }
}

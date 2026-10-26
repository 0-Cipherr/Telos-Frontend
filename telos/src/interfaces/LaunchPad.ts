import { OnchainExecutor } from "../onchain/OnchainExecutor";
import type { address } from "../types/solidity-types";

export interface LaunchPad {
  factory: address;
  abi: any[];
  onchainExecutor: OnchainExecutor;
  functionName: string;
  updateFactory(_factory: address): void;
  createToken(encodedParams: string): void;
  updateABI(_abi: any[]): void;
}

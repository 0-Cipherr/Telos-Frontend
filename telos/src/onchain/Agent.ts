import type { PrivateKeyAccount } from "viem";
import type LLM from "../interfaces/LLM";
import type { address } from "../types/solidity-types";

export class Agent {
  llm: LLM;
  key: string;
  walletAcc: PrivateKeyAccount | undefined;
  creator: address;
  id: number;
  model: string;
  constructor(
    _id: number,
    _llm: LLM,
    _creator: address,
    _model: string,
    _key: string,
  ) {
    this.id = _id;
    this.llm = _llm;
    this.walletAcc = undefined;
    this.creator = _creator;
    this.model = _model;
    this.key = _key;
  }

  analyzeProtocols() {}

  formatAgentDecision() {
    try {
      return {};
    } catch (error) {
      console.log(error);
      return {};
    }
  }
  setWallet(account: PrivateKeyAccount) {
    this.walletAcc = account;
  }

  getCreator(): address {
    return this.creator;
  }

  assignModel() {}
  getId(): number {
    return this.id;
  }

  getModel() {
    return this.model;
  }
}
//store tasks in db get on scheduele

import type LLM from "../interfaces/LLM";
import type { address } from "../types/solidity-types";

export class Agent {
  id: number;
  llm: LLM;
  key: string;
  walletAddress: address | null;
  creator: address;
  model: string;
  constructor(
    _id: number,
    _llm: LLM,
    _creator: address,
    _model: string,
    _key: string,
    _walletAddress: address | null,
  ) {
    this.id = _id;
    this.llm = _llm;
    this.walletAddress = _walletAddress;
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
  setWallet(walletAddress: address) {
    this.walletAddress = walletAddress;
  }

  getCreator(): address {
    return this.creator;
  }

  updateModel(_model: string) {
    this.model = _model;
  }
  getId(): number {
    return this.id;
  }

  async getPV() {
    try {
      return this.walletAddress;
    } catch (error) {
      console.log(error);
    }
  }
  getModel() {
    return this.model;
  }
}
//store tasks in db get on scheduele

///idea schedueler pullas all agents all fields must match agent contrucxtor instantiate make decision boom

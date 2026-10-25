import type LLM from "../interfaces/LLM";

export class Agent {
  llm: LLM;
  walletAcc: any;
  creator: any;
  id: any;
  model: any;
  constructor(_llm: LLM) {
    this.llm = _llm;
  }

  analyzeProtocols() {}

  formatAgentDecision() {}

  setWallet() {}

  getOwner() {}
  assignModel() {}
  getId() {}
}
//store tasks in db get on scheduele

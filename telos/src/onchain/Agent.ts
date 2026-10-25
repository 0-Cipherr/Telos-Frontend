import type LLM from "../interfaces/LLM";

export class Agent {
  llm: LLM;
  constructor(_llm: LLM) {
    this.llm = _llm;
  }
}

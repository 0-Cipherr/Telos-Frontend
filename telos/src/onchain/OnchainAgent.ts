import { OpenRouter } from "../../llm/OpenRouter";
export class OnchainAgentManager {
  llm: OpenRouter;
  constructor(_llm: OpenRouter) {
    this.llm = _llm;
  }

  setLLM(_llm: OpenRouter) {
    this.llm = _llm;
  }

  async createAgent(username: any, hasKey: boolean) {
    try {
      await this.llm.createAgent(username, hasKey);
    } catch (error) {}
  }
  async getAgentById() {}

  async uploadAgent() {}

  async getAgentByOwner() {}
}

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { OpenRouter } from "../../llm/OpenRouter";
import type LLM from "../interfaces/LLM";
import type { address } from "../types/solidity-types";
import { Agent } from "./Agent";
interface AgentInfo {
  id: number;
  agent: Agent;
}
export class OnchainAgentManager {
  protected llm: LLM;
  protected agents: Array<AgentInfo> | undefined;
  protected currentAgentID: number;
  constructor(_llm: LLM) {
    this.llm = _llm;
    this.agents = new Array<AgentInfo>();
    const agentsAvailable = async () => {
      return await this.getCurrentAgentID();
    };
    this.currentAgentID = Number(agentsAvailable());
  }

  getCurrentAgentId() {}

  getAllAgentsAvailable() {}
  setLLM(_llm: OpenRouter) {
    this.llm = _llm;
  }

  async createAgent(
    username: any,
    creator: address,
    model: string,
    hasKey: boolean,
  ) {
    try {
      const result = await this.llm.createAgent(username, hasKey);
      const agent = new Agent(
        this.currentAgentID,
        this.llm,
        creator,
        model,
        result,
      );
      agent;
    } catch (error) {}
  }

  addAgent(id: number, agent: Agent) {
    this.agents?.push({ id, agent });
  }

  getAgent(id: number) {
    try {
      return {};
    } catch (error) {
      console.log(error);
    }
  }
  increaseCurrentAgentId() {}
  async getCurrentAgentID(): Promise<number> {
    return 0; //get this from db update based on total agents
  }
  async createWallet() {
    try {
      const key = await generatePrivateKey();
      const account = await this.instantiateWallet(key);
      console.log("ACC");
      console.log(account);

      // Create a local account from the private key
    } catch (error) {}
  }

  async checkForSchedueledEvents() {}
  async instantiateWallet(key: any) {
    try {
      const account = privateKeyToAccount(key);
      return account;
    } catch (error) {}
  }

  async genPrivateKey() {
    try {
      const privateKey = generatePrivateKey();
      return privateKey;
    } catch (error) {
      console.log(error);
    }
  }
  getAgentId(): number {
    return 0;
  }

  async uploadAgent() {}

  async getAgentOwner() {}
}
console.log("test");
// const llm = new OpenRouter("", "", "", new TelosAPI("", [], ""));
// const test = new OnchainAgentManager(llm);
// test.createWallet();

import { Agent } from "http";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { OpenRouter } from "../../llm/OpenRouter";
import TelosAPI from "../api-handler/Telos/telos-api-methods";
import type LLM from "../interfaces/LLM";

export class OnchainAgentManager extends Agent {
  llm: LLM;
  Agents: Array<Agent>;
  currentAgentID: any;
  constructor(_llm: LLM) {
    super();
    this.llm = _llm;
    this.Agents = new Array<Agent>();
    this.currentAgentID = 0;
  }

  setLLM(_llm: OpenRouter) {
    this.llm = _llm;
  }

  async createAgent(username: any, hasKey: boolean) {
    try {
      const result = await this.llm.createAgent(username, hasKey);
    } catch (error) {}
  }
  increaseCurrentAgentId() {}
  async getCurrentAgentID() {}
  async createWallet() {
    try {
      const key = await generatePrivateKey();
      const account = await this.instantiateWallet(key);
      console.log("ACC");
      console.log(account);

      // Create a local account from the private key
    } catch (error) {}
  }

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
  async getAgentId() {}

  async uploadAgent() {}

  async getAgentOwner() {}
}
console.log("test");
const llm = new OpenRouter("", "", "", new TelosAPI("", [], ""));
const test = new OnchainAgentManager(llm);
test.createWallet();

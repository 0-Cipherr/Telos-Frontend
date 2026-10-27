import {
  generatePrivateKey,
  privateKeyToAccount,
  type PrivateKeyAccount,
} from "viem/accounts";
import { OpenRouter } from "../../llm/OpenRouter";
import type LLM from "../interfaces/LLM";
import type { address } from "../types/solidity-types";
import { Agent } from "./Agent";

interface AgentInfo {
  id: number;
  agent: Agent;
}
// this is a singleton single shard instance across all places
export class OnchainAgentManager {
  protected llm: LLM;
  protected agents: Map<number, AgentInfo> | null;
  protected currentAgentID: number;
  constructor(_llm: LLM) {
    this.llm = _llm;
    this.agents = new Map<number, AgentInfo>(); //maping for agnts
    const agentsAvailable = async () => {
      return await this.getCurrentAgentID();
    };
    this.currentAgentID = Number(agentsAvailable());
  }

  getCurrentAgentId() {
    return this.currentAgentID;
  }

  getAllAgentsAvailable() {}
  setLLM(_llm: OpenRouter) {
    this.llm = _llm;
  }
  //for encryptoing the strength of the key is very important
  //use this Asymmetric Encryption:  uses pubkey
  async createAgent(
    username: any,
    creator: address,
    model: string,
  ): Promise<any> {
    try {
      const result = await this.llm.createAgent(username);
      const agentWallet: PrivateKeyAccount | null = await this.createWallet();
      const agent = new Agent(
        this.currentAgentID,
        this.llm,
        creator,
        model,
        result,
        agentWallet,
      );
      this.addAgent(agent);
      return {
        currentAgentID: this.currentAgentID,
        llm: this.llm,
        creator,
        model,
        result,
        agentWallet,
      };
    } catch (error) {
      console.log(error);
      throw new Error("Could not create agent!");
    }
  }

  getAgentPV(agentId: number) {
    return this.agents?.get(agentId)?.agent.getPV();
  }

  addAgent(agent: Agent) {
    this.agents?.set(this.currentAgentID, { id: this.currentAgentID, agent });
    this.increaseCurrentAgentId();
  }

  getAgent(id: number) {
    try {
      return this.agents?.get(id);
    } catch (error) {
      console.log(error);

      return null;
    }
  }
  increaseCurrentAgentId() {
    this.currentAgentID++;
  }
  async getCurrentAgentID() {
    return this.currentAgentID; //get this from db update based on total agents
  }
  async createWallet() {
    try {
      const key = await generatePrivateKey();
      const account: PrivateKeyAccount | null =
        await this.instantiateWallet(key);
      console.log("ACC");
      console.log(account);

      return account;

      // Create a local account from the private key
    } catch (error) {
      console.log(error);
      throw new Error("Could not create a wallet please try again !");
    }
  }

  async checkForSchedueledEvents() {}
  async instantiateWallet(key: any) {
    try {
      const account: PrivateKeyAccount | null = privateKeyToAccount(key);
      return account;
    } catch (error) {
      console.log(error);
      return null;
    }
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

  async getAgentOwner(id: number) {
    return this.getAgent(id)?.agent.getCreator();
  }
}
console.log("test");
// const llm = new OpenRouter("", "", "", new TelosAPI("", [], ""));
// const test = new OnchainAgentManager(llm);
// test.createWallet();

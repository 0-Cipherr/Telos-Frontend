import { OpenRouter } from "../../llm/OpenRouter";
import type LLM from "../interfaces/LLM";
import type { address } from "../types/solidity-types";
import { Agent } from "./Agent";

interface AgentInfo {
  id: number;
  agent: Agent;
}

type AgentWallet = { index: number; address: address };

const AGENT_WALLET_API = `${(import.meta.env.VITE_TELOS_API_BASE as string | undefined) ?? ""}/api/agent-wallet`;

// this is a singleton single shard instance across all places
export class OnchainAgentManager {
  protected llm: LLM;
  protected agents: Map<number, AgentInfo> | null;
  protected currentAgentID: number;
  constructor(_llm: LLM) {
    this.llm = _llm;
    this.agents = new Map<number, AgentInfo>(); //maping for agnts
    this.currentAgentID = 0;
  }

  getCurrentAgentId() {
    return this.currentAgentID;
  }

  getAllAgentsAvailable() {}
  setLLM(_llm: OpenRouter) {
    this.llm = _llm;
  }

  // Each agent wallet is derived server-side from the operator key. The browser
  // only receives the index and public address, never a private key.
  async createAgent(
    username: any,
    creator: address,
    model: string,
  ): Promise<any> {
    try {
      const result = await this.llm.createAgent(username);
      const wallet: AgentWallet = await this.createWallet();
      const agent = new Agent(
        wallet.index,
        this.llm,
        creator,
        model,
        result,
        wallet.address,
      );
      this.addAgent(agent);
      return {
        currentAgentID: this.currentAgentID,
        llm: this.llm,
        creator,
        model,
        result,
        agentWallet: wallet.address,
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
    this.agents?.set(agent.getId(), { id: agent.getId(), agent });
    this.currentAgentID = Math.max(this.currentAgentID, agent.getId() + 1);
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
    return this.currentAgentID;
  }

  async createWallet(): Promise<AgentWallet> {
    const response = await fetch(AGENT_WALLET_API, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.address) {
      throw new Error(body.error ?? "Could not create a wallet please try again !");
    }
    return { index: body.index, address: body.address as address };
  }

  async checkForSchedueledEvents() {}

  getAgentId(): number {
    return 0;
  }

  async uploadAgent() {}

  async getAgentOwner(id: number) {
    return this.getAgent(id)?.agent.getCreator();
  }
}

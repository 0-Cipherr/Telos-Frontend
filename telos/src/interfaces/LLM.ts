import type TelosAPI from "../api-handler/Telos/telos-api-methods";

export default interface LLM {
  endpoint: any;
  createKeyEndpoint: any;
  apiKey: any;
  telos: TelosAPI;
  managementkey: any;
  setAPI(_telos: TelosAPI): void;

  createAgent(userName: string, hasKey: boolean): any;
  setApiKey(_apiKey: any): void;
  checkUsage(keyHash: any): any;
  uploadAgent(agentInfo: any): void;
  chat(message: any): any;
}

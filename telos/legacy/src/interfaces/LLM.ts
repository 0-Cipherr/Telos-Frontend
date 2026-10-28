import type TelosAPI from "../api-handler/Telos/telos-api-methods";
import { ModelManager } from "../onchain/ModelManager";

export default interface LLM extends ModelManager {
  endpoint: any;
  createKeyEndpoint: any;
  apiKey: any;
  telos: TelosAPI;
  managementkey: any;
  setAPI(_telos: TelosAPI): void;

  createAgent(userName: string, _telos: TelosAPI): any;
  setApiKey(_apiKey: any): void;
  checkUsage(keyHash: any): any;
  uploadAgent(agentInfo: any, _telos: TelosAPI): void;
  chat(message: any): any;
}

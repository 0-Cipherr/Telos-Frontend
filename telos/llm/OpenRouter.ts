import TelosAPI from "../src/api-handler/Telos/telos-api-methods";
import type LLM from "../src/interfaces/LLM";

export class OpenRouter implements LLM {
  endpoint: any;
  // endpoint: any = "https://openrouter.ai/api/v1/chat/completions";
  // createKeyEndpoint: any = "https://openrouter.ai/api/v1/keys";
  createKeyEndpoint: any;
  apiKey: any;
  managementkey: any;
  telos: TelosAPI;
  constructor(
    _apiKey: any,
    _model: any,
    _managementKey: any,
    _telos: TelosAPI,
  ) {
    this.apiKey = _apiKey;
    this.managementkey = _managementKey;
    this.telos = _telos;
  }

  setAPI(_telos: TelosAPI) {
    this.telos = _telos;
  }
  //schecudeled taske very week simaltanouelsy execute eachtask for all agents

  async createAgent(userName: string, hasKey: boolean) {
    try {
      if (hasKey) {
      } else {
        const result: any = await fetch(this.createKeyEndpoint, {
          method: "POST",
          headers: {
            "Authorization: Bearer:": `<YOUR_MANAGEMENT_TOKEN>`,
            "Content-Type": " application/json",
          },
          body: JSON.stringify({
            name: `API Key for ${userName || "AUser"}`,
            limit: 0.000001,
            limit_reset: "monthly",
            expires_at: "2027-12-31T23:59:59Z",
            include_byok_in_limit: true,
          }),
        });
        await this.uploadAgent({ name: userName });
        const json: any = await result.json();
        return json?.key;
      }
      return {};
    } catch (error) {
      console.log(error);
      return {};
    }
  }

  async setApiKey(_apiKey: any) {
    this.apiKey = _apiKey;
  }

  async checkUsage(keyHash: any) {
    try {
      const response = await fetch(`https://openrouter.ai${keyHash}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.managementkey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch key details: ${response.statusText}`);
      }

      const json = await response.json();

      // Extract limit and current usage from the response data object
      const limit = json.data.limit || 0;
      const usage = json.data.usage || 0;

      // Calculate the remaining balance
      const remaining = Math.max(0, limit - usage);

      return {
        limit: limit,
        used: usage,
        remaining: remaining,
      };
    } catch (error) {
      console.error("Error checking OpenRouter key usage:", error);
      throw error;
    }
  }

  async uploadAgent(agentInfo: any) {
    try {
      await (this.telos ?? this.telos).uploadAgent(agentInfo);
      //call our api updload to db
      await fetch("agent/create");
    } catch (error) {
      console.log(error);
    }
  }

  async chat(message: any) {
    try {
      const result = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "~openai/gpt-sol-latest",
          messages: [
            {
              role: "user",
              content: message,
            },
          ],
        }),
      });

      return result.json();
    } catch (error) {
      console.log(error);
      return {};
    }
  }
}

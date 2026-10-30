class TelosAPI {
  baseURL: string = "";
  endpoints: any;
  key: string | null;

  constructor(baseurl: string, _endpoints: any, _key: string | null) {
    this.baseURL = baseurl;
    this.endpoints = _endpoints;
    this.key = _key;
  }

  // to API all parameters passed in as the structure is when creating and querying array format

  getAuthParam() {
    return {
      Authorization: `Bearer ${this.key}`,
    };
  }

  async generateAPIKey() {
    try {
      const creatorInfo = {};
      const result = await this.executeFetch(
        creatorInfo,
        this.endpoints.uploadCreator,
        "POST",
      );
      return result || null;
    } catch (error) {
      console.log(error);
    }
  }

  async updateMarketPlaceMetrics() {
    try {
    } catch (error) {}
  }

  // Framework to generate API keys

  async uploadCreator(creator: any[]): Promise<any | null> {
    try {
      const authParam: any = this.getAuthParam();
      authParam.creator = creator;

      const result = await this.executeFetch(
        authParam,
        this.endpoints.uploadCreator,
        "POST",
      );

      return result || null;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async uploadVault(vault: any[]): Promise<any[] | null> {
    try {
      const authParam: any = this.getAuthParam();
      authParam.vault = vault;

      const result = await this.executeFetch(
        authParam,
        this.endpoints.updloadVaults,
        "POST",
      );

      return result || null;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async uploadAgent(agent: any[]): Promise<any | null> {
    try {
      const authParam: any = this.getAuthParam();
      authParam.agent = agent;

      const result = await this.executeFetch(
        authParam,
        this.endpoints.uploadAgent,
        "POST",
      );

      return result || null;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async allVaults(): Promise<any | null> {
    try {
      const authParam = this.getAuthParam();

      const vaultsFound: any[] = await this.executeFetch(
        authParam,
        this.endpoints.allVaults,
        "GET",
      );

      return vaultsFound || null;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async vaultById(id: number) {
    try {
      const authParam = this.getAuthParam();

      const vaultFound: any[] = await this.executeFetch(
        { vaultId: id, ...authParam },
        this.endpoints.vaultById,
        "GET",
      );

      return vaultFound;
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  // GET ALL VAULT HOLDERS

  async vaultHolders(vaultId: number) {
    try {
      const authParam = this.getAuthParam();

      const holdersFound: any[] = await this.executeFetch(
        authParam,
        `${this.endpoints.vaultHolders}/${vaultId}`,
        "GET",
      );

      return holdersFound || [];
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  // INSERT VAULT HOLDER

  async uploadVaultHolder(creatorId: number, vaultId: number) {
    try {
      const authParam: any = this.getAuthParam();

      authParam.creatorId = creatorId;
      authParam.vaultId = vaultId;

      const result = await this.executeFetch(
        authParam,
        this.endpoints.uploadVaultHolder,
        "POST",
      );

      return result || null;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  // GET CURRENT STRATEGY

  async currentStrategy(vaultId: number) {
    try {
      const authParam = this.getAuthParam();

      const strategyFound: any[] = await this.executeFetch(
        authParam,
        `${this.endpoints.currentStrategy}/${vaultId}`,
        "GET",
      );

      return strategyFound || [];
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  // INSERT CURRENT STRATEGY

  async updateCurrentStrategy(strategyId: number, vaultId: number) {
    try {
      const authParam: any = this.getAuthParam();

      authParam.strategyId = strategyId;
      authParam.vaultId = vaultId;

      const result = await this.executeFetch(
        authParam,
        this.endpoints.updateCurrentStrategy,
        "POST",
      );

      return result || null;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async executeFetch(body: any, endpoint: string, method: string) {
    try {
      const reqURL: string = this.baseURL + endpoint;

      const fetchRes: any = await fetch(reqURL, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthParam(),
        },
        ...(method !== "GET" ? { body: JSON.stringify(body) } : {}),
      });

      return await fetchRes.json();
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async setKey(_key: string) {
    this.key = _key;
  }
}

export default TelosAPI;

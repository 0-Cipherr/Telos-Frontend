class TelosAPI {
  baseURL: string = "";
  endpoints: any = null;
  setBaseURL(_baseUrl: string) {
    try {
      this.baseURL = _baseUrl;
    } catch (error) {
      console.log(error);
    }
  }

  setEndpoints(_endpoints: any) {
    this.endpoints = _endpoints;
  }

  async seedVault(vault: any, token: string) {
    try {
      const result = await this.callTelos(
        this.endpoints?.seedVault,
        { vault },
        "POST",
        token,
      );

      return result;
    } catch (error) {
      console.log(error);
      return { error: "Error seeding vault please check vault parameters!" };
    }
  }

  async vaultsById(vaultId: Number, token: string) {
    try {
      const result = await this.callTelos(
        this.endpoints?.vaultById + `/${vaultId}`,
        null,
        "GET",
        token,
      );

      return result;
    } catch (error) {
      console.log(error);
      return { error: "ERROR obtaining vault by its id" };
    }
  }

  async vaultsByName(name: string, token: string) {
    try {
      const result = await this.callTelos(
        this.endpoints?.vaultByName + `/${name}`,
        null,
        "GET",
        token,
      );

      return result;
    } catch (error) {
      console.log(error);
      return { error: "Could not obtain vault by its name" };
    }
  }

  async vaultsByChainId(chainId: Number, token: string) {
    try {
      const result = await this.callTelos(
        this.endpoints?.vaultsByChainId + `/${chainId}`,
        null,
        "GET",
        token,
      );
      return result;
    } catch (error) {
      console.log(error);
      return { error: "Could not obtain vault by chainId" };
    }
  }

  async getAgent(agentId: Number, token: string) {
    try {
      const result = await this.callTelos(
        this.endpoints?.getAgent + `/${agentId}`,
        null,
        "GET",
        token,
      );

      return result;
    } catch (error) {
      console.log(error);

      return { error: "could not obtain agent!" };
    }
  }

  async updateVaultMetrics(
    vaultId: Number,
    volume: Number,
    protocolFees: Number,
    apy: Number,
    token: string,
  ) {
    try {
      const result = await this.callTelos(
        this.endpoints?.updateVaultMetrics,
        { vaultId, volume, protocolFees, apy },
        "PUT",
        token,
      );
      return result;
    } catch (error) {
      console.log(error);
      return { error: "could not update vault metric" };
    }
  }

  async callTelos(
    endpoint: string,
    fetchBody: any,
    callMethod: string,
    token: string,
  ) {
    try {
      const finalReqBody =
        fetchBody !== null ? null : JSON.stringify(fetchBody);
      const constructedUrl: URL = new URL(this.baseURL, endpoint);
      const fetchResult = await fetch(constructedUrl, {
        method: callMethod,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: finalReqBody,
      });
      return (await fetchResult.json()) || { error: "No Results Found" };
    } catch (error) {
      console.log(error);
      return { error: "Could not cominucate with telos" };
    }
  }
}

export default TelosAPI;

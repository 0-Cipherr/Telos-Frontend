class TelosAPI {
  baseURL: string = "";
  endpoints: any;
  key: string | null;
  constructor(baseurl: string, _endpoints: any, _key: string | null) {
    this.baseURL = baseurl;
    this.endpoints = _endpoints;
    this.key = _key;
  }
  //to api all parameters passed in as the structre is when creating and querying array format
  getAuthParam() {
    return {
      Authorization: `Bearer ${this.key}`,
    };
  }

  async uploadVault(params: any[]): Promise<any[] | null> {
    try {
      const authParam = this.getAuthParam();
      const result = await this.executeFetch(
        authParam,
        this.endpoints.updloadVaults,
        "POST",
      );
      return result;
    } catch (error) {
      console.log(error);

      return null;
    }
  }

  async uploadAgent(_agentInfo: any) {
    try {
      const stringifiedAgent = JSON.stringify(_agentInfo);
    } catch (error) {}
  }
  async allVaults() {
    try {
      const authParam = this.getAuthParam();
      const vaultsFound: any[] = await this.executeFetch(
        authParam,
        this.endpoints.allVaults,
        "GET",
      );
      return vaultsFound || [];
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  async vaultById(id: Number) {
    try {
      const authParam = this.getAuthParam();
      const vaultFound: any[] = await this.executeFetch(
        { vaultId: id, authParam },
        this.endpoints?.vaultById,
        "GET",
      );

      return vaultFound;
    } catch (error) {
      console.log(error);

      return [];
    }
  }

  async executeFetch(body: any, endpoint: string, method: string) {
    try {
      const reqURL: string = this.baseURL + endpoint;
      const fetchRes: any = await fetch(reqURL, {
        method,
        body,
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
//exposes more capital to protocols on top of driving volume

class TelosAPI {
  baseURL: string = "";
  endpoints: any;
  constructor(baseurl: string, _endpoints: any) {
    this.baseURL = baseurl;
    this.endpoints = _endpoints;
  }

  async allVaults() {
    try {
      // const vaults: any[] = await this.executeFetch(
      //   false,
      //   [],
      //   this.endpoints?.allVaults,
      // );
      // return vaults || [];
      return [];
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  vaultById(id: Number) {
    try {
    } catch (error) {
      console.log(error);
    }
  }

  async executeFetch(body: any, endpoint: string, method: string) {
    try {
      const reqURL: string = this.baseURL + endpoint;
      const fetchRes = await fetch(reqURL, {
        method,
        body,
      });
      return await fetchRes.json();
    } catch (error) {
      console.log(error);
      return {};
    }
  }
}

export default TelosAPI;
//exposes more capital to protocols on top of driving volume

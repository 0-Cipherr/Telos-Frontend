class TelosAPI {
  baseURL: string = "";
  API(baseurl: string) {
    this.baseURL = baseurl;
  }

  async allVaults() {
    try {
      const vaults: any[] = await this.executeFetch(false, [], "");

      return vaults || [];
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  vault(id: Number) {
    try {
    } catch (error) {
      console.log(error);
    }
  }

  async executeFetch(hasBody: boolean, fetchParams: any[], endpoint: string) {
    try {
      const reqURL: string = this.baseURL + endpoint;
      const fetchRes = await fetch(reqURL);
      return await fetchRes.json();
    } catch (error) {
      console.log(error);
      return {};
    }
  }
}

export default TelosAPI;

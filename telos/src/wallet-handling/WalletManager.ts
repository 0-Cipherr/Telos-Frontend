import { http, createWalletClient, custom } from "viem";
import TelosAPI from "../api-handler/Telos/TelosAPI";
class WalletManager {
  functions: any = null;
  viemChains: any = null;
  walletClient: any = null;
  wallet: any = null;
  async setViemChains(_viemChains: any) {
    try {
      this.viemChains = _viemChains;
    } catch (error) {
      console.log(error);
    }
  }
  async setWalletClient(chainId: Number, ethereumProvider: any) {
    this.walletClient = createWalletClient({
      chain: this.viemChains[String(chainId)],
      transport: custom(ethereumProvider),
    });
  }

  setWallet(_wallet: any) {
    this.wallet = _wallet;
  }

  async getDeploymentABI(address: string, chainId: Number) {}

  async instantiateCOnnection() {}

  async getWalletAddress(): Promise<string | null> {
    return this?.wallet?.address || null;
  }

  async createVault(api: TelosAPI, vault: any) {
    try {
      const result = await this.write("Deploy", "", [], []);
    } catch (error) {
      console.log(error);
    }
  }

  async createVaults() {}
  hasClient(): boolean {
    return this.walletClient !== null;
  }
  async write(functionName: string, address: string, args: any[], abi: any[]) {
    if (this.hasClient() === true) {
      const result = await this.walletClient.writeContract({
        functionName,
        address,
        args,
        abi,
      });

      return result || {};
    } else {
      throw new Error("No Client Available to run tx");
    }
  }
  l;
  async read(functionName: string, address: string, abi: any[], args: any[]) {
    if (this.hasClient() === true) {
      const result = await this.walletClient.readContract({
        functionName,
        address,
        abi,
        args,
      });

      return result || {};
    } else {
      throw new Error("No Client Available to run tx");
    }
  }
}

export default WalletManager;

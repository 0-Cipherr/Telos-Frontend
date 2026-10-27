import { useWallets, UseWalletsInterface } from "@privy-io/react-auth";
import { createContext, ReactNode, useEffect, useState } from "react";
import TelosAPI from "../api-handler/Telos/telos-api-methods";
import { OnchainExecutor } from "../onchain/OnchainExecutor";
import { address } from "../types/solidity-types";

type SingletonManager = {
  telosAPIInstance: TelosAPI | null;
  onchainExecutorInstance: OnchainExecutor | null;
};
//idea proposed managed instance for all of our sclasses accross all pages
//so all data is on the same page and is effeciently retrieved and used
export const TelosSingletonContext = createContext(null);

export function telosSingletonManager({ children }: { children: ReactNode }) {
  const { wallets }: UseWalletsInterface = useWallets();
  const [singleton, setSingleton] = useState<SingletonManager>();

  useEffect(() => {
    if (wallets[0]?.address) {
      const clientEvent = async () => {
        await updateWalletClient();
      };
      clientEvent();
    }
  }, [wallets]);
  async function instantiateClasses() {
    const telosAPIInstance: TelosAPI | null = telosAPI();
    const onchainExecutorInstance: OnchainExecutor | null = onchainExecutor();

    setSingleton({
      telosAPIInstance,
      onchainExecutorInstance,
    });
  }

  function telosAPI(): TelosAPI | null {
    return new TelosAPI("", "", ""); //initialize ke empty then when ser connect wallet we generate api key
  }

  function onchainExecutor(): OnchainExecutor | null {
    return new OnchainExecutor();
  }

  async function reinstantiateClasses() {}

  async function updateWalletClient() {
    try {
      if (singleton) {
        const numericChainId = Number(wallets[0]?.chainId.split(":")[1]);
        if (singleton?.onchainExecutorInstance && wallets[0]?.address) {
          await singleton?.onchainExecutorInstance.createClient(
            wallets[0]?.address as address,
            numericChainId,
          );
        }
      } else {
      }
    } catch (error) {
      console.log(error);
      throw new Error("Could not instantiate onchainExecutor!");
    }
  }
  return (
    <TelosSingletonContext.Provider value={null}>
      {children}
    </TelosSingletonContext.Provider>
  );
}

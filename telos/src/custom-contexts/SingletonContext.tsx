import React, { createContext, useEffect, useState } from "react";
import { useContext, ReactNode } from "react";
import TelosAPI from "../api-handler/Telos/TelosAPI.ts";
import WalletManager from "../wallet-handling/WalletManager.ts";
export type SingletonContextType = {
  api: TelosAPI | null;
  walletManager: WalletManager | null;
};

export const SingletonContext = createContext<SingletonContextType | null>(
  null,
);

export function SingletonContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [API, setAPI] = useState<TelosAPI | null>(null);
  const [walletManager, setWaletManager] = useState<WalletManager | null>(null);
  useEffect(() => {
    const seed = async () => {
      await instantiateClasses();
    };
    seed();
  }, []);

  async function instantiateClasses() {
    const api: TelosAPI | null = initializeTelosAPI("", "");
    const walletManagerC: WalletManager | null = initializeWalletManager();
    setAPI(api);
    setWaletManager(walletManagerC);
  }
  return (
    <SingletonContext.Provider
      value={{ api: API, walletManager: walletManager }}
    >
      {children}
    </SingletonContext.Provider>
  );
}

function initializeWalletManager(): WalletManager {
  const walletManager = new WalletManager();
  return walletManager;
}

function initializeLLM() {}

function initializeTelosAPI(baseUrl: string, endpoints: any): TelosAPI | null {
  try {
    const api = new TelosAPI();
    api.setBaseURL(baseUrl);
    api.setEndpoints(endpoints);
    return api;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export default function useSingletonContext() {}

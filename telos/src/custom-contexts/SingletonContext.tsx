import React, { createContext, useState } from "react";
import { useContext, ReactNode } from "react";
import TelosAPI from "../api-handler/Telos/TelosAPI.ts";
export type SingletonContextType = {
  api: TelosAPI | null;
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

  async function instantiateClasses() {
    const api: TelosAPI | null = initializeTelosAPI("", "");

    setAPI(api);
  }
  return (
    <SingletonContext.Provider value={{ api: API }}>
      {children}
    </SingletonContext.Provider>
  );
}

function initializeWalletManager() {}

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

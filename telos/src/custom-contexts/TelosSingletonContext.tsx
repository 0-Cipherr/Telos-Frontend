import { createContext, ReactNode, useState } from "react";
//idea proposed managed instance for all of our sclasses accross all pages
//so all data is on the same page and is effeciently retrieved and used
export const TelosSingletonContext = createContext(null);

export function telosSingletonManager({ children }: { children: ReactNode }) {
  const [singleton, setSingleton] = useState();
  async function instantiateClasses() {}

  async function reinstantiateClasses() {}
  return (
    <TelosSingletonContext.Provider value={null}>
      {children}
    </TelosSingletonContext.Provider>
  );
}

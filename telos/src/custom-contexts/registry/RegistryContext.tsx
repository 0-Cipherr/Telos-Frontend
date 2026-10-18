import { useState } from "react";
import { createContext } from "vm";

export const RegistryContext = createContext(RegistryExecutor);
function RegistryExecutor() {
  const [vaults, setVaults] = useState([]);

  async function getAllVaults() {
    try {
      // const vaultsFound = await
    } catch (error) {
      console.log(error);
    }
  }
  return {
    getAllVaults,
  };
}

export default RegistryContext;

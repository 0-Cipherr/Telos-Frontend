import { useState } from "react";
import { createContext } from "vm";
import TelosAPI from "../../api-handler/Telos/telos-api-methods";

export const RegistryContext = createContext(RegistryExecutor);
function RegistryExecutor() {
  const telosAPI = new TelosAPI("", {});
  const [vaults, setVaults] = useState([]);

  async function getAllVaults() {
    try {
      const vaultsFound = (await telosAPI.allVaults()) || [];
      setVaults(vaultsFound);
    } catch (error) {
      console.log(error);
      return [];
    }
  }
  return {
    getAllVaults,
    vaults,
  };
}

export default RegistryContext;

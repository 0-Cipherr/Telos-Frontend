import { useState } from "react";
import { createContext } from "vm";
import TelosAPI from "../../api-handler/Telos/telos-api-methods";

export const RegistryContext = createContext(RegistryExecutor);
function RegistryExecutor() {
  const telosAPI = new TelosAPI("", {}, "");
  const [vaults, setVaults] = useState([]);

  async function getAllVaults() {
    try {
      const vaultsFound: any = (await telosAPI.allVaults()) || [];
      setVaults(vaultsFound);
    } catch (error) {
      console.log(error);
      return [];
    }
  }


  async function getVaultByName(){

  }

  async function getVaulltByChains(){}

  async function getVaultByCreator(){}

  async function getVaultById(id:number){
          const vaultsFound: any = (await telosAPI.vaultById(id)) || [];
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

import { useWallets } from "@privy-io/react-auth";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { baseSepolia } from "viem/chains";
import { Registry } from "../onchain/Registry";
import type { address } from "../types/solidity-types";

// 1. Explicitly type what data the context holds
interface RegistryContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  owner: address | undefined;
  setOwner: (owner: address) => void;
  deployParams: Uint8Array | undefined;
  setDeployParams: (params: Uint8Array) => void;
  setFeeReceiver: (params: any) => void;
  createVault: (owner: address, deployParams: Uint8Array) => Promise<unknown>;
  feeReceiver: any;
  vaultName: any;
  setVaultName: (params: any) => void;
  vaultTicker: any;
  setVaultTicker: (params: any) => void;
  vaultChains: any;
  setVsultChains: (params: any) => void;
}

// 2. ✅ FIXED: Pass null as the starting state, and explicitly type the context
const RegistryActionModalContext = createContext<RegistryContextType | null>(
  null,
);

// 3. This is your component wrapper
export function RegistryActionModalProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [owner, setOwner] = useState<address>();
  const [deployParams, setDeployParams] = useState<Uint8Array>();
  const [feeReceiver, setFeeReceiver] = useState(`0xdddd20020`);
  const [vaultName, setVaultName] = useState(`0xdddd20020`);
  const [vaultTicker, setVaultTicker] = useState(`0xdddd20020`);
  const [vaultChains, setVsultChains] = useState([]);
  const [vaultFee, setVaultFee] = useState(0);

  const { wallets }: any = useWallets();
  const registry = new Registry();

  useEffect(() => {
    refreshClientConfig();
  }, [wallets]);
  async function createVault() {
    try {
      const result = await registry.deployHubVault(owner, [
        vaultName,
        vaultChains,
        vaultTicker,
        [vaultFee],
        [owner],
      ]);
      console.log("RESULT: ", result);
    } catch (error) {
      console.error(error);
    }
  }

  async function refreshClientConfig() {
    await registry.createClient(wallets[0]?.address, baseSepolia);
  }
  // 4. ✅ FIXED: Make sure you are using RegistryActionModalContext.Provider here
  return (
    <RegistryActionModalContext.Provider
      value={{
        open,
        setOpen,
        owner,
        setOwner,
        deployParams,
        setDeployParams,
        createVault,
        feeReceiver,
        setFeeReceiver,
        vaultName,
        setVaultName,
        vaultTicker,
        setVaultTicker,
        vaultChains,
        setVsultChains,
      }}
    >
      {children}
    </RegistryActionModalContext.Provider>
  );
}

// 5. This is your usage hook
export function useRegistryActionModal() {
  const context = useContext(RegistryActionModalContext);
  if (!context) {
    throw new Error(
      "useRegistryActionModal must be used within a RegistryActionModalProvider",
    );
  }
  return context;
}

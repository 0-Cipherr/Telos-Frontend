import { useWallets } from "@privy-io/react-auth";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { Registry } from "../onchain/Registry";
import type { StrategySpec } from "../strategies/strategy-standard";
import type { CreatorRewardMode } from "../vaults";

export type RegistryContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;

  owner?: string;
  setOwner: (owner?: string) => void;

  vaultName: string;
  setVaultName: (name: string) => void;

  vaultTicker: string;
  setVaultTicker: (ticker: string) => void;

  vaultDescription: string;
  setVaultDescription: (description: string) => void;

  /** Networks selected in the launchpad picker. */
  vaultChains: string[];
  setVaultChains: (chains: string[]) => void;

  /**
   * The `address[]` parameter passed to vault creation.
   * The first entry is normally the connected wallet.
   */
  vaultAddresses: string[];
  setVaultAddresses: (addresses: string[]) => void;

  /** Launchpad listing ids (see LAUNCHPADS in vaults.ts). */
  vaultLaunchpads: string[];
  setVaultLaunchpads: (launchpads: string[]) => void;

  /** Where creator rewards are routed (mine AI tokens, stake, or claim fees). */
  vaultCreatorRewards: CreatorRewardMode;
  setVaultCreatorRewards: (mode: CreatorRewardMode) => void;

  /** Creator fee in percentage points (0-8). */
  vaultFee: number;
  setVaultFee: (fee: number) => void;

  feeReceiver: string;
  setFeeReceiver: (receiver: string) => void;

  /** Strategy text or the full Solidity source from the strategy lab. */
  strategy: string;
  setStrategy: (strategy: string) => void;

  /** Metadata produced by the chat agent alongside the contract. */
  strategySpec: StrategySpec | null;
  setStrategySpec: (spec: StrategySpec | null) => void;
};

const RegistryActionModalContext = createContext<RegistryContextType | null>(
  null,
);

export function RegistryActionModalProvider({
  children,
  registry,
}: {
  children: ReactNode;
  registry: Registry;
}) {
  const { wallets }: any = useWallets();
  const [open, setOpenState] = useState(false);
  const [owner, setOwner] = useState<string>();
  const [vaultName, setVaultName] = useState("");
  const [vaultTicker, setVaultTicker] = useState("");
  const [vaultDescription, setVaultDescription] = useState("");
  const [vaultChains, setVaultChains] = useState<string[]>(["Base"]);
  const [vaultAddresses, setVaultAddresses] = useState<string[]>([]);
  const [vaultLaunchpads, setVaultLaunchpads] = useState<string[]>(["pons"]);
  const [vaultCreatorRewards, setVaultCreatorRewards] =
    useState<CreatorRewardMode>("fees");
  const [vaultFee, setVaultFee] = useState(5);
  const [feeReceiver, setFeeReceiver] = useState("");
  const [strategy, setStrategy] = useState("");
  const [strategySpec, setStrategySpec] = useState<StrategySpec | null>(null);
  const [enableAgent, setEnableAgent] = useState(false);

  async function deployVault() {
    if (enableAgent) {
      deployVaultNativeWithAgent();
    } else {
      deployVaultNative;
    }
  }

  async function deployVaultNative() {
    try {
      await registry.deployHubVault(null, wallets[0]?.address);
    } catch (error) {
      console.log(error);
    }
  }

  async function deployVaultNativeWithAgent() {
    try {
    } catch (error) {
      console.log(error);
    }
  }
  /**
   * Clear the seed values when the dialog closes so an unattached contract or
   * a previous draft never leaks into the next "Create Vault" click. The
   * strategy lab writes fresh values immediately before opening the dialog.
   */
  const setOpen = useCallback((next: boolean) => {
    if (!next) {
      setOwner(undefined);
      setVaultName("");
      setVaultTicker("");
      setVaultDescription("");
      setVaultChains(["Base"]);
      setVaultAddresses([]);
      setVaultLaunchpads(["pons"]);
      setVaultCreatorRewards("fees");
      setVaultFee(5);
      setFeeReceiver("");
      setStrategy("");
      setStrategySpec(null);
    }
    setOpenState(next);
  }, []);

  return (
    <RegistryActionModalContext.Provider
      value={{
        open,
        setOpen,
        owner,
        setOwner,
        vaultName,
        setVaultName,
        vaultTicker,
        setVaultTicker,
        vaultDescription,
        setVaultDescription,
        vaultChains,
        setVaultChains,
        vaultAddresses,
        setVaultAddresses,
        vaultLaunchpads,
        setVaultLaunchpads,
        vaultCreatorRewards,
        setVaultCreatorRewards,
        vaultFee,
        setVaultFee,
        feeReceiver,
        setFeeReceiver,
        strategy,
        setStrategy,
        strategySpec,
        setStrategySpec,
        enableAgent,
        setEnableAgent,
      }}
    >
      {children}
    </RegistryActionModalContext.Provider>
  );
}

export function useRegistryActionModal() {
  const context = useContext(RegistryActionModalContext);
  if (!context) {
    throw new Error(
      "useRegistryActionModal must be used within a RegistryActionModalProvider",
    );
  }
  return context;
}

import { useWallets } from "@privy-io/react-auth";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { LaunchPad } from "../interfaces/LaunchPad";
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
  setVaultAddresses: Dispatch<SetStateAction<string[]>>;

  /** Launchpad listing ids (see LAUNCHPADS in vaults.ts). */
  vaultLaunchpads: string[];
  setVaultLaunchpads: (launchpads: string[]) => void;

  /** Where creator rewards are routed (mine AI tokens, stake, or claim fees). */
  vaultCreatorRewards: CreatorRewardMode;
  setVaultCreatorRewards: (mode: CreatorRewardMode) => void;

  /** Creator fee in ethers (wei). The modal formats it as a percentage. */
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

  /** Whether the vault should run an onchain strategy agent. */
  enableAgent: boolean;
  setEnableAgent: (enabled: boolean) => void;

  /**
   * Model selected for the vault's onchain strategy agent. The OpenRouter key
   * is minted by the backend, so the UI only carries the model id.
   */
  agentModel: string;
  setAgentModel: (model: string) => void;
};

export const DEFAULT_AGENT_MODEL = "openai/gpt-4o-mini";

const RegistryActionModalContext = createContext<RegistryContextType | null>(
  null,
);

export function RegistryActionModalProvider({
  children,
}: {
  children: ReactNode;
  registry: Registry;
  launchPads: Map<number, LaunchPad>;
}) {
  useWallets();
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
  const [vaultFee, setVaultFee] = useState<number>(5);
  const [feeReceiver, setFeeReceiver] = useState("");
  const [strategy, setStrategy] = useState("");
  const [strategySpec, setStrategySpec] = useState<StrategySpec | null>(null);
  const [enableAgent, setEnableAgent] = useState(false);
  const [agentModel, setAgentModel] = useState(DEFAULT_AGENT_MODEL);

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
      setEnableAgent(false);
      setAgentModel(DEFAULT_AGENT_MODEL);
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
        agentModel,
        setAgentModel,
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

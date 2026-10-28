import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import CreateStrategyModal from "../components/CreateStrategyModal";
import StrategyChatModal from "../components/StrategyChatModal";
import type { StrategySpec } from "../strategies/strategy-standard";
import { useRegistryActionModal } from "./ModalContext";

type StrategyLauncherContextValue = {
  open: boolean;
  openStrategy: () => void;
  closeStrategy: () => void;
};

const StrategyLauncherContext =
  createContext<StrategyLauncherContextValue | null>(null);

/**
 * Mounts the strategy lab and the create-strategy verification dialog once for
 * the whole app.
 *
 * The chat never opens the create-vault dialog directly. Its output goes to the
 * create-strategy modal first, where the contract is verified and registered.
 * Only then can the user choose to open create-vault with that strategy.
 */
export function StrategyLauncherProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [pendingSpec, setPendingSpec] = useState<StrategySpec | null>(null);
  const {
    setOpen: setCreateOpen,
    setStrategy,
    setStrategySpec,
    setVaultName,
    setVaultTicker,
    setVaultDescription,
    setVaultChains,
    setVaultFee,
  } = useRegistryActionModal();

  const openStrategy = useCallback(() => {
    setStrategyOpen(false);
    setOpen(true);
  }, []);
  const closeStrategy = useCallback(() => setOpen(false), []);
  const closeCreateStrategy = useCallback(() => setStrategyOpen(false), []);

  const handleUseStrategy = useCallback((spec: StrategySpec) => {
    // 1. Keep the exact contract produced by the agent.
    setPendingSpec(spec);
    // 2. Close the chat and open the separate create-strategy modal.
    setOpen(false);
    setStrategyOpen(true);
  }, []);

  const handleCreateVault = useCallback(
    (spec: StrategySpec) => {
      // Attach the verified contract and pre-fill the create-vault form.
      setStrategy(spec.code || spec.prompt);
      setStrategySpec(spec);
      setVaultName(spec.name);
      setVaultTicker(spec.ticker);
      setVaultDescription(spec.thesis);
      setVaultChains(spec.chain ? [spec.chain] : ["Base"]);
      setVaultFee(spec.fee);

      setStrategyOpen(false);
      setCreateOpen(true);
    },
    [
      setCreateOpen,
      setStrategy,
      setStrategySpec,
      setVaultChains,
      setVaultDescription,
      setVaultFee,
      setVaultName,
      setVaultTicker,
    ],
  );

  const value = useMemo(
    () => ({ open, openStrategy, closeStrategy }),
    [closeStrategy, open, openStrategy],
  );

  return (
    <StrategyLauncherContext.Provider value={value}>
      {children}
      <StrategyChatModal
        open={open}
        onClose={closeStrategy}
        onUseStrategy={handleUseStrategy}
      />
      <CreateStrategyModal
        open={strategyOpen}
        spec={pendingSpec}
        onClose={closeCreateStrategy}
        onCreateVault={handleCreateVault}
        onOpenChat={openStrategy}
      />
    </StrategyLauncherContext.Provider>
  );
}

export function useStrategyLauncher() {
  const context = useContext(StrategyLauncherContext);
  if (!context) {
    throw new Error(
      "useStrategyLauncher must be used within a StrategyLauncherProvider",
    );
  }
  return context;
}

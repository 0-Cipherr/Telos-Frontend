/* oxlint-disable react/only-export-components -- context, provider and hook share one module; Fast Refresh just reloads these files fully. */
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

type StrategyLauncherContextValue = {
  open: boolean;
  openStrategy: () => void;
  closeStrategy: () => void;
};

const StrategyLauncherContext =
  createContext<StrategyLauncherContextValue | null>(null);

/**
 * Mounts the strategy chat and the review-and-deploy dialog once for the whole
 * app. The chat hands its draft to the review dialog, which deploys it.
 */
export function StrategyLauncherProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [pendingSpec, setPendingSpec] = useState<StrategySpec | null>(null);
  // Bumping the key remounts the review dialog, so every review starts clean.
  const [reviewKey, setReviewKey] = useState(0);

  const openStrategy = useCallback(() => {
    setReviewOpen(false);
    setOpen(true);
  }, []);
  const closeStrategy = useCallback(() => setOpen(false), []);
  const closeReview = useCallback(() => setReviewOpen(false), []);

  const handleUseStrategy = useCallback((spec: StrategySpec) => {
    setPendingSpec(spec);
    setReviewKey((key) => key + 1);
    setOpen(false);
    setReviewOpen(true);
  }, []);

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
        key={reviewKey}
        open={reviewOpen}
        spec={pendingSpec}
        onClose={closeReview}
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

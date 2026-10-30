import type { ReactNode } from "react";
import { CreatedVaultsProvider } from "./custom-contexts/CreatedVaultsContext";
import { RegistryActionModalProvider } from "./custom-contexts/ModalContext";
import { StrategyLauncherProvider } from "./custom-contexts/StrategyLauncherContext";
import { TxConfirmerProvider } from "./custom-contexts/TxConfirmerContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CreatedVaultsProvider>
      <TxConfirmerProvider>
        <RegistryActionModalProvider>
          <StrategyLauncherProvider>{children}</StrategyLauncherProvider>
        </RegistryActionModalProvider>
      </TxConfirmerProvider>
    </CreatedVaultsProvider>
  );
}

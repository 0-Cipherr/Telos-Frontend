import { PrivyProvider } from "@privy-io/react-auth";
import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App, { PreviewApp } from "./App";
import SplashScreen from "./SplashScreen";
import { CreatedVaultsProvider } from "./custom-contexts/CreatedVaultsContext";
import { DeedMarketProvider } from "./custom-contexts/DeedMarketContext";
import { RegistryActionModalProvider } from "./custom-contexts/ModalContext";
import { StrategyLauncherProvider } from "./custom-contexts/StrategyLauncherContext";
import { TxConfirmerProvider } from "./custom-contexts/TxConfirmerContext";
import "./index.css";
import "./tailwind.css";
import "./deeds.css";

const appId = import.meta.env.VITE_PRIVY_APP_ID as string | undefined;
const missing =
  !appId || appId.startsWith("your_") || appId.startsWith("PASTE_");

// Privy v3 throws "Embedded wallet is only available over HTTPS" on insecure
// origins, which crashes the whole tree. `localhost` is secure, a LAN IP over
// plain http is not. Rather than rendering a blank page on a phone, fall back
// to wallet-less preview mode and point at the fix.
const insecure =
  typeof window !== "undefined" && window.isSecureContext === false;

if (insecure && !missing) {
  console.warn(
    "[telos] Insecure origin: wallet connect is disabled. Open the app over " +
      "HTTPS (e.g. `npm run tunnel`) to test Privy on a phone.",
  );
}

const previewReason: "missing" | "insecure" | null = missing
  ? "missing"
  : insecure
    ? "insecure"
    : null;

// Keep the app-level contexts inside PrivyProvider so hooks such as
// `useWallets` can see the connected wallet. The strategy launcher wraps the
// router tree so the agent is available on every page.
function Providers({ children }: { children: ReactNode }) {
  return (
    <CreatedVaultsProvider>
      <DeedMarketProvider>
        <TxConfirmerProvider>
          <RegistryActionModalProvider registry={""}>
            <StrategyLauncherProvider>{children}</StrategyLauncherProvider>
          </RegistryActionModalProvider>
        </TxConfirmerProvider>
      </DeedMarketProvider>
    </CreatedVaultsProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SplashScreen />
    <BrowserRouter>
      {previewReason ? (
        <Providers>
          <PreviewApp reason={previewReason} />
        </Providers>
      ) : (
        <PrivyProvider
          appId={appId as string}
          config={{
            loginMethods: ["wallet", "sms"],
            appearance: {
              theme: "#f1f1ea",
              accentColor: "#8fd400",
              showWalletLoginFirst: true,
              logo: "/icon.svg",
            },
          }}
        >
          <Providers>
            <App />
          </Providers>
        </PrivyProvider>
      )}
    </BrowserRouter>
  </StrictMode>,
);

import { PrivyProvider } from "@privy-io/react-auth";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { RegistryActionModalProvider } from "./custom-contexts/ModalContext";
import { TxConfirmerProvider } from "./custom-contexts/TxConfirmerContext";
import "./index.css";
import "./tailwind.css";

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

const disablePrivy = missing || insecure;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RegistryActionModalProvider>
      <TxConfirmerProvider>
        {disablePrivy ? (
          <App />
        ) : (
          <PrivyProvider
            appId={appId}
            config={{
              loginMethods: ["wallet"],
              appearance: {
                theme: "#f1f1ea",
                accentColor: "#8fd400",
                showWalletLoginFirst: true,
                logo: "/icon.svg",
              },
            }}
          >
            <App />
          </PrivyProvider>
        )}
      </TxConfirmerProvider>
    </RegistryActionModalProvider>
  </StrictMode>,
);

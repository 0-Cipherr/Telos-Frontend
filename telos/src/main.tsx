import { PrivyProvider } from "@privy-io/react-auth";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App, { PreviewApp } from "./App";
import { Providers } from "./Providers";
import SplashScreen from "./SplashScreen";
import "./index.css";
import "./tailwind.css";

const appId = import.meta.env.VITE_PRIVY_APP_ID as string | undefined;
const missing = !appId || appId.startsWith("your_") || appId.startsWith("PASTE_");

// Privy v3 throws "Embedded wallet is only available over HTTPS" on insecure
// origins, which crashes the whole tree. `localhost` is secure, a LAN IP over
// plain http is not. Fall back to wallet-less preview mode and point at the fix.
const insecure = typeof window !== "undefined" && window.isSecureContext === false;

const previewReason: "missing" | "insecure" | null = missing ? "missing" : insecure ? "insecure" : null;

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

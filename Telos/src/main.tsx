import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { PrivyProvider } from "@privy-io/react-auth";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PrivyProvider
      appId="your-privy-app-id"
      clientId="your-app-client-id"
      config={{
        // Create embedded wallets for users who don't have a wallet
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <App />
    </PrivyProvider>
  </StrictMode>,
);

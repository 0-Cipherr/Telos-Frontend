import "../tailwind.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import TelosTemplate from "./TelosTemplate";

/**
 * Standalone preview entry. Open http://localhost:5173/template.html
 * This file does not affect the existing App.tsx / main.tsx entry point.
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TelosTemplate
      preview
      ready
      authenticated={false}
      login={() =>
        window.alert(
          "Add VITE_PRIVY_APP_ID to .env.local and restart the dev server to enable wallet connect.",
        )
      }
      logout={() => {}}
    />
  </StrictMode>,
);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./telos.css";
import VaultDetails from "./components/VaultDetails";
import { VAULTS } from "./data";

try {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <VaultDetails vault={VAULTS[0]} onClose={() => {}} />
    </StrictMode>,
  );
} catch (error) {
  const pre = document.createElement("pre");
  pre.textContent = String(error);
  document.body.appendChild(pre);
}

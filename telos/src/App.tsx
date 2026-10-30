import { usePrivy } from "@privy-io/react-auth";
import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Home from "./Home";
import { useRegistryActionModal } from "./custom-contexts/ModalContext";
import RegistryActionModal from "./components/RegistryActionModal";
import CreatorProfilePage from "./pages/CreatorProfilePage";
import StrategiesPage from "./pages/StrategiesPage";
import VaultDetailPage from "./pages/VaultDetailPage";
import VaultsPage from "./pages/VaultsPage";
import { connectTelosCreator } from "./api-handler/Telos/telos-session";

type PreviewReason = "missing" | "insecure";

let connectedAddress: string | null = null;

type WalletProps = {
  ready: boolean;
  authenticated: boolean;
  login: () => void;
  logout: () => void;
  address?: string;
};

/** Restore scroll on route changes and honour `/#section` links. */
function RouteEffects() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) {
        target.scrollIntoView({ block: "start" });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0 });
  }, [location.pathname, location.hash]);

  return null;
}

function AppRoutes({
  preview,
  previewReason,
  ...wallet
}: WalletProps & { preview?: boolean; previewReason?: PreviewReason }) {
  return (
    <>
      <RouteEffects />
      <Routes>
        <Route
          path="/"
          element={
            <Home
              {...wallet}
              preview={preview}
              previewReason={previewReason}
            />
          }
        />
        <Route path="/vaults" element={<VaultsPage {...wallet} />} />
        <Route path="/vaults/:vaultId" element={<VaultDetailPage {...wallet} />} />
        <Route path="/strategies" element={<StrategiesPage {...wallet} />} />
        <Route path="/creators/:address" element={<CreatorProfilePage {...wallet} />} />
        <Route path="/profile/:address" element={<CreatorProfilePage {...wallet} />} />
        <Route
          path="*"
          element={
            <Home
              {...wallet}
              preview={preview}
              previewReason={previewReason}
            />
          }
        />
      </Routes>
    </>
  );
}

/**
 * Wallet-less fallback used when Privy cannot be mounted (missing app id or an
 * insecure origin such as http://<lan-ip>). It renders the same UI, but the
 * connect button explains what needs fixing instead of doing nothing.
 */
export function PreviewApp({ reason = "missing" }: { reason?: PreviewReason }) {
  const { open } = useRegistryActionModal();

  const explain = () => {
    if (reason === "insecure") {
      window.alert(
        "Wallet connect needs a secure origin. Open the app on http://localhost " +
          "or run `npm run tunnel` for an HTTPS URL, then try again.",
      );
      return;
    }
    window.alert(
      "Add VITE_PRIVY_APP_ID to .env.local and restart the dev server to enable wallet connect.",
    );
  };

  return (
    <>
      {open && <RegistryActionModal />}
      <AppRoutes
        ready
        authenticated={false}
        login={explain}
        logout={() => {}}
        preview
        previewReason={reason}
      />
    </>
  );
}

export default function App() {
  const { open }: any = useRegistryActionModal();
  const { ready, authenticated, login, logout, user, getAccessToken } = usePrivy();
  const address = user?.wallet?.address;

  // First wallet connect: the backend issues this user's Telos API key and
  // OpenRouter access is handled server-side. Runs once per wallet.
  useEffect(() => {
    if (!ready || !authenticated || !address) return;
    if (connectedAddress === address) return;
    connectedAddress = address;
    getAccessToken()
      .then((token) => (token ? connectTelosCreator(address, token) : null))
      .catch((error) => {
        connectedAddress = null;
        console.error("[telos] connect failed:", error);
      });
  }, [ready, authenticated, address, getAccessToken]);

  return (
    <>
      {open && <RegistryActionModal address={address} />}
      <AppRoutes
        ready={ready}
        authenticated={authenticated}
        login={() => login()}
        logout={() => logout()}
        address={address}
      />
    </>
  );
}

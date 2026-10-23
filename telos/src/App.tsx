import { usePrivy } from "@privy-io/react-auth";
import Home from "./Home";
import { useRegistryActionModal } from "./custom-contexts/ModalContext";
import RegistryActionModal from "./design/components/RegistryActionModal";

type PreviewReason = "missing" | "insecure";

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

      <Home
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

  const { ready, authenticated, login, logout, user } = usePrivy();
  return (
    <>
      {open && <RegistryActionModal />}

      <Home
        ready={ready}
        authenticated={authenticated}
        login={() => login()}
        logout={() => logout()}
        address={user?.wallet?.address}
      />
    </>
  );
}

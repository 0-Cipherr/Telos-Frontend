import { usePrivy } from "@privy-io/react-auth";
import Home from "./Home";
import { useRegistryActionModal } from "./custom-contexts/ModalContext";
import RegistryActionModal from "./design/components/RegistryActionModal";

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

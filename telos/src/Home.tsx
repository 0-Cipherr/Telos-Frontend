import { useState } from "react";
import Logo from "./Logo";
import Navbar from "./components/Navbar";
import SearchBar from "./components/SearchBar";
import VaultTable from "./components/VaultTable";
import Calculator from "./components/Calculator";
import LaunchForm from "./components/LaunchForm";
import Footer from "./components/Footer";
import StrategyChatModal, {
  type StrategySpec,
} from "./components/StrategyChatModal";
import { useRegistryActionModal } from "./custom-contexts/ModalContext";
import type { VaultFilterKind } from "./vaults";
import { VAULTS } from "./vaults";

type Props = {
  ready: boolean;
  authenticated: boolean;
  login: () => void;
  logout: () => void;
  address?: string;
  preview?: boolean;
  previewReason?: "missing" | "insecure";
};

export default function Home({
  ready,
  authenticated,
  login,
  logout,
  address,
  preview,
  previewReason,
}: Props) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<VaultFilterKind>("all");
  const [chain, setChain] = useState("All");
  const [strategyOpen, setStrategyOpen] = useState(false);
  const { setOpen, setStrategy } = useRegistryActionModal();

  const handleUseStrategy = (spec: StrategySpec) => {
    setStrategy(spec.code || spec.prompt);
    setStrategyOpen(false);
    setOpen(true);
  };

  return (
    <div className="page">
      {preview ? (
        <div className="preview-bar">
          {previewReason === "insecure"
            ? "Preview mode: wallet connect needs HTTPS. Open http://localhost or run `npm run tunnel` to test on a phone."
            : "Preview mode: add VITE_PRIVY_APP_ID to .env.local to enable wallet connect"}
        </div>
      ) : null}

      <Navbar
        ready={ready}
        authenticated={authenticated}
        login={login}
        logout={logout}
        address={address}
        onCreateStrategy={() => setStrategyOpen(true)}
      />

      <main className="wrap">
        <section className="hero">
          <h1 className="logo-heading">
            <Logo size={44} />
            <span>
              tel<span className="lime-text">os</span>
            </span>
          </h1>
          <p className="tagline">
            Yield vaults. Search, deposit, done. <b>Testnet only.</b>
          </p>
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            kind={kind}
            onKindChange={setKind}
            chain={chain}
            onChainChange={setChain}
          />
        </section>

        <section id="vaults" className="section">
          <div className="section-title">
            <h2>Vaults</h2>
            <span className="sample-tag">SAMPLE DATA</span>
          </div>
          <VaultTable vaults={VAULTS} query={query} kind={kind} chain={chain} />
          <p className="note">
            SAMPLE DATA — not live yields. Testnet only. Protocols shown are
            example strategy targets, not official integrations or partnerships.
            Base and Arbitrum are planned targets; Telos currently runs on their
            Sepolia testnets.
          </p>
        </section>

        <Calculator />

        <LaunchForm address={address} />

        <p className="note">
          Telos is testnet software provided as is. Nothing here is an offer or
          financial advice.
        </p>
      </main>

      <Footer />

      <StrategyChatModal
        open={strategyOpen}
        onClose={() => setStrategyOpen(false)}
        onUseStrategy={handleUseStrategy}
      />
    </div>
  );
}

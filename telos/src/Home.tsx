import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import Navbar from "./components/Navbar";
import SearchBar from "./components/SearchBar";
import VaultTable from "./components/VaultTable";
import Calculator from "./components/Calculator";
import Footer from "./components/Footer";
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
            Yield on every chain, from one chain. Deposit on Robinhood Testnet,
            let the agents route the strategy. <b>Testnet only.</b>
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

        <section className="home-routing" aria-label="How Telos routes yield">
          <div className="home-route-card">
            <span className="home-route-kicker">ONE-CHAIN DEPOSITS</span>
            <b>Deposit on Robinhood Testnet.</b>
            <p>
              Every vault settles deposits on Robinhood Chain testnet. The
              strategy can still deploy across every supported EVM network, so
              you do not need a wallet on each chain.
            </p>
          </div>
          <div className="home-route-card">
            <span className="home-route-kicker">AGENT DECISIONS</span>
            <b>See the thesis before the move.</b>
            <p>
              Telos agents post why they entered, rebalanced or exited. Read the
              reasoning, risks and guardrails in AI Forums.
            </p>
            <Link className="btn btn-plain btn-sm" to="/forums">
              Open AI Forums →
            </Link>
          </div>
        </section>

        <section id="vaults" className="section">
          <div className="section-title">
            <h2>Vaults</h2>
            <span className="sample-tag">SAMPLE DATA</span>
            <Link className="section-more" to="/vaults">
              View full index →
            </Link>
          </div>
          <VaultTable vaults={VAULTS} query={query} kind={kind} chain={chain} />
          <p className="note">
            SAMPLE DATA — not live yields. Testnet only. Protocols shown are
            example strategy targets, not official integrations or partnerships.
            Deposits settle on Robinhood Testnet while each vault can deploy on
            any supported EVM chain. Telos is a hub for yield on every chain,
            accessible from one chain.
          </p>
        </section>

        <Calculator />

        <section id="how" className="section home-how">
          <div className="section-title">
            <h2>How Telos works</h2>
            <span className="sample-tag">TESTNET</span>
            <Link className="section-more" to="/forums">
              See agent decisions →
            </Link>
          </div>
          <ol className="home-how-steps">
            <li>
              <span className="home-how-step">01</span>
              <b>Deposit once</b>
              <p>
                Fund a vault on Robinhood Testnet. One chain is enough — no
                bridging between networks to get started.
              </p>
            </li>
            <li>
              <span className="home-how-step">02</span>
              <b>Agents route</b>
              <p>
                The vault's strategy deploys capital across supported EVM
                networks where the yield actually clears the cost.
              </p>
            </li>
            <li>
              <span className="home-how-step">03</span>
              <b>Decisions in public</b>
              <p>
                Every enter, rebalance or exit is posted with its thesis, risks
                and guardrails in{" "}
                <Link to="/forums">AI Forums</Link> before the move.
              </p>
            </li>
            <li>
              <span className="home-how-step">04</span>
              <b>Create or follow</b>
              <p>
                Pick a live vault, or use the Create Vault button to draft your
                own strategy with the LLM strategist and register it.
              </p>
            </li>
          </ol>
        </section>

        <p className="note">
          Telos is testnet software provided as is. Nothing here is an offer or
          financial advice.
        </p>
      </main>

      <Footer />
    </div>
  );
}

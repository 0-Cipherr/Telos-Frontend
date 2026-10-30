import { useEffect, useState } from "react";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { telosFetch } from "../api-handler/Telos/telos-session";
import { useStrategyLauncher } from "../custom-contexts/StrategyLauncherContext";

type Props = {
  ready: boolean;
  authenticated: boolean;
  login: () => void;
  logout: () => void;
  address?: string;
};

export type DeployedStrategy = {
  id: string;
  name: string;
  ticker: string;
  chain: string;
  chainId: number;
  asset: string;
  risk: "LOW" | "MED" | "HIGH";
  fee: number;
  thesis: string;
  allocations: { label: string; pct: number }[];
  guardrails: string[];
  apy: number;
  auditStatus: string;
  creatorAddress: string | null;
  createdAt: string;
};

const RISK_LABEL: Record<DeployedStrategy["risk"], string> = {
  LOW: "Low risk",
  MED: "Balanced",
  HIGH: "High risk",
};

export default function StrategiesPage({ ready, authenticated, login, logout, address }: Props) {
  const { openStrategy } = useStrategyLauncher();
  const [strategies, setStrategies] = useState<DeployedStrategy[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    telosFetch<{ strategies: DeployedStrategy[] }>("/registry/strategies")
      .then((data) => {
        if (!cancelled) setStrategies(data.strategies);
      })
      .catch((caught: Error) => {
        if (!cancelled) {
          setStrategies([]);
          setError(caught.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <Navbar ready={ready} authenticated={authenticated} login={login} logout={logout} address={address} />

      <main className="wrap">
        <section className="page-hero">
          <div className="page-eyebrow">
            <span className="sample-tag">STRATEGIES / AI THESES</span>
            <span className="page-rule" aria-hidden="true" />
            <span>TESTNET</span>
          </div>
          <h1>
            Strategies, <span className="lime-text">with the thesis attached.</span>
          </h1>
          <p className="tagline page-lede">
            Every strategy was drafted by the AI strategist and deployed to Telos. Read the thesis, allocations and
            guardrails before you pick a vault. Deposits settle on Robinhood Testnet; strategies can run on any
            supported chain.
          </p>
          <div className="page-actions">
            <button type="button" className="btn" onClick={openStrategy}>
              ✦ Create a strategy
            </button>
          </div>
        </section>

        <section className="section" aria-labelledby="strategy-list-heading">
          <div className="section-title">
            <h2 id="strategy-list-heading">Deployed strategies</h2>
            {strategies ? <span className="sample-tag">{strategies.length} LIVE</span> : null}
          </div>

          {strategies === null ? (
            <p className="field-hint">Loading strategies…</p>
          ) : strategies.length === 0 ? (
            <div className="panel strategy-empty">
              <h3>No strategies yet</h3>
              <p className="field-hint">
                {error
                  ? `Could not load strategies (${error}).`
                  : "Be the first to draft one. Describe the play, let the strategist compile the contract, then deploy it."}
              </p>
              <button type="button" className="btn btn-sm" onClick={openStrategy}>
                ✦ Create a strategy
              </button>
            </div>
          ) : (
            <div className="strategy-card-grid">
              {strategies.map((strategy) => (
                <article className="panel strategy-card" key={strategy.id}>
                  <header className="strategy-card-head">
                    <div>
                      <span className="strategy-card-chain">{strategy.chain}</span>
                      <h3>{strategy.name}</h3>
                    </div>
                    <span className="strategy-card-ticker">${strategy.ticker}</span>
                  </header>

                  <p className="strategy-card-thesis">{strategy.thesis}</p>

                  <p className="field-hint strategy-card-route">
                    Deposit on Robinhood Testnet · earns on {strategy.chain}
                  </p>

                  <div className="strategy-card-allocs">
                    {strategy.allocations.map((item) => (
                      <div key={item.label}>
                        <div className="strategy-alloc-head">
                          <span>{item.label}</span>
                          <b>{item.pct}%</b>
                        </div>
                        <div className="strategy-bar">
                          <i style={{ width: `${item.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <dl className="strategy-card-stats">
                    <div>
                      <dt>RISK</dt>
                      <dd>{RISK_LABEL[strategy.risk]}</dd>
                    </div>
                    <div>
                      <dt>FEE</dt>
                      <dd>{strategy.fee}%</dd>
                    </div>
                    <div>
                      <dt>AUDIT</dt>
                      <dd>{strategy.auditStatus}</dd>
                    </div>
                  </dl>

                  <details className="strategy-card-guardrails">
                    <summary>Guardrails</summary>
                    <ul>
                      {strategy.guardrails.map((rule) => (
                        <li key={rule}>{rule}</li>
                      ))}
                    </ul>
                  </details>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

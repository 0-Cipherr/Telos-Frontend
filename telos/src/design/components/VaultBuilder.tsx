import { useState } from "react";
import { ASSETS, CHAINS, STRATEGIES, truncateAddress } from "../data";
import type { TemplateProps, Vault } from "../types";
import SectionHead from "./SectionHead";
import VaultCard from "./VaultCard";
import { Field, Select } from "./Field";

type Props = Pick<
  TemplateProps,
  "ready" | "authenticated" | "login" | "address"
>;

export default function VaultBuilder({
  ready,
  authenticated,
  login,
  address,
}: Props) {
  const [name, setName] = useState("My Yield Vault");
  const [asset, setAsset] = useState(ASSETS[0]);
  const [chain, setChain] = useState(CHAINS[0]);
  const [strategy, setStrategy] = useState(STRATEGIES[0]);
  const [fee, setFee] = useState(10);
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState("");

  const resetReview = () => {
    setReviewed(false);
    setError("");
  };

  const handleReview = () => {
    if (!name.trim()) {
      setError("A vault name is required before review.");
      setReviewed(false);
      return;
    }
    setError("");
    setReviewed(true);
  };

  const draft: Vault = {
    id: "TL-DRAFT",
    name: name.trim() || "Untitled vault",
    asset: asset.slice(0, 2),
    chain,
    kind: "custom",
    strategy,
    risk: fee > 20 ? "HIGH" : "MEDIUM",
    apy: 0,
    tvl: 0,
    fee,
    creator: address ? truncateAddress(address) : "YOU",
    history: [3, 4, 4, 5, 6, 6, 7, 8, 8, 9],
    summary: "Unsaved draft configuration.",
  };

  return (
    <section
      id="builder"
      className="tl-wrap tl-section"
      aria-labelledby="tl-builder-title"
    >
      <SectionHead
        id="tl-builder-title"
        index="05"
        kicker="DEPLOY / VAULT CONFIGURATOR"
        title="Build the terms."
        lede="Choose an asset, network, strategy and fee. Review the configuration before anything touches a contract. Deployment is intentionally disabled in this interface template."
        meta="DRAFT TOOL / NO WRITES"
      />

      <div className="tl-builder-grid">
        <div className="tl-panel">
          <div className="tl-panel__bar">
            <span className="tl-label">CONFIGURATION</span>
            <span className="tl-panel__meta">STEP 01 / 02</span>
          </div>

          <Field
            label="VAULT NAME"
            htmlFor="tl-build-name"
            meta={`${name.length}/32`}
            hint="Shown on the marketplace card and vault file."
          >
            <input
              id="tl-build-name"
              className="tl-input"
              type="text"
              value={name}
              maxLength={32}
              onChange={(event) => {
                setName(event.target.value);
                resetReview();
              }}
            />
          </Field>

          <div className="tl-form-row">
            <Field label="ASSET" htmlFor="tl-build-asset">
              <Select
                id="tl-build-asset"
                value={asset}
                options={ASSETS}
                onChange={(value) => {
                  setAsset(value);
                  resetReview();
                }}
              />
            </Field>
            <Field label="NETWORK" htmlFor="tl-build-chain">
              <Select
                id="tl-build-chain"
                value={chain}
                options={CHAINS}
                onChange={(value) => {
                  setChain(value as Vault["chain"]);
                  resetReview();
                }}
              />
            </Field>
          </div>

          <Field label="STRATEGY TYPE" htmlFor="tl-build-strategy">
            <Select
              id="tl-build-strategy"
              value={strategy}
              options={STRATEGIES}
              onChange={(value) => {
                setStrategy(value);
                resetReview();
              }}
            />
          </Field>

          <div className="tl-field">
            <div className="tl-field__head">
              <label htmlFor="tl-build-fee">CREATOR FEE</label>
              <span className="tl-lime">{fee}%</span>
            </div>
            <input
              id="tl-build-fee"
              className="tl-range"
              type="range"
              min={0}
              max={30}
              step={1}
              value={fee}
              onChange={(event) => {
                setFee(Number(event.target.value));
                resetReview();
              }}
            />
            <div className="tl-range__scale" aria-hidden="true">
              <span>0%</span>
              <span>15%</span>
              <span>30%</span>
            </div>
          </div>

          {error ? (
            <p className="tl-form-error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            className="tl-btn tl-btn--primary tl-btn--block"
            onClick={handleReview}
          >
            REVIEW CONFIGURATION <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className="tl-builder-side">
          <div>
            <div className="tl-preview-label">
              <span className="tl-label">LIVE CARD PREVIEW</span>
              <span className="tl-panel__meta">UNSAVED DRAFT</span>
            </div>
            <VaultCard vault={draft} draft />
          </div>

          {reviewed ? (
            <div className="tl-review" aria-live="polite">
              <div className="tl-panel__bar">
                <span className="tl-label">REVIEW / STEP 02</span>
                <span className="tl-panel__meta">DRAFT</span>
              </div>
              <dl className="tl-rows">
                <div>
                  <dt>NAME</dt>
                  <dd>{draft.name}</dd>
                </div>
                <div>
                  <dt>ASSET</dt>
                  <dd>{asset}</dd>
                </div>
                <div>
                  <dt>NETWORK</dt>
                  <dd>{chain}</dd>
                </div>
                <div>
                  <dt>STRATEGY</dt>
                  <dd>{strategy}</dd>
                </div>
                <div>
                  <dt>CREATOR FEE</dt>
                  <dd>{fee}%</dd>
                </div>
                <div>
                  <dt>CREATOR</dt>
                  <dd>{address ? truncateAddress(address) : "NOT CONNECTED"}</dd>
                </div>
              </dl>

              {!ready ? (
                <button type="button" className="tl-btn tl-btn--block" disabled>
                  WALLET SYNCING…
                </button>
              ) : !authenticated ? (
                <button
                  type="button"
                  className="tl-btn tl-btn--primary tl-btn--block"
                  onClick={login}
                >
                  CONNECT WALLET TO CONTINUE
                </button>
              ) : (
                <button
                  type="button"
                  className="tl-btn tl-btn--block"
                  disabled
                  title="Deployment contracts are not wired into this template"
                >
                  DEPLOY VAULT — WIRING REQUIRED
                </button>
              )}

              <p className="tl-disclaimer">
                No transaction is created, signed, or simulated. Wire this action
                to your existing VaultFactory deployment flow. Fee limits and
                risk parameters must be validated on-chain.
              </p>
            </div>
          ) : (
            <p className="tl-note">
              Review reveals the final summary. Nothing is written to the
              registry from this template.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

import { useEffect } from "react";
import type { Vault } from "../types";
import { formatUsd, formatUsdCompact } from "../data";
import Sparkline from "./Sparkline";

type Props = {
  vault: Vault;
  onClose: () => void;
};

export default function VaultDetails({ vault, onClose }: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const titleId = `tl-vault-${vault.id}`;

  return (
    <div className="tl-modal" role="presentation" onClick={onClose}>
      <div
        className="tl-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="tl-modal__bar">
          <span className="tl-terminal__path">VAULT FILE / {vault.id}</span>
          <button
            type="button"
            className="tl-btn tl-btn--sm"
            onClick={onClose}
            autoFocus
          >
            CLOSE <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="tl-modal__body">
          <div className="tl-modal__head">
            <span className="tl-glyph tl-glyph--lg" aria-hidden="true">
              {vault.asset}
            </span>
            <div>
              <span className="tl-anno__box">
                {vault.kind === "ready" ? "READY-MADE" : "CUSTOM"} ·{" "}
                {vault.chain.toUpperCase()}
              </span>
              <h2 id={titleId}>{vault.name}</h2>
              <p className="tl-modal__proto">
                {vault.proto ? `VIA ${vault.proto}` : "CREATOR-DEFINED STRATEGY"}{" "}
                · {vault.strategy.toUpperCase()}
              </p>
            </div>
          </div>

          <p className="tl-modal__summary">{vault.summary}</p>

          <div className="tl-modal__grid">
            <div>
              <span className="tl-label">NET APY / EST.</span>
              <b className="tl-lime">{vault.apy.toFixed(1)}%</b>
            </div>
            <div>
              <span className="tl-label">TOTAL VALUE LOCKED</span>
              <b>{formatUsd(vault.tvl)}</b>
            </div>
            <div>
              <span className="tl-label">RISK CLASS</span>
              <b className={`tl-risk tl-risk--${vault.risk.toLowerCase()}`}>
                <i aria-hidden="true" />
                {vault.risk}
              </b>
            </div>
            <div>
              <span className="tl-label">CREATOR FEE</span>
              <b>{vault.fee}%</b>
            </div>
            <div>
              <span className="tl-label">CREATOR</span>
              <b className="tl-mono">{vault.creator}</b>
            </div>
            <div>
              <span className="tl-label">REGISTRY ID</span>
              <b className="tl-mono">{vault.id}</b>
            </div>
          </div>

          <section className="tl-modal__section" aria-labelledby={`${titleId}-history`}>
            <div className="tl-panel__bar">
              <span className="tl-label" id={`${titleId}-history`}>
                APY HISTORY / SAMPLE
              </span>
              <span className="tl-panel__meta">10 OBSERVATIONS</span>
            </div>
            <div className="tl-modal__chart">
              <Sparkline
                data={vault.history}
                width={640}
                height={140}
                label={`${vault.name} sample APY history`}
              />
            </div>
            <p className="tl-field__hint">
              Synthetic series for layout preview. Not a track record.
              {formatUsdCompact(vault.tvl)} TVL is sample data.
            </p>
          </section>

          <section className="tl-modal__section" aria-labelledby={`${titleId}-position`}>
            <div className="tl-panel__bar">
              <span className="tl-label" id={`${titleId}-position`}>
                YOUR POSITION
              </span>
              <span className="tl-panel__meta">NOT CONNECTED</span>
            </div>
            <p className="tl-modal__position">
              This template is presentation-only. It does not hold keys, read
              balances, or call vault contracts. Deposit and withdrawal
              controls must be wired to your existing transaction flow.
            </p>
            <div className="tl-modal__actions">
              <button
                type="button"
                className="tl-btn"
                disabled
                title="Contract interaction is not wired in this template"
              >
                DEPOSIT — NOT CONNECTED
              </button>
              <button
                type="button"
                className="tl-btn"
                disabled
                title="Contract interaction is not wired in this template"
              >
                WITHDRAW — NOT CONNECTED
              </button>
            </div>
            <p className="tl-disclaimer">
              No transaction is simulated and no success state is shown. Always
              verify contract addresses before depositing.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

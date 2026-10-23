import type { Vault } from "../types";
import { formatUsdCompact } from "../data";
import Sparkline from "./Sparkline";

type Props = {
  vault: Vault;
  onInspect?: (vault: Vault) => void;
  draft?: boolean;
};

const badgeLabel = (vault: Vault, draft?: boolean) => {
  if (draft) return "DRAFT";
  return vault.kind === "ready" ? "READY-MADE" : "CUSTOM";
};

export default function VaultCard({ vault, onInspect, draft = false }: Props) {
  const badge = badgeLabel(vault, draft);
  const hasMarketData = !draft && vault.apy > 0;

  return (
    <article className={`tl-card${draft ? " tl-card--draft" : ""}`}>
      <div className="tl-card__top">
        <span className="tl-card__id">{vault.id}</span>
        <span
          className={`tl-badge tl-badge--${draft ? "draft" : vault.kind}`}
        >
          {badge}
        </span>
      </div>

      <div className="tl-card__name">
        <span className="tl-glyph" aria-hidden="true">
          {vault.asset}
        </span>
        <div>
          <h3>{vault.name}</h3>
          <p>
            {vault.chain} · {vault.proto ?? "Custom strategy"}
          </p>
        </div>
      </div>

      <div className="tl-card__market">
        <div>
          <span className="tl-label">NET APY / EST.</span>
          <div className="tl-apy">
            {hasMarketData ? `${vault.apy.toFixed(1)}%` : "—"}
          </div>
        </div>
        <div className="tl-card__spark">
          <Sparkline
            data={vault.history}
            label={`${vault.name} APY trend, sample data`}
          />
        </div>
      </div>

      <dl className="tl-card__stats">
        <div>
          <dt>TVL</dt>
          <dd>{draft ? "—" : formatUsdCompact(vault.tvl)}</dd>
        </div>
        <div>
          <dt>RISK</dt>
          <dd>
            <span className={`tl-risk tl-risk--${vault.risk.toLowerCase()}`}>
              <i aria-hidden="true" />
              {vault.risk}
            </span>
          </dd>
        </div>
        <div>
          <dt>FEE</dt>
          <dd>{vault.fee}%</dd>
        </div>
      </dl>

      <div className="tl-card__strategy">
        <span className="tl-chip">{vault.strategy}</span>
        <span className="tl-card__creator">BY {vault.creator}</span>
      </div>

      {onInspect ? (
        <button
          type="button"
          className="tl-btn tl-btn--block"
          onClick={() => onInspect(vault)}
          aria-label={`Inspect ${vault.name}`}
        >
          INSPECT VAULT <span aria-hidden="true">↗</span>
        </button>
      ) : (
        <div className="tl-card__static">CONFIGURATION PREVIEW</div>
      )}
    </article>
  );
}

import { Link } from "react-router-dom";
import {
  formatUsd,
  formatUsdCompact,
  weeklyEarnings,
  type Vault,
} from "../vaults";
import { ChainIcon } from "./ChainBadge";
import VaultSparkline from "./VaultSparkline";

type Props = {
  vault: Vault;
  own?: boolean;
};

export default function VaultTile({ vault, own = false }: Props) {
  const visibleChains = vault.chains.slice(0, 5);
  const extraChains = Math.max(0, vault.chains.length - visibleChains.length);
  const weekly = weeklyEarnings(vault.apy);
  const hasApy = vault.apy > 0;

  return (
    <article className="vault-tile">
      <div className="vault-tile__top">
        <span className="vault-tile__id">{vault.id}</span>
        <span
          className={`vault-status vault-status--${vault.status ?? "live"}${
            own ? " vault-status--own" : ""
          }`}
        >
          {own ? "YOURS" : (vault.status ?? "live").toUpperCase()}
        </span>
      </div>

      <div className="vault-tile__name">
        <span className="vault-glyph" aria-hidden="true">
          {vault.asset}
        </span>
        <div>
          <h3>
            <Link to={`/vaults/${vault.id}`}>{vault.name}</Link>
          </h3>
          <p>
            {vault.kind === "ready" ? "READY-MADE" : "CUSTOM"} ·{" "}
            {vault.proto ?? "CREATOR STRATEGY"}
          </p>
        </div>
      </div>

      <p className="vault-tile__desc">{vault.description}</p>

      <div className="vault-tile__market">
        <div>
          <span className="vault-label">NET APY</span>
          <b className="vault-apy">{hasApy ? `${vault.apy.toFixed(1)}%` : "—"}</b>
        </div>
        <div>
          <span className="vault-label">WEEKLY / $1K</span>
          <b>{hasApy ? formatUsd(weekly, 2) : "—"}</b>
        </div>
        <div>
          <span className="vault-label">TVL</span>
          <b>{formatUsdCompact(vault.tvlUsd)}</b>
        </div>
      </div>

      <div className="vault-tile__spark">
        <VaultSparkline
          data={vault.h}
          label={`${vault.name} sample APY trend`}
        />
      </div>

      <div className="vault-tile__chains">
        <span className="vault-label">CHAINS</span>
        <div className="vault-chain-icons">
          {visibleChains.map((chain) => (
            <span key={chain} title={chain}>
              <ChainIcon name={chain} size={14} />
            </span>
          ))}
          {extraChains > 0 ? (
            <span className="vault-chain-more">+{extraChains}</span>
          ) : null}
          <span className="vault-chain-count">
            {vault.chains.length} EVM {vault.chains.length === 1 ? "chain" : "chains"}
          </span>
        </div>
      </div>

      <div className="vault-tile__strategy">
        <span className="vault-chip">{vault.strategy}</span>
        <span className={`vault-risk vault-risk--${vault.risk.toLowerCase()}`}>
          <i aria-hidden="true" />
          {vault.risk}
        </span>
        <span className="vault-fee">{vault.fee}% FEE</span>
      </div>

      <Link className="vault-tile__open" to={`/vaults/${vault.id}`}>
        OPEN VAULT FILE <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}

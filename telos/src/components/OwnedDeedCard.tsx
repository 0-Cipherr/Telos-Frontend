import { Link } from "react-router-dom";
import {
  annualCreatorEarnings,
  formatUsd,
  formatUsdCompact,
  type Vault,
} from "../vaults";
import DeedArtwork from "./DeedArtwork";
import { deedStockSymbol } from "../deeds";

type Props = {
  vault: Vault;
  onList: () => void;
};

export default function OwnedDeedCard({ vault, onList }: Props) {
  const feeIncome = annualCreatorEarnings(vault);
  const hasApy = vault.apy > 0;
  const stock = deedStockSymbol(vault);

  return (
    <article className="deed-card deed-card--owned">
      <Link
        className="deed-card__art-link"
        to={`/vaults/${vault.id}`}
        aria-label={`Open ${vault.name}`}
      >
        <DeedArtwork
          vaultId={vault.id}
          ticker={stock}
          badge="OWNED"
          tone="owned"
        />
      </Link>

      <div className="deed-card__body">
        <div className="deed-card__collection">
          <span>Telos Deeds</span>
          <span
            className="deed-verified deed-verified--sm"
            title="Verified collection"
          >
            ✓
          </span>
          <span className="deed-card__launchpad">Pons</span>
        </div>

        <h3 className="deed-card__title">
          <Link to={`/vaults/${vault.id}`}>{vault.name}</Link>
        </h3>

        <p className="deed-card__vault-meta">
          {vault.chain} · {stock ? `${stock} stock pair` : vault.strategy}
        </p>

        <div className="deed-card__stats-line">
          <span>{hasApy ? `${vault.apy.toFixed(1)}% APY` : "New vault"}</span>
          <span>{vault.fee}% fee</span>
          <span>{formatUsdCompact(vault.tvlUsd)} TVL</span>
        </div>

        <div className="deed-card__fee-row">
          <span>Fee stream{stock ? ` · ${stock}` : ""}</span>
          <b>
            {formatUsd(feeIncome, 0)}
            <small>/yr</small>
          </b>
          <Link
            className="deed-card__vault-link"
            to={`/vaults/${vault.id}`}
          >
            View vault ↗
          </Link>
        </div>

        <div className="deed-card__seller">
          <span>Owned by you</span>
          <span>{vault.status === "draft" ? "DRAFT" : "FEE RIGHTS"}</span>
        </div>

        <div className="deed-card__footer">
          <div className="deed-card__price">
            <span>Status</span>
            <b className="deed-card__status-text">Not listed</b>
            <small>Ready to sell</small>
          </div>
          <button type="button" className="btn deed-buy" onClick={onList}>
            List deed
          </button>
        </div>
      </div>
    </article>
  );
}

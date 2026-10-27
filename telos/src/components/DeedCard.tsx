import { Link } from "react-router-dom";
import {
  annualCreatorEarnings,
  formatUsd,
  formatUsdCompact,
  type Vault,
} from "../vaults";
import {
  deedPriceUsd,
  deedStockSymbol,
  formatEth,
  type DeedListing,
} from "../deeds";
import DeedArtwork from "./DeedArtwork";

type Props = {
  listing: DeedListing;
  vault: Vault;
  ownListing?: boolean;
  onBuy: (listing: DeedListing, vault: Vault) => void;
  onCancel: (listing: DeedListing, vault: Vault) => void;
};

export default function DeedCard({
  listing,
  vault,
  ownListing = false,
  onBuy,
  onCancel,
}: Props) {
  const feeIncome = annualCreatorEarnings(vault);
  const priceUsd = deedPriceUsd(listing.priceEth);
  const hasApy = vault.apy > 0;
  const stock = deedStockSymbol(vault);

  return (
    <article className={`deed-card${ownListing ? " deed-card--own" : ""}`}>
      <Link
        className="deed-card__art-link"
        to={`/vaults/${vault.id}`}
        aria-label={`Open ${vault.name}`}
      >
        <DeedArtwork
          vaultId={vault.id}
          ticker={stock}
          badge={ownListing ? "YOUR LISTING" : "FOR SALE"}
          tone={ownListing ? "own" : "sale"}
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
          <span>
            Seller <b>{listing.seller}</b>
          </span>
          <span>{listing.createdAt}</span>
        </div>

        <div className="deed-card__footer">
          <div className="deed-card__price">
            <span>Price</span>
            <b>{formatEth(listing.priceEth)}</b>
            <small>~ {formatUsd(priceUsd)}</small>
          </div>
          {ownListing ? (
            <button
              type="button"
              className="btn btn-plain deed-btn"
              onClick={() => onCancel(listing, vault)}
            >
              Cancel listing
            </button>
          ) : (
            <button
              type="button"
              className="btn deed-buy"
              onClick={() => onBuy(listing, vault)}
            >
              Buy now
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

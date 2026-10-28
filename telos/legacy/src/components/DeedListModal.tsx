import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useDeedMarket } from "../custom-contexts/DeedMarketContext";
import {
  deedPriceUsd,
  deedStockSymbol,
  ethPriceInput,
  formatEth,
  suggestedDeedPriceEth,
  type DeedListing,
} from "../deeds";
import {
  annualCreatorEarnings,
  formatUsd,
  type Vault,
} from "../vaults";
import { lockBodyScroll } from "../utils/scrollLock";
import DeedKeyIcon from "./DeedKeyIcon";

type Props = {
  vaults: Vault[];
  initialVaultId?: string | null;
  seller: string;
  sellerAddress?: string;
  onClose: () => void;
  onCreate: () => void;
};

type Status = "review" | "pending" | "success" | "error";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function DeedListModal({
  vaults,
  initialVaultId,
  seller,
  sellerAddress,
  onClose,
  onCreate,
}: Props) {
  const { listDeed } = useDeedMarket();
  const initialVault =
    vaults.find((vault) => vault.id === initialVaultId) ?? vaults[0] ?? null;
  const [selectedVault, setSelectedVault] = useState<Vault | null>(
    initialVault,
  );
  const [price, setPrice] = useState(() =>
    initialVault ? ethPriceInput(suggestedDeedPriceEth(initialVault)) : "",
  );
  const [status, setStatus] = useState<Status>("review");
  const [listing, setListing] = useState<DeedListing | null>(null);
  const [error, setError] = useState("");

  useEffect(() => lockBodyScroll(), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      if (status !== "pending") onClose();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onClose, status]);

  const chooseVault = (vaultId: string) => {
    const next = vaults.find((vault) => vault.id === vaultId) ?? null;
    setSelectedVault(next);
    if (next) setPrice(ethPriceInput(suggestedDeedPriceEth(next)));
  };

  const suggested = selectedVault
    ? suggestedDeedPriceEth(selectedVault)
    : 0;
  const feeIncome = selectedVault
    ? annualCreatorEarnings(selectedVault)
    : 0;
  const priceUsd = deedPriceUsd(price);
  const priceValue = Number.parseFloat(price);
  const priceValid = Number.isFinite(priceValue) && priceValue > 0;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedVault || !priceValid || status === "pending") return;

    setStatus("pending");
    setError("");

    try {
      await wait(700);
      const next = listDeed({
        vaultId: selectedVault.id,
        priceEth: price,
        seller,
        sellerAddress,
      });
      setListing(next);
      setStatus("success");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not list this deed.",
      );
      setStatus("error");
    }
  };

  const close = () => {
    if (status !== "pending") onClose();
  };

  return (
    <div className="modal-overlay deed-overlay" onClick={close}>
      <div
        className="panel modal deed-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deed-list-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="tx-kicker">
              {status === "success"
                ? "DEED MARKET / LISTED"
                : status === "pending"
                  ? "DEED MARKET / LISTING"
                  : "DEED MARKET / SELL"}
            </span>
            <h2 id="deed-list-title">
              {status === "success"
                ? "Deed listed"
                : status === "pending"
                  ? "Publishing listing"
                  : "Sell a vault deed"}
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-plain btn-sm"
            onClick={close}
            disabled={status === "pending"}
            aria-label="Close deed listing dialog"
          >
            ✕
          </button>
        </div>

        {status === "review" && selectedVault ? (
          <form onSubmit={submit}>
            <div className="deed-modal-preview">
              <span className="deed-modal-preview__key">
                <DeedKeyIcon size={28} />
              </span>
              <span className="deed-modal-preview__copy">
                <b>{selectedVault.name}</b>
                <span>
                  {selectedVault.id} · {selectedVault.chain} ·{" "}
                  {deedStockSymbol(selectedVault)
                    ? `${deedStockSymbol(selectedVault)} stock pair`
                    : selectedVault.strategy}
                </span>
              </span>
            </div>

            <div className="field">
              <label htmlFor="deed-vault">Vault deed</label>
              <select
                id="deed-vault"
                className="input"
                value={selectedVault.id}
                onChange={(event) => chooseVault(event.target.value)}
              >
                {vaults.map((vault) => (
                  <option key={vault.id} value={vault.id}>
                    {vault.id} · {vault.name} · {vault.chain}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="deed-price">
                Ask price
                <span>ETH</span>
              </label>
              <div className="tx-amount">
                <input
                  id="deed-price"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={price}
                  onChange={(event) =>
                    setPrice(event.target.value.replace(/[^0-9.]/g, ""))
                  }
                  autoFocus
                />
                <span>ETH</span>
              </div>
            </div>

            <div className="deed-suggest">
              <span>
                Suggested ask <b>{formatEth(suggested)}</b>
                <small> · {formatUsd(feeIncome, 0)}/yr × 3</small>
              </span>
              <button
                type="button"
                className="btn btn-plain btn-sm"
                onClick={() => setPrice(ethPriceInput(suggested))}
              >
                Use
              </button>
            </div>

            <div className="tx-rows">
              <div className="tx-row">
                <span>Fee stream</span>
                <b>
                  {formatUsd(feeIncome, 0)}/yr
                  {deedStockSymbol(selectedVault)
                    ? ` · ${deedStockSymbol(selectedVault)}`
                    : ""}
                </b>
              </div>
              <div className="tx-row">
                <span>You receive</span>
                <b>{formatEth(price)}</b>
              </div>
              <div className="tx-row">
                <span>USD reference</span>
                <b>~ {formatUsd(priceUsd)}</b>
              </div>
              <div className="tx-row">
                <span>Marketplace fee</span>
                <b>0% · preview</b>
              </div>
            </div>

            <div className="modal-actions">
              <button type="submit" className="btn" disabled={!priceValid}>
                List deed for {formatEth(price)}
              </button>
              <button type="button" className="btn btn-plain" onClick={onClose}>
                Cancel
              </button>
            </div>

            <p className="tx-note">
              Listing is stored locally in this preview. The deed and ETH
              settlement become onchain in production.
            </p>
          </form>
        ) : null}

        {status === "review" && !selectedVault ? (
          <div className="deed-empty" aria-live="polite">
            <span className="deed-empty__key">
              <DeedKeyIcon size={38} />
            </span>
            <b>No unlisted vaults to sell.</b>
            <p>
              Create a vault first, or cancel an active listing before listing
              the same deed again.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={onCreate}>
                Create a vault
              </button>
              <button type="button" className="btn btn-plain" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : null}

        {status === "pending" ? (
          <div aria-live="polite">
            <div className="tx-pending-head">
              <span className="tx-spinner" aria-hidden="true" />
              <div>
                <b>Publishing the deed listing…</b>
                <span>Waiting for the market to index the ask</span>
              </div>
            </div>
            <div
              className="tx-progress"
              role="progressbar"
              aria-label="Listing progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={68}
            >
              <i style={{ width: "68%" }} />
            </div>
            <p className="tx-note">
              Keep this window open. This is a preview — no signature or funds
              are needed.
            </p>
          </div>
        ) : null}

        {status === "success" && listing && selectedVault ? (
          <div className="tx-success" aria-live="polite">
            <div className="tx-check" aria-hidden="true">
              ✓
            </div>
            <p className="tx-success-copy">
              The deed for <b>{selectedVault.name}</b> is now on the market.
            </p>
            <div className="tx-rows">
              <div className="tx-row">
                <span>Ask</span>
                <b>{formatEth(listing.priceEth)}</b>
              </div>
              <div className="tx-row">
                <span>Fee stream</span>
                <b>{formatUsd(feeIncome, 0)}/yr</b>
              </div>
              <div className="tx-row">
                <span>Listing</span>
                <b>{listing.id}</b>
              </div>
            </div>
            <div className="modal-actions">
              <Link className="btn" to={`/vaults/${selectedVault.id}`}>
                View vault
              </Link>
              <button type="button" className="btn btn-plain" onClick={onClose}>
                Back to market
              </button>
            </div>
            <p className="tx-note">
              You keep ownership until a buyer settles the ETH ask.
            </p>
          </div>
        ) : null}

        {status === "error" ? (
          <div aria-live="assertive">
            <p className="tx-error" role="alert">
              {error}
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn"
                onClick={() => setStatus("review")}
              >
                Try again
              </button>
              <button
                type="button"
                className="btn btn-plain"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

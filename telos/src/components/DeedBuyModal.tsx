import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDeedMarket } from "../custom-contexts/DeedMarketContext";
import {
  deedPriceUsd,
  deedStockSymbol,
  formatEth,
  type DeedListing,
} from "../deeds";
import {
  annualCreatorEarnings,
  formatUsd,
  shortAddress,
  type Vault,
} from "../vaults";
import { lockBodyScroll } from "../utils/scrollLock";
import DeedKeyIcon from "./DeedKeyIcon";

type Props = {
  listing: DeedListing;
  vault: Vault;
  authenticated: boolean;
  address?: string;
  login: () => void;
  onClose: () => void;
};

type Status = "review" | "pending" | "success" | "error";

function randomHash(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function DeedBuyModal({
  listing,
  vault,
  authenticated,
  address,
  login,
  onClose,
}: Props) {
  const { purchaseDeed } = useDeedMarket();
  const [status, setStatus] = useState<Status>("review");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const feeIncome = annualCreatorEarnings(vault);
  const priceUsd = deedPriceUsd(listing.priceEth);
  const stock = deedStockSymbol(vault);

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

  const buy = async () => {
    if (!authenticated || !address) {
      login();
      return;
    }
    if (status === "pending") return;

    setStatus("pending");
    setError("");

    try {
      await wait(900);
      const hash = randomHash();
      const deed = purchaseDeed(listing, address, hash);
      if (!deed) {
        throw new Error("This deed is no longer listed.");
      }
      setTxHash(hash);
      setStatus("success");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not complete the deed purchase.",
      );
      setStatus("error");
    }
  };

  const close = () => {
    if (status !== "pending") onClose();
  };

  return (
    <div
      className="modal-overlay deed-overlay"
      onClick={close}
    >
      <div
        className="panel modal deed-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deed-buy-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="tx-kicker">
              {status === "success"
                ? "DEED MARKET / ACQUIRED"
                : status === "pending"
                  ? "DEED MARKET / TRANSFER"
                  : "DEED MARKET / BUY"}
            </span>
            <h2 id="deed-buy-title">
              {status === "success"
                ? "Deed acquired"
                : status === "pending"
                  ? "Transferring deed"
                  : "Buy vault deed"}
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-plain btn-sm"
            onClick={close}
            disabled={status === "pending"}
            aria-label="Close deed purchase dialog"
          >
            ✕
          </button>
        </div>

        {status === "review" ? (
          <>
            <div className="deed-modal-preview">
              <span className="deed-modal-preview__key">
                <DeedKeyIcon size={28} />
              </span>
              <span className="deed-modal-preview__copy">
                <b>{vault.name}</b>
                <span>
                  {vault.id} · {vault.chain} ·{" "}
                  {stock ? `${stock} stock pair` : vault.strategy}
                </span>
              </span>
            </div>

            <div className="tx-rows">
              <div className="tx-row">
                <span>Strategy</span>
                <b>{vault.strategy}</b>
              </div>
              <div className="tx-row">
                <span>Net APY</span>
                <b className="lime">
                  {vault.apy > 0 ? `${vault.apy.toFixed(1)}%` : "—"}
                </b>
              </div>
              <div className="tx-row">
                <span>Creator fee</span>
                <b>{vault.fee}%</b>
              </div>
              <div className="tx-row">
                <span>Fee stream</span>
                <b>{formatUsd(feeIncome, 0)}/yr · to holder</b>
              </div>
              <div className="tx-row">
                <span>Fees paid in</span>
                <b>{stock ?? "ETH"}</b>
              </div>
              <div className="tx-row">
                <span>Deed settlement</span>
                <b>ETH</b>
              </div>
              <div className="tx-row">
                <span>Deed price</span>
                <b>{formatEth(listing.priceEth)}</b>
              </div>
              <div className="tx-row">
                <span>USD reference</span>
                <b>~ {formatUsd(priceUsd)}</b>
              </div>
              <div className="tx-row">
                <span>Network cost</span>
                <b>~ $0.02</b>
              </div>
            </div>

            <div className="deed-modal-total">
              <span>TOTAL IN ETH</span>
              <b>{formatEth(listing.priceEth)}</b>
              <small>plus gas</small>
            </div>

            <div className="modal-actions">
              {authenticated && address ? (
                <button type="button" className="btn" onClick={buy}>
                  Buy deed for {formatEth(listing.priceEth)}
                </button>
              ) : (
                <button type="button" className="btn" onClick={login}>
                  Connect wallet to buy
                </button>
              )}
              <button
                type="button"
                className="btn btn-plain"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>

            <p className="tx-note">
              Preview build: deed ownership is updated locally. No ETH moves
              and no onchain contract is called.
            </p>
          </>
        ) : null}

        {status === "pending" ? (
          <div aria-live="polite">
            <div className="tx-pending-head">
              <span className="tx-spinner" aria-hidden="true" />
              <div>
                <b>Waiting for the deed transfer…</b>
                <span>Simulating an ETH settlement</span>
              </div>
            </div>
            <div
              className="tx-progress"
              role="progressbar"
              aria-label="Deed transfer progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={72}
            >
              <i style={{ width: "72%" }} />
            </div>
            <p className="tx-note">
              Keep this window open. This is a testnet simulation — no funds
              are moved.
            </p>
          </div>
        ) : null}

        {status === "success" ? (
          <div className="tx-success" aria-live="polite">
            <div className="tx-check" aria-hidden="true">
              ✓
            </div>
            <p className="tx-success-copy">
              You now hold the deed for <b>{vault.name}</b>. The creator fee
              stream is yours.
            </p>

            <div className="tx-rows">
              <div className="tx-row">
                <span>Paid</span>
                <b>{formatEth(listing.priceEth)}</b>
              </div>
              <div className="tx-row">
                <span>New owner</span>
                <b>{address ? shortAddress(address) : "—"}</b>
              </div>
              <div className="tx-row">
                <span>Fee stream</span>
                <b>{formatUsd(feeIncome, 0)}/yr</b>
              </div>
              <div className="tx-row">
                <span>Transaction</span>
                <b title={txHash}>
                  {txHash
                    ? `${txHash.slice(0, 10)}…${txHash.slice(-6)}`
                    : "—"}
                </b>
              </div>
            </div>

            <div className="modal-actions">
              <Link className="btn" to={`/vaults/${vault.id}`}>
                Open vault / Deposit
              </Link>
              <button
                type="button"
                className="btn btn-plain"
                onClick={onClose}
              >
                Close
              </button>
            </div>

            <p className="tx-note">
              Deed recorded in local preview state. In production this would be
              an onchain ownership transfer settled in ETH.
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

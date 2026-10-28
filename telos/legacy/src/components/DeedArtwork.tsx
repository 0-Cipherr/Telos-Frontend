import DeedKeyIcon from "./DeedKeyIcon";

type Props = {
  vaultId: string;
  /** Stock ticker the deed's pons fees are paid in. */
  ticker?: string;
  badge?: string;
  tone?: "sale" | "own" | "owned";
  className?: string;
};

/**
 * Deed artwork is a collectible certificate, not a photograph. The ticker is
 * the identity of the fee right, the key is the transferable ownership, and
 * the sparkline gives the tile the feel of a stock-paired market card.
 */
export default function DeedArtwork({
  vaultId,
  ticker,
  badge,
  tone = "sale",
  className,
}: Props) {
  const serial = vaultId.replace(/^TL-/, "");

  return (
    <div className={`deed-art${className ? ` ${className}` : ""}`} aria-hidden="true">
      <svg
        className="deed-art__spark"
        viewBox="0 0 240 120"
        preserveAspectRatio="none"
        focusable="false"
      >
        <path
          className="deed-art__spark-fill"
          d="M0 98 L18 90 L36 94 L54 76 L72 82 L90 64 L108 70 L126 48 L144 56 L162 34 L180 42 L198 20 L216 28 L240 10 L240 120 L0 120 Z"
        />
        <path
          className="deed-art__spark-line"
          d="M0 98 L18 90 L36 94 L54 76 L72 82 L90 64 L108 70 L126 48 L144 56 L162 34 L180 42 L198 20 L216 28 L240 10"
        />
      </svg>

      <div className="deed-art__top">
        <span className="deed-art__brand">
          <img src="/launchpads/pons.png" alt="" loading="lazy" />
          PONS
        </span>
        {badge ? (
          <span className={`deed-art__badge deed-art__badge--${tone}`}>
            {badge}
          </span>
        ) : null}
      </div>

      <div className="deed-art__center">
        <span className="deed-art__mark">
          <DeedKeyIcon size={28} />
        </span>
        <span className="deed-art__ticker">{ticker ?? "DEED"}</span>
        <span className="deed-art__sub">
          {ticker ? "STOCK-PAIRED FEE DEED" : "TRANSFERABLE DEED"}
        </span>
      </div>

      <div className="deed-art__foot">
        <span>DEED {serial}</span>
        <span>{ticker ? `PAID IN ${ticker}` : "TRANSFERABLE"}</span>
      </div>
    </div>
  );
}

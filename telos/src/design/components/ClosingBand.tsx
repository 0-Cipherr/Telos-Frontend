import type { TemplateProps } from "../types";
import { truncateAddress } from "../data";

type Props = Pick<TemplateProps, "ready" | "authenticated" | "login" | "address">;

export default function ClosingBand({
  ready,
  authenticated,
  login,
  address,
}: Props) {
  return (
    <section className="tl-wrap">
      <div className="tl-band">
        <span className="tl-band__stamp" aria-hidden="true">
          TELOS / TESTNET
        </span>
        <div className="tl-anno">
          <span className="tl-anno__box">END OF INDEX</span>
          <span className="tl-anno__line" aria-hidden="true" />
          <span>{authenticated ? "SESSION ACTIVE" : "OPEN ACCESS"}</span>
        </div>
        <h2>
          Use a vault.
          <br />
          Or launch yours<span className="tl-lime">.</span>
        </h2>
        <p className="tl-lede">
          Connect a wallet and explore multichain vaults on Base Sepolia and
          Arbitrum Sepolia. Market data stays sample-only until the registry
          feed is connected.
        </p>
        <div className="tl-band__actions">
          <a className="tl-btn tl-btn--primary" href="#marketplace">
            BROWSE THE INDEX <span aria-hidden="true">→</span>
          </a>
          <a className="tl-btn" href="#builder">
            CONFIGURE A VAULT
          </a>
          {authenticated ? (
            <span className="tl-band__wallet">
              <span className="tl-dot tl-dot--live" aria-hidden="true" />
              CONNECTED AS {truncateAddress(address)}
            </span>
          ) : ready ? (
            <button type="button" className="tl-textlink" onClick={login}>
              CONNECT WALLET
            </button>
          ) : (
            <span className="tl-band__wallet">WALLET LAYER SYNCING…</span>
          )}
        </div>
      </div>
    </section>
  );
}

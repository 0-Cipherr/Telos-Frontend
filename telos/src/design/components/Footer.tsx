import TemplateMark from "./TemplateMark";

const PRODUCT = [
  { href: "#marketplace", label: "Marketplace" },
  { href: "#thesis", label: "Theses" },
  { href: "#builder", label: "Build a vault" },
  { href: "#calculator", label: "Fee calculator" },
];

const PROTOCOL = [
  { href: "#network", label: "Architecture" },
  { href: "#faq", label: "FAQ" },
  { href: "#marketplace", label: "Vault index" },
];

const YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="tl-footer">
      <div className="tl-wrap">
        <div className="tl-footer__top">
          <div className="tl-footer__brand">
            <span className="tl-brand">
              <TemplateMark size={26} />
              <span className="tl-brand__text">
                TELOS
                <span className="tl-brand__meta">V.01 / TESTNET</span>
              </span>
            </span>
            <p>Cross-chain yield vault infrastructure.</p>
            <span className="tl-footer__status">
              <span className="tl-dot tl-dot--live" aria-hidden="true" />
              BASE SEPOLIA · ARBITRUM SEPOLIA
            </span>
          </div>

          <nav className="tl-footer__col" aria-label="Product">
            <h3>PRODUCT</h3>
            {PRODUCT.map((item) => (
              <a key={item.href + item.label} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <nav className="tl-footer__col" aria-label="Protocol">
            <h3>PROTOCOL</h3>
            {PROTOCOL.map((item) => (
              <a key={item.href + item.label} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="tl-footer__col">
            <h3>RESOURCES</h3>
            <span className="tl-footer__soon">
              Documentation <i>SOON</i>
            </span>
            <span className="tl-footer__soon">
              GitHub <i>SOON</i>
            </span>
            <a href="#faq">Risk disclosure</a>
          </div>
        </div>

        <div className="tl-footer__meta">
          <span>TELOS / YIELD INFRASTRUCTURE</span>
          <span>BUILD V.01 / PREVIEW</span>
          <span>ERC-4626 / LAYERZERO</span>
        </div>

        <p className="tl-legal">
          © {YEAR} Telos. Testnet software is provided as is.
          Every yield, TVL, creator, fee and chart shown in this interface is
          sample data for design preview — not live market data, an offer, or
          financial advice. Third-party protocol names describe example strategy
          targets only and do not imply affiliation or endorsement. Deposit and
          withdrawal controls in this template are not connected to contracts.
        </p>
      </div>
    </footer>
  );
}

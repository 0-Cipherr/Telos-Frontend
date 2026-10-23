import type { Vault } from "../types";
import MarketTerminal from "./MarketTerminal";

type Props = {
  vaults: Vault[];
};

const STEPS = [
  { index: "01", label: "Discover", detail: "Scan the index" },
  { index: "02", label: "Investigate", detail: "Read the thesis" },
  { index: "03", label: "Allocate", detail: "Enter a vault" },
];

export default function Hero({ vaults }: Props) {
  return (
    <section className="tl-wrap tl-hero" aria-labelledby="tl-hero-title">
      <div className="tl-hero__copy">
        <div className="tl-anno">
          <span className="tl-anno__box">PROTOCOL / 01</span>
          <span className="tl-anno__line" aria-hidden="true" />
          <span>YIELD INFRASTRUCTURE</span>
        </div>

        <h1 id="tl-hero-title">
          PUT CAPITAL
          <br />
          TO WORK<span className="tl-lime">.</span>
        </h1>

        <p className="tl-hero__sub">
          Curated yield vaults and creator-launched strategies, standardised as
          ERC-4626 and coordinated across chains. Find a thesis, inspect the
          terms, allocate on your own conviction.
        </p>

        <div className="tl-hero__cta">
          <a className="tl-btn tl-btn--primary" href="#marketplace">
            ENTER MARKETPLACE <span aria-hidden="true">→</span>
          </a>
          <a className="tl-btn" href="#builder">
            LAUNCH A VAULT <span aria-hidden="true">↗</span>
          </a>
          <a className="tl-textlink" href="#thesis">
            READ THE THESES
          </a>
        </div>

        <ol className="tl-steps" aria-label="How the interface works">
          {STEPS.map((step) => (
            <li key={step.index}>
              <span className="tl-steps__index">{step.index}</span>
              <span className="tl-steps__label">{step.label}</span>
              <span className="tl-steps__detail">{step.detail}</span>
            </li>
          ))}
        </ol>
      </div>

      <MarketTerminal vaults={vaults} />
    </section>
  );
}

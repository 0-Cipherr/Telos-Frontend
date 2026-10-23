import { useState } from "react";
import { formatUsd } from "../data";
import SectionHead from "./SectionHead";
import { Field, PanelBar } from "./Field";

const clampNumber = (raw: string, fallback = 0) => {
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
};

export default function YieldCalculator() {
  const [capital, setCapital] = useState("500000");
  const [grossApy, setGrossApy] = useState("8");
  const [fee, setFee] = useState(15);

  const capitalValue = clampNumber(capital);
  const apyValue = clampNumber(grossApy);
  const feeValue = Math.min(30, Math.max(0, fee));

  const grossYield = (capitalValue * apyValue) / 100;
  const creatorFees = (grossYield * feeValue) / 100;
  const netYield = grossYield - creatorFees;
  const netApy = apyValue * (1 - feeValue / 100);
  const depositorShare = 100 - feeValue;

  return (
    <section
      id="calculator"
      className="tl-wrap tl-section"
      aria-labelledby="tl-calculator-title"
    >
      <SectionHead
        id="tl-calculator-title"
        index="04"
        kicker="CREATOR ECONOMICS / ESTIMATOR"
        title="Price your fee."
        lede="Every creator sets their own fee on yield. Adjust the assumptions to see how gross yield splits between depositors and the vault creator."
        meta="ESTIMATE / NOT A FORECAST"
      />

      <div className="tl-two">
        <div className="tl-panel">
          <PanelBar label="INPUTS" meta="USD / %" />

          <Field
            label="CAPITAL DEPLOYED (USD)"
            htmlFor="tl-calc-capital"
            hint="Total deposits earning the gross rate."
          >
            <input
              id="tl-calc-capital"
              className="tl-input"
              type="number"
              inputMode="decimal"
              min={0}
              step={1000}
              value={capital}
              onChange={(event) => setCapital(event.target.value)}
            />
          </Field>

          <Field
            label="GROSS APY (%)"
            htmlFor="tl-calc-apy"
            hint="Before the creator fee is applied."
          >
            <input
              id="tl-calc-apy"
              className="tl-input"
              type="number"
              inputMode="decimal"
              min={0}
              step={0.1}
              value={grossApy}
              onChange={(event) => setGrossApy(event.target.value)}
            />
          </Field>

          <div className="tl-field">
            <div className="tl-field__head">
              <label htmlFor="tl-calc-fee">CREATOR FEE</label>
              <span className="tl-lime">{feeValue}%</span>
            </div>
            <input
              id="tl-calc-fee"
              className="tl-range"
              type="range"
              min={0}
              max={30}
              step={1}
              value={feeValue}
              onChange={(event) => setFee(Number(event.target.value))}
            />
            <div className="tl-range__scale" aria-hidden="true">
              <span>0%</span>
              <span>15%</span>
              <span>30%</span>
            </div>
            <p className="tl-field__hint">
              The 0–30% range is a UI placeholder. Actual limits come from the
              vault contracts.
            </p>
          </div>

          <p className="tl-disclaimer">
            Simple, non-compounded math. Negative or invalid inputs are treated
            as zero. Fee mechanics shown here are illustrative; the contracts
            define actual fee handling.
          </p>
        </div>

        <div className="tl-panel tl-panel--output">
          <PanelBar label="ESTIMATED SPLIT / YEAR" meta="DEMO MATH" />

          <span className="tl-label">CREATOR EARNINGS</span>
          <div className="tl-big">{formatUsd(creatorFees)}</div>

          <div
            className="tl-split"
            role="img"
            aria-label={`Depositors keep ${depositorShare} percent, creator receives ${feeValue} percent`}
          >
            <i style={{ width: `${depositorShare}%` }} />
            <i className="is-fee" style={{ width: `${feeValue}%` }} />
          </div>
          <div className="tl-legend">
            <span>
              <i aria-hidden="true" /> DEPOSITORS {depositorShare}%
            </span>
            <span>
              <i className="is-fee" aria-hidden="true" /> CREATOR {feeValue}%
            </span>
          </div>

          <dl className="tl-rows">
            <div>
              <dt>GROSS YIELD / YEAR</dt>
              <dd>{formatUsd(grossYield)}</dd>
            </div>
            <div>
              <dt>CREATOR FEES</dt>
              <dd>{formatUsd(creatorFees)}</dd>
            </div>
            <div>
              <dt>NET TO DEPOSITORS</dt>
              <dd>{formatUsd(netYield)}</dd>
            </div>
            <div className="is-emphasis">
              <dt>DEPOSITOR NET APY</dt>
              <dd>{netApy.toFixed(2)}%</dd>
            </div>
          </dl>

          <p className="tl-formula">
            ({formatUsd(capitalValue)} × {apyValue.toFixed(1)}%) − {feeValue}% fee
          </p>
        </div>
      </div>
    </section>
  );
}

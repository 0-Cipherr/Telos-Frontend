import { useState } from "react";

const fmt = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function Calculator() {
  const [deposits, setDeposits] = useState("500000");
  const [gross, setGross] = useState("8");
  const [fee, setFee] = useState(15);

  const total = Math.max(0, Number.parseFloat(deposits) || 0);
  const grossApy = Math.max(0, Number.parseFloat(gross) || 0);
  const yieldYear = (total * grossApy) / 100;
  const creatorYear = (yieldYear * fee) / 100;
  const depositorYear = yieldYear - creatorYear;
  const netApy = grossApy * (1 - fee / 100);

  return (
    <section id="calculator" className="section">
      <h2>🧮 Creator fee calculator</h2>
      <div className="two">
        <div className="panel">
          <div className="field">
            <label htmlFor="calc-deposits">Vault deposits (USD)</label>
            <input
              id="calc-deposits"
              className="input"
              inputMode="decimal"
              value={deposits}
              onChange={(event) => setDeposits(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="calc-gross">Gross APY (%)</label>
            <input
              id="calc-gross"
              className="input"
              inputMode="decimal"
              value={gross}
              onChange={(event) => setGross(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="calc-fee">
              Creator fee <b>{fee}%</b>
            </label>
            <input
              id="calc-fee"
              type="range"
              min={0}
              max={30}
              value={fee}
              onChange={(event) => setFee(Number(event.target.value))}
            />
          </div>
        </div>

        <div className="panel">
          <div className="stat-label">Creator earns / yr</div>
          <div className="big lime">${fmt(creatorYear)}</div>
          <dl className="stat-rows">
            <div>
              <dt>Total yield / yr</dt>
              <dd>${fmt(yieldYear)}</dd>
            </div>
            <div>
              <dt>Depositors keep</dt>
              <dd>${fmt(depositorYear)}</dd>
            </div>
            <div>
              <dt>Depositor net APY</dt>
              <dd className="lime">{netApy.toFixed(2)}%</dd>
            </div>
          </dl>
          <p className="note">Estimates only.</p>
        </div>
      </div>
      <p className="note">
        Simple, non-compounded math. Fee mechanics shown here are illustrative;
        actual fee handling is defined by the vault contracts.
      </p>
    </section>
  );
}

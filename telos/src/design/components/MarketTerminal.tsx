import type { Vault } from "../types";
import { DEMO_TREND, formatUsdCompact, median } from "../data";

type Props = {
  vaults: Vault[];
};

const CHART = { width: 520, height: 176, left: 38, right: 10, top: 12, bottom: 24 };
const MAX_APY = 12;

function chartPoints(values: number[]) {
  const innerWidth = CHART.width - CHART.left - CHART.right;
  const innerHeight = CHART.height - CHART.top - CHART.bottom;
  return values.map((value, index) => {
    const x = CHART.left + (index / (values.length - 1)) * innerWidth;
    const y = CHART.top + innerHeight - (value / MAX_APY) * innerHeight;
    return [x, y] as const;
  });
}

function toPath(points: readonly (readonly [number, number])[]) {
  return points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
}

export default function MarketTerminal({ vaults }: Props) {
  const totalTvl = vaults.reduce((sum, vault) => sum + vault.tvl, 0);
  const averageApy = median(vaults.map((vault) => vault.apy));
  const networks = new Set(vaults.map((vault) => vault.chain)).size;
  const points = chartPoints(DEMO_TREND);
  const line = toPath(points);
  const area = `${line} L${CHART.width - CHART.right} ${CHART.height - CHART.bottom} L${CHART.left} ${CHART.height - CHART.bottom} Z`;
  const last = points[points.length - 1];

  return (
    <aside className="tl-terminal" aria-label="Market snapshot, demonstration data">
      <div className="tl-terminal__bar">
        <span className="tl-terminal__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="tl-terminal__path">TELOS://MARKET_FEED</span>
        <span className="tl-terminal__tag">DEMO</span>
      </div>

      <div className="tl-terminal__body">
        <div className="tl-terminal__metrics">
          <div>
            <span className="tl-label">TVL TRACKED</span>
            <strong>{formatUsdCompact(totalTvl)}</strong>
          </div>
          <div>
            <span className="tl-label">LISTINGS</span>
            <strong>{String(vaults.length).padStart(2, "0")}</strong>
          </div>
          <div>
            <span className="tl-label">MEDIAN APY</span>
            <strong className="is-lime">{averageApy.toFixed(1)}%</strong>
          </div>
          <div>
            <span className="tl-label">NETWORKS</span>
            <strong>{String(networks).padStart(2, "0")}</strong>
          </div>
        </div>

        <figure className="tl-chart">
          <figcaption>
            <span className="tl-label">INDEXED APY / 20 TICKS</span>
            <span className="tl-chart__legend">
              <i aria-hidden="true" />
              SYNTHETIC
            </span>
          </figcaption>
          <svg
            viewBox={`0 0 ${CHART.width} ${CHART.height}`}
            role="img"
            aria-label="Synthetic APY trend for demonstration purposes only"
          >
            {[0, 4, 8, 12].map((tick) => {
              const y =
                CHART.top +
                (CHART.height - CHART.top - CHART.bottom) -
                (tick / MAX_APY) * (CHART.height - CHART.top - CHART.bottom);
              return (
                <g key={tick}>
                  <line
                    x1={CHART.left}
                    y1={y}
                    x2={CHART.width - CHART.right}
                    y2={y}
                    stroke="#2E322A"
                    strokeDasharray="2 4"
                  />
                  <text
                    x={CHART.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="tl-chart__axis"
                  >
                    {tick.toFixed(0)}
                  </text>
                </g>
              );
            })}

            {[
              { x: 0, label: "T-19" },
              { x: 6, label: "T-13" },
              { x: 12, label: "T-07" },
              { x: 19, label: "NOW" },
            ].map((mark) => {
              const x =
                CHART.left +
                (mark.x / (DEMO_TREND.length - 1)) *
                  (CHART.width - CHART.left - CHART.right);
              return (
                <text
                  key={mark.label}
                  x={x}
                  y={CHART.height - 6}
                  textAnchor="middle"
                  className="tl-chart__axis"
                >
                  {mark.label}
                </text>
              );
            })}

            <path d={area} fill="url(#tl-terminal-area)" />
            <path
              d={line}
              fill="none"
              stroke="#B9FF59"
              strokeWidth="1.75"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle cx={last[0]} cy={last[1]} r="4.5" fill="#171915" stroke="#B9FF59" strokeWidth="2" />

            <defs>
              <linearGradient id="tl-terminal-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#B9FF59" stopOpacity="0.18" />
                <stop offset="1" stopColor="#B9FF59" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          <p className="tl-chart__note">
            Static snapshot · sample values · not live market data
          </p>
        </figure>

        <div className="tl-terminal__sys">
          <div>
            <span className="tl-dot tl-dot--live" aria-hidden="true" />
            <span>VAULT STANDARD</span>
            <b>ERC-4626</b>
          </div>
          <div>
            <span className="tl-dot tl-dot--live" aria-hidden="true" />
            <span>SETTLEMENT</span>
            <b>SEPOLIA</b>
          </div>
          <div>
            <span className="tl-dot" aria-hidden="true" />
            <span>MESSAGING</span>
            <b>LAYERZERO</b>
          </div>
        </div>
      </div>

      <div className="tl-terminal__foot">
        <span>REV. 01 / PREVIEW BUILD</span>
        <span>DATA CLASS: SAMPLE</span>
      </div>
    </aside>
  );
}

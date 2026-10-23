import SectionHead from "./SectionHead";

const STEPS = [
  {
    title: "Creator deploys",
    body: "Pick an asset, strategy and your own fee. The factory launches an ERC-4626 vault as a lightweight clone.",
  },
  {
    title: "Chains connect",
    body: "The registry and LayerZero messaging link vault infrastructure across supported networks.",
  },
  {
    title: "Users deposit",
    body: "Depositors receive vault shares and can withdraw any time. The creator earns their fee on yield.",
  },
];

const ARCHITECTURE = [
  {
    name: "VaultFactory",
    body: "Deploys EIP-1167 minimal-proxy clones of one shared implementation to keep gas low.",
  },
  {
    name: "VaultRegistry",
    body: "Central record of vaults, creators, peers and endpoints across every supported chain.",
  },
  {
    name: "Messenger",
    body: "LayerZero-powered messages between registry deployments on different networks.",
  },
  {
    name: "StrategyAdapter",
    body: "One interface so ready-made and custom strategies plug into any vault.",
  },
];

const STACK = [
  "Solidity",
  "Foundry",
  "OpenZeppelin",
  "ERC-4626",
  "LayerZero",
  "EIP-1167",
  "CREATE3",
];

export default function NetworkSection() {
  return (
    <section
      id="network"
      className="tl-wrap tl-section"
      aria-labelledby="tl-network-title"
    >
      <SectionHead
        id="tl-network-title"
        index="06"
        kicker="ARCHITECTURE / MULTICHAIN"
        title="One registry. Two testnets."
        lede="Each chain runs its own vaults. A shared registry and LayerZero messaging keep deployments coordinated without pretending every chain is one execution environment."
        meta="BASE SEPOLIA / ARBITRUM SEPOLIA"
      />

      <div className="tl-network">
        <div className="tl-panel tl-network__diagram">
          <svg
            viewBox="0 0 520 250"
            role="img"
            aria-label="Base Sepolia and Arbitrum Sepolia connected through a LayerZero registry"
          >
            <defs>
              <pattern
                id="tl-network-grid"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M20 0H0V20"
                  fill="none"
                  stroke="#2A2E26"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="520" height="250" fill="url(#tl-network-grid)" opacity="0.6" />

            <line
              x1="150"
              y1="125"
              x2="370"
              y2="125"
              stroke="#B9FF59"
              strokeOpacity="0.55"
              strokeWidth="1.25"
              strokeDasharray="5 5"
            />
            <circle cx="260" cy="125" r="44" fill="#1B1E19" stroke="#393D32" />
            <text x="260" y="120" textAnchor="middle" className="tl-svg__label">
              LAYERZERO
            </text>
            <text x="260" y="136" textAnchor="middle" className="tl-svg__tiny">
              MESSENGER
            </text>

            {[
              { x: 96, label: "BASE", sub: "SEPOLIA", accent: true },
              { x: 424, label: "ARBITRUM", sub: "SEPOLIA", accent: false },
            ].map((node) => (
              <g key={node.label}>
                <circle
                  cx={node.x}
                  cy={125}
                  r="46"
                  fill="#20231D"
                  stroke={node.accent ? "#B9FF59" : "#565B4B"}
                  strokeWidth="1.25"
                />
                <circle
                  cx={node.x}
                  cy={125}
                  r="52"
                  fill="none"
                  stroke={node.accent ? "#B9FF59" : "#565B4B"}
                  strokeOpacity="0.3"
                  strokeDasharray="2 5"
                />
                <text
                  x={node.x}
                  y={119}
                  textAnchor="middle"
                  className="tl-svg__label"
                >
                  {node.label}
                </text>
                <text
                  x={node.x}
                  y={135}
                  textAnchor="middle"
                  className="tl-svg__tiny"
                >
                  {node.sub}
                </text>
                <text
                  x={node.x}
                  y={152}
                  textAnchor="middle"
                  className="tl-svg__micro"
                >
                  REGISTRY + VAULTS
                </text>
              </g>
            ))}

            <line x1="96" y1="204" x2="424" y2="204" stroke="#393D32" strokeWidth="1" />
            <text x="96" y="220" textAnchor="middle" className="tl-svg__micro">
              84532
            </text>
            <text x="260" y="220" textAnchor="middle" className="tl-svg__micro">
              SHARED IDENTITY
            </text>
            <text x="424" y="220" textAnchor="middle" className="tl-svg__micro">
              421614
            </text>
          </svg>
          <p className="tl-chart__note">
            Architecture diagram · testnet deployment · not a live network map
          </p>
        </div>

        <div className="tl-network__steps">
          {STEPS.map((step, index) => (
            <div className="tl-network__step" key={step.title}>
              <span className="tl-steps__index">0{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="tl-arch">
        {ARCHITECTURE.map((item) => (
          <article key={item.name}>
            <code>{item.name}</code>
            <p>{item.body}</p>
          </article>
        ))}
      </div>

      <div className="tl-chips" aria-label="Technology stack">
        {STACK.map((item) => (
          <span className="tl-chip" key={item}>
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

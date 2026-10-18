import { useState } from "react";
import Logo from "./Logo";
import VaultIcon from "./VaultIcon";

type Props = {
  ready: boolean;
  authenticated: boolean;
  login: () => void;
  logout: () => void;
  address?: string;
  preview?: boolean;
};

type Vault = {
  name: string;
  asset: string;
  chain: string;
  kind: "ready" | "custom";
  proto?: string;
  apy: number;
  tvl: string;
  fee: number;
  creator: string;
  color: string;
  h: number[];
};

/* SAMPLE DATA ONLY. Each creator sets their own fee. Replace with real vaults from your API / registry. */
const VAULTS: Vault[] = [
  {
    name: "USDC/WETH LP",
    asset: "AE",
    chain: "Base",
    kind: "ready",
    proto: "Aerodrome",
    apy: 14.2,
    tvl: "2.4M",
    fee: 10,
    creator: "0x4a1f…9c2e",
    color: "#3b82f6",
    h: [3, 4, 4, 6, 5, 7, 8, 8, 10, 11],
  },
  {
    name: "PT-sUSDe Fixed Yield",
    asset: "PE",
    chain: "Arbitrum",
    kind: "ready",
    proto: "Pendle",
    apy: 11.6,
    tvl: "1.8M",
    fee: 8,
    creator: "0x91bc…d04a",
    color: "#2dd4bf",
    h: [5, 5, 6, 6, 7, 7, 8, 8, 9, 9],
  },
  {
    name: "USDC Lending",
    asset: "MO",
    chain: "Base",
    kind: "ready",
    proto: "Morpho",
    apy: 6.8,
    tvl: "3.1M",
    fee: 12,
    creator: "0x7e20…31ff",
    color: "#60a5fa",
    h: [4, 4, 5, 5, 5, 6, 6, 6, 7, 7],
  },
  {
    name: "WETH Supply",
    asset: "AA",
    chain: "Arbitrum",
    kind: "ready",
    proto: "Aave",
    apy: 3.9,
    tvl: "5.2M",
    fee: 5,
    creator: "0x03d9…aa71",
    color: "#a78bfa",
    h: [4, 4, 3, 4, 4, 5, 4, 5, 5, 5],
  },
  {
    name: "GM ETH/USD Pool",
    asset: "GM",
    chain: "Arbitrum",
    kind: "ready",
    proto: "GMX",
    apy: 17.5,
    tvl: "960K",
    fee: 15,
    creator: "0xb5c4…6e18",
    color: "#38bdf8",
    h: [2, 4, 3, 6, 7, 6, 9, 10, 9, 12],
  },
  {
    name: "USDC/ARB LP",
    asset: "CA",
    chain: "Arbitrum",
    kind: "ready",
    proto: "Camelot",
    apy: 12.1,
    tvl: "740K",
    fee: 10,
    creator: "0x2ff8…0b93",
    color: "#f59e0b",
    h: [3, 5, 4, 6, 6, 7, 8, 7, 9, 9],
  },
  {
    name: "Delta-Neutral ETH",
    asset: "DN",
    chain: "Base",
    kind: "custom",
    apy: 9.4,
    tvl: "410K",
    fee: 20,
    creator: "0xc3a7…42d0",
    color: "#ec6a4c",
    h: [2, 3, 5, 4, 6, 7, 7, 8, 9, 9],
  },
  {
    name: "Stable Basis Carry",
    asset: "SB",
    chain: "Arbitrum",
    kind: "custom",
    apy: 8.2,
    tvl: "280K",
    fee: 15,
    creator: "0x58e1…c7b6",
    color: "#f6a88f",
    h: [4, 4, 5, 6, 5, 6, 7, 7, 8, 8],
  },
  {
    name: "Blue-chip Rotator",
    asset: "BR",
    chain: "Base",
    kind: "custom",
    apy: 10.7,
    tvl: "150K",
    fee: 25,
    creator: "0xd90e…18a2",
    color: "#4ade80",
    h: [3, 3, 5, 6, 5, 7, 8, 8, 9, 10],
  },
];

function Spark({
  d,
  w = 110,
  h = 36,
}: {
  d: number[];
  w?: number;
  h?: number;
}) {
  const min = Math.min(...d),
    max = Math.max(...d);
  const p = d
    .map(
      (v, i) =>
        `${i ? "L" : "M"}${((i / (d.length - 1)) * w).toFixed(1)} ${(h - 3 - ((v - min) / (max - min || 1)) * (h - 6)).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path
        d={p}
        fill="none"
        stroke="#4ade80"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VaultCard({ v }: { v: Vault }) {
  return (
    <article className="vc">
      <div className="vc-top">
        <div className="vname">
          <VaultIcon v={v} />
          <div>
            {v.name}
            <small>
              {v.kind === "ready" ? `via ${v.proto}` : "Custom strategy"} ·{" "}
              {v.chain}
            </small>
          </div>
        </div>
        <span className={`badge ${v.kind}`}>
          {v.kind === "ready" ? "READY-MADE" : "CUSTOM"}
        </span>
      </div>
      <div className="vc-mid">
        <div>
          <div className="apyv">{v.apy.toFixed(1)}%</div>
          <div className="k">Net APY · sample</div>
        </div>
        <Spark d={v.h} />
      </div>
      <div className="vc-foot">
        <span>
          Creator<b>{v.creator}</b>
        </span>
        <span className="fee">
          Creator fee<b>{v.fee}%</b>
        </span>
        <span>
          TVL<b>${v.tvl}</b>
        </span>
      </div>
    </article>
  );
}

const STEPS = [
  {
    t: "Creator deploys",
    d: "Pick an asset, strategy and your own fee. The factory launches an ERC-4626 vault as a lightweight clone.",
  },
  {
    t: "Chains connect",
    d: "The registry and LayerZero messaging link vault infrastructure across supported networks.",
  },
  {
    t: "Users deposit",
    d: "Depositors get vault shares and can withdraw any time. The creator earns their fee on yield.",
  },
];
const ARCH = [
  {
    c: "VaultFactory",
    d: "Deploys EIP-1167 minimal-proxy clones of one shared implementation to keep gas low.",
  },
  {
    c: "VaultRegistry",
    d: "Central record of vaults, creators, peers and endpoints across every supported chain.",
  },
  {
    c: "Messenger",
    d: "LayerZero-powered messages between registry deployments on different networks.",
  },
  {
    c: "StrategyAdapter",
    d: "One interface so ready-made and custom strategies plug into any vault.",
  },
];
const FAQS = [
  {
    q: "Who sets a vault's fee?",
    a: "The vault creator sets their own fee when they deploy. Each vault shows its creator and fee before you deposit.",
  },
  {
    q: "Is Telos live on mainnet?",
    a: "Not yet. Telos is deployed on Base Sepolia and Arbitrum Sepolia testnets.",
  },
  {
    q: "Are the APYs and vaults on this page real?",
    a: "No. Every APY, TVL, creator and fee on this page is sample data for design preview. Protocol names are example strategy targets, not partnerships.",
  },
  {
    q: "What are ready-made vaults?",
    a: "Vaults wrapping an existing DeFi app's strategy through a StrategyAdapter, so users get that yield in a standard ERC-4626 vault.",
  },
  {
    q: "What are custom vaults?",
    a: "Vaults where a creator defines their own strategy, asset and fee, then launches it on supported chains.",
  },
];
const ASSETS = ["USDC", "WETH", "DAI", "WBTC"];
const CHAINS = ["Base", "Arbitrum"];
const STRATS = [
  "Lending",
  "Liquidity provision",
  "Delta-neutral",
  "Fixed yield",
];

const fmt = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function Home({
  ready,
  authenticated,
  login,
  logout,
  address,
  preview,
}: Props) {
  const [kind, setKind] = useState<"all" | "ready" | "custom">("all");
  const [chain, setChain] = useState("All");
  // creator calculator
  const [tvl, setTvl] = useState("500000");
  const [gross, setGross] = useState("8");
  const [cfee, setCfee] = useState(15);
  // builder
  const [bName, setBName] = useState("My Yield Vault");
  const [bAsset, setBAsset] = useState("USDC");
  const [bChain, setBChain] = useState("Base");
  const [bStrat, setBStrat] = useState("Lending");
  const [bFee, setBFee] = useState(10);

  const short = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "Disconnect";
  const action = !ready ? null : authenticated ? (
    <button className="btn" onClick={logout}>
      {short}
    </button>
  ) : (
    <button className="btn" onClick={login}>
      Connect Wallet
    </button>
  );
  const cta = (cls = "btn btn-lg") =>
    ready &&
    !authenticated && (
      <button className={cls} onClick={login}>
        Connect Wallet
      </button>
    );

  const shown = VAULTS.filter(
    (v) =>
      (kind === "all" || v.kind === kind) &&
      (chain === "All" || v.chain === chain),
  );

  const T = Math.max(0, parseFloat(tvl) || 0);
  const G = Math.max(0, parseFloat(gross) || 0);
  const yieldYear = (T * G) / 100;
  const creatorYear = (yieldYear * cfee) / 100;
  const depositorYear = yieldYear - creatorYear;
  const netApy = G * (1 - cfee / 100);

  const preview_v: Vault = {
    name: bName || "Untitled Vault",
    asset: bAsset.slice(0, 2),
    chain: bChain,
    kind: "custom",
    apy: 8,
    tvl: "0",
    fee: bFee,
    creator: address ? short : "you",
    color: "#ec6a4c",
    h: [3, 4, 4, 5, 6, 6, 7, 8, 8, 9],
  };
  const sel = (
    id: string,
    val: string,
    set: (s: string) => void,
    opts: string[],
  ) => (
    <select
      id={id}
      className="input"
      value={val}
      onChange={(e) => set(e.target.value)}
    >
      {opts.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );

  return (
    <div className="page">
      {preview && (
        <div className="banner">
          Preview mode: add VITE_PRIVY_APP_ID to .env.local to enable wallet
          connect
        </div>
      )}
      <div className="gridbg" />
      <div className="glow1" />
      <div className="glow2" />

      <div className="navbar">
        <header className="wrap nav">
          <a href="#top" className="brand">
            <Logo size={32} /> TELOS
          </a>
          <nav className="links">
            <a href="#vaults">Vaults</a>
            <a href="#creators">Creators</a>
            <a href="#launch">Launch</a>
            <a href="#network">Network</a>
            <a href="#faq">FAQ</a>
          </nav>
          {action}
        </header>
      </div>

      <main id="top">
        <section className="wrap hero">
          <div>
            <span className="pill">
              <span className="dot" /> Live on testnet · Base Sepolia &amp;
              Arbitrum Sepolia
            </span>
            <h1>
              Every yield strategy, Every Chain <em>On a Single Chain.</em>
            </h1>
            <p className="sub">
              Use ready-made vaults wrapping top DeFi apps, or launch your own
              custom vault and set your own fee. All standard ERC-4626, all
              multichain.
            </p>
            <div className="cta">
              {cta()}
              <a href="#vaults" className="btn btn-lg btn-ghost">
                Explore vaults
              </a>
              <a href="#launch" className="btn btn-lg btn-ghost">
                Launch a vault
              </a>
            </div>
            <div className="mini">
              <div>
                <b>2</b>
                <span>Testnets live</span>
              </div>
              <div>
                <b>ERC-4626</b>
                <span>Vault standard</span>
              </div>
              <div>
                <b>Creator-set</b>
                <span>Fees per vault</span>
              </div>
            </div>
          </div>
          <div className="stack">
            {[VAULTS[0], VAULTS[6], VAULTS[1]].map((v) => (
              <VaultCard key={v.name} v={v} />
            ))}
          </div>
        </section>

        <section id="vaults" className="wrap section">
          <span className="eyebrow">Vault marketplace</span>
          <h2>Ready-made or custom. Your call.</h2>
          <p className="lead">
            Ready-made vaults wrap existing DeFi apps. Custom vaults come from
            independent creators with their own strategies. Every card shows who
            made it and the fee they set.
          </p>
          <div className="filters">
            <div className="tabs" role="group" aria-label="Vault type">
              {(
                [
                  ["all", "All"],
                  ["ready", "Ready-made"],
                  ["custom", "Custom"],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  className={`tab ${kind === k ? "on" : ""}`}
                  onClick={() => setKind(k)}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="tabs" role="group" aria-label="Chain">
              {["All", ...CHAINS].map((c) => (
                <button
                  key={c}
                  className={`tab ${chain === c ? "on" : ""}`}
                  onClick={() => setChain(c)}
                >
                  {c === "All" ? "All chains" : c}
                </button>
              ))}
            </div>
          </div>
          <div className="vgrid">
            {shown.map((v) => (
              <VaultCard key={v.name} v={v} />
            ))}
          </div>
          <p className="note">
            Sample data for design preview. Protocols shown are example strategy
            targets, not official integrations or partnerships. Base and
            Arbitrum are planned targets; Avenor currently runs on their Sepolia
            testnets. Not live yields, not financial advice.
          </p>
        </section>

        <section id="creators" className="wrap section">
          <span className="eyebrow">For creators</span>
          <h2>Set your fee. Earn on every dollar of yield.</h2>
          <p className="lead">
            Each creator picks their own fee. Move the sliders to see how yield
            splits between depositors and the vault creator. Illustrative math,
            not a forecast.
          </p>
          <div className="two">
            <div className="panel">
              <div className="field">
                <label htmlFor="t">Vault deposits (USD)</label>
                <input
                  id="t"
                  className="input"
                  inputMode="decimal"
                  value={tvl}
                  onChange={(e) => setTvl(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="g">Gross APY (%)</label>
                <input
                  id="g"
                  className="input"
                  inputMode="decimal"
                  value={gross}
                  onChange={(e) => setGross(e.target.value)}
                />
              </div>
              <div className="field">
                <span className="lab">
                  Your creator fee <b>{cfee}%</b>
                </span>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={cfee}
                  onChange={(e) => setCfee(Number(e.target.value))}
                  aria-label="Creator fee percent"
                />
              </div>
            </div>
            <div className="panel">
              <div className="k">Creator earnings / year</div>
              <div className="big a">${fmt(creatorYear)}</div>
              <div className="split">
                <i style={{ width: `${100 - cfee}%`, background: "#4ade80" }} />
                <i style={{ width: `${cfee}%`, background: "#ec6a4c" }} />
              </div>
              <div className="legend">
                <span style={{ "--c": "#4ade80" } as React.CSSProperties}>
                  Depositors {100 - cfee}%
                </span>
                <span style={{ "--c": "#ec6a4c" } as React.CSSProperties}>
                  Creator {cfee}%
                </span>
              </div>
              <div className="rows">
                <div className="rw">
                  <span>Total yield / year</span>
                  <span>${fmt(yieldYear)}</span>
                </div>
                <div className="rw">
                  <span>Depositors keep</span>
                  <span>${fmt(depositorYear)}</span>
                </div>
                <div className="rw">
                  <span>Depositor net APY</span>
                  <span style={{ color: "var(--green)" }}>
                    {netApy.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          <p className="note">
            Simple, non-compounded math. Fee mechanics shown here are
            illustrative; actual fee handling is defined by the vault contracts.
          </p>
        </section>

        <section id="launch" className="wrap section">
          <span className="eyebrow">Launch a vault</span>
          <h2>Build your own vault in minutes.</h2>
          <p className="lead">
            Choose an asset, chain, strategy and your own fee. Preview your
            vault card live.
          </p>
          <div className="two">
            <div className="panel">
              <div className="field">
                <label htmlFor="bn">Vault name</label>
                <input
                  id="bn"
                  className="input"
                  value={bName}
                  maxLength={32}
                  onChange={(e) => setBName(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="ba">Asset</label>
                {sel("ba", bAsset, setBAsset, ASSETS)}
              </div>
              <div className="field">
                <label htmlFor="bc">Chain</label>
                {sel("bc", bChain, setBChain, CHAINS)}
              </div>
              <div className="field">
                <label htmlFor="bs">Strategy</label>
                {sel("bs", bStrat, setBStrat, STRATS)}
              </div>
              <div className="field">
                <span className="lab">
                  Your creator fee <b>{bFee}%</b>
                </span>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={bFee}
                  onChange={(e) => setBFee(Number(e.target.value))}
                  aria-label="Vault creator fee percent"
                />
              </div>
              {ready && !authenticated ? (
                <button className="btn btn-lg" onClick={login}>
                  Connect wallet to launch
                </button>
              ) : (
                <button
                  className="btn btn-lg"
                  disabled
                  title="Deployment from the UI is not wired up yet"
                >
                  Deploy vault (coming soon)
                </button>
              )}
            </div>
            <div>
              <div className="k" style={{ marginBottom: 12 }}>
                Live preview · {bStrat}
              </div>
              <VaultCard v={preview_v} />
              <p className="note">
                Preview only. APY is a placeholder. The 0–30% slider range is a
                UI placeholder; real limits come from your contracts.
              </p>
            </div>
          </div>
        </section>

        <section id="network" className="wrap section">
          <span className="eyebrow">Multichain by design</span>
          <h2>Connected through a shared registry.</h2>
          <p className="lead">
            Each chain runs its own vaults. The registry and LayerZero messaging
            keep them coordinated.
          </p>
          <div className="net panel">
            <svg
              className="netsvg"
              viewBox="0 0 520 260"
              role="img"
              aria-label="Base Sepolia and Arbitrum Sepolia connected through LayerZero"
            >
              <defs>
                <linearGradient id="ln" x1="0" x2="1">
                  <stop offset="0" stopColor="#3b82f6" />
                  <stop offset="1" stopColor="#28a0f0" />
                </linearGradient>
              </defs>
              <line
                x1="120"
                y1="130"
                x2="400"
                y2="130"
                stroke="url(#ln)"
                strokeWidth="2"
                strokeDasharray="6 6"
              />
              <circle
                cx="260"
                cy="130"
                r="36"
                fill="#151820"
                stroke="#ec6a4c"
                strokeWidth="2"
              />
              <text
                x="260"
                y="126"
                textAnchor="middle"
                fill="#f4f0e8"
                fontSize="11"
                fontWeight="800"
              >
                LAYER
              </text>
              <text
                x="260"
                y="141"
                textAnchor="middle"
                fill="#f4f0e8"
                fontSize="11"
                fontWeight="800"
              >
                ZERO
              </text>
              {[
                { x: 90, l: "Base", c: "#3b82f6" },
                { x: 430, l: "Arbitrum", c: "#28a0f0" },
              ].map((n) => (
                <g key={n.l}>
                  <circle
                    cx={n.x}
                    cy="130"
                    r="52"
                    fill="#0e1014"
                    stroke={n.c}
                    strokeWidth="2"
                  />
                  <text
                    x={n.x}
                    y="118"
                    textAnchor="middle"
                    fill="#f4f0e8"
                    fontSize="13"
                    fontWeight="800"
                  >
                    {n.l}
                  </text>
                  <text
                    x={n.x}
                    y="134"
                    textAnchor="middle"
                    fill="#8d8982"
                    fontSize="11"
                  >
                    Sepolia
                  </text>
                  <text
                    x={n.x}
                    y="152"
                    textAnchor="middle"
                    fill={n.c}
                    fontSize="10"
                    fontWeight="700"
                  >
                    Registry + Vaults
                  </text>
                </g>
              ))}
            </svg>
            <div className="list">
              {STEPS.map((s, i) => (
                <div className="item" key={s.t}>
                  <span className="ico">0{i + 1}</span>
                  <div>
                    <h4>{s.t}</h4>
                    <p>{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="cards" style={{ marginTop: 14 }}>
            {ARCH.map((a) => (
              <article className="card" key={a.c}>
                <code>{a.c}</code>
                <p>{a.d}</p>
              </article>
            ))}
          </div>
          <div className="chips">
            {[
              "Solidity",
              "Foundry",
              "OpenZeppelin",
              "ERC-4626",
              "LayerZero",
              "EIP-1167",
              "CREATE3",
            ].map((t) => (
              <span className="chip" key={t}>
                {t}
              </span>
            ))}
          </div>
        </section>

        <section id="faq" className="wrap section">
          <span className="eyebrow">FAQ</span>
          <h2>Straight answers.</h2>
          <div className="faq">
            {FAQS.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="wrap">
          <div className="band">
            <span className="eyebrow">Testnet</span>
            <h2>Use a vault. Or launch yours.</h2>
            <p className="lead">
              Connect a wallet and explore multichain vaults on Base Sepolia and
              Arbitrum Sepolia.
            </p>
            {cta() ||
              (authenticated ? (
                <p style={{ color: "var(--green)", fontWeight: 700 }}>
                  Connected as {short}
                </p>
              ) : null)}
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap">
          <div className="fgrid">
            <div>
              <span className="brand" style={{ color: "var(--fg)" }}>
                <Logo size={26} /> Telos
              </span>
              <p style={{ maxWidth: 320 }}>
                Cross-chain yield vault infrastructure.
              </p>
            </div>
            <div>
              <h5>Product</h5>
              <a href="#vaults">Vaults</a>
              <a href="#creators">Creators</a>
              <a href="#launch">Launch</a>
            </div>
            <div>
              <h5>Developers</h5>
              <a href="#network">Architecture</a>
              <a href="#faq">FAQ</a>
            </div>
            <div>
              <h5>Community</h5>
              <a href="#top">Docs (soon)</a>
              <a href="#top">GitHub (soon)</a>
            </div>
          </div>
          <div className="legal">
            © {new Date().getFullYear()} Telos. Testnet software provided as is.
            All yields, TVLs, creators, fees and charts shown are sample data,
            not an offer or financial advice. Third-party protocol names are
            used only to describe example strategy targets and do not imply
            affiliation or endorsement.
          </div>
        </div>
      </footer>
    </div>
  );
}

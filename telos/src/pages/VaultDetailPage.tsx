import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AI_FORUM_POSTS } from "../ai-forum";
import { DEPOSIT_CHAIN } from "../chains";
import { ChainIcon } from "../components/ChainBadge";
import CreatorAvatar from "../components/CreatorAvatar";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import VaultSparkline from "../components/VaultSparkline";
import { useCreatedVaults } from "../custom-contexts/CreatedVaultsContext";
import { useRegistryActionModal } from "../custom-contexts/ModalContext";
import { useTxConfirmer } from "../custom-contexts/TxConfirmerContext";
import {
  LAUNCHPADS,
  creatorIdentity,
  creatorProfilePath,
  creatorRewardLabel,
  formatUsd,
  formatUsdCompact,
  weeklyEarnings,
} from "../vaults";

type Props = {
  ready: boolean;
  authenticated: boolean;
  login: () => void;
  logout: () => void;
  address?: string;
};

function depositToken(name: string, asset: string): string {
  return (
    name.match(/USDC|USDT|WETH|ETH|DAI|WBTC|sUSDe|ARB/i)?.[0]?.toUpperCase() ??
    (asset.length <= 5 ? asset.toUpperCase() : "USDC")
  );
}

function shortAddress(value: string): string {
  return value.length > 14 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

export default function VaultDetailPage({
  ready,
  authenticated,
  login,
  logout,
  address,
}: Props) {
  const { vaultId } = useParams<{ vaultId: string }>();
  const { allVaults, createdVaults } = useCreatedVaults();
  const { setOpen } = useRegistryActionModal();
  const { confirmTx } = useTxConfirmer();
  const [copied, setCopied] = useState(false);

  const vault = allVaults.find(
    (item) => item.id.toLowerCase() === (vaultId ?? "").toLowerCase(),
  );

  if (!vault) {
    return (
      <div className="page">
        <Navbar
          ready={ready}
          authenticated={authenticated}
          login={login}
          logout={logout}
          address={address}
        />
        <main className="wrap">
          <section className="section">
            <div className="empty">
              <b>Vault not found.</b>
              <p className="note">
                The registry has no file for <code>{vaultId}</code>. It may have
                been removed, or the link is wrong.
              </p>
              <Link className="btn" to="/vaults">
                ← Back to all vaults
              </Link>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  const own = createdVaults.some((item) => item.id === vault.id);
  const hasApy = vault.apy > 0;
  const weekly = weeklyEarnings(vault.apy);
  const launchpadItems = (vault.launchpads ?? [])
    .map((id) => LAUNCHPADS.find((item) => item.id === id))
    .filter((item): item is (typeof LAUNCHPADS)[number] => Boolean(item));
  const launchpadNames =
    launchpadItems.map((item) => `${item.emoji} ${item.name}`).join(" · ") ||
    "—";
  const thesisPost = AI_FORUM_POSTS.find((post) => post.vaultId === vault.id);

  const handleDeposit = () => {
    void confirmTx({
      kind: "deposit",
      chains: [DEPOSIT_CHAIN],
      deposit: {
        vaultName: vault.name,
        token: depositToken(vault.name, vault.asset),
        apy: vault.apy,
        fee: vault.fee,
        vaultChain: vault.chain,
      },
      note: `Deposits settle on ${DEPOSIT_CHAIN}. Testnet only — no assets are transferred in this build.`,
    });
  };

  const handleCopyContract = async () => {
    if (!vault.contractCode) return;
    try {
      await navigator.clipboard.writeText(vault.contractCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="page">
      <Navbar
        ready={ready}
        authenticated={authenticated}
        login={login}
        logout={logout}
        address={address}
      />

      <main className="wrap">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/vaults">Vaults</Link>
          <span aria-hidden="true">/</span>
          <span>{vault.id}</span>
        </nav>

        <section className="vault-detail-hero">
          <div className="vault-detail-title">
            <span className="vault-glyph vault-glyph--lg" aria-hidden="true">
              {vault.asset}
            </span>
            <div>
              <div className="vault-detail-badges">
                <span className={`vault-status vault-status--${vault.status ?? "live"}`}>
                  {own ? "YOUR VAULT" : (vault.status ?? "live").toUpperCase()}
                </span>
                <span className="sample-tag">
                  {vault.kind === "ready" ? "READY-MADE" : "CUSTOM"}
                </span>
                <span className="sample-tag">{vault.risk} RISK</span>
              </div>
              <h1>{vault.name}</h1>
              <p className="vault-detail-sub">
                {vault.proto ? `VIA ${vault.proto}` : "CREATOR STRATEGY"} ·{" "}
                {vault.chains.length} EVM{" "}
                {vault.chains.length === 1 ? "CHAIN" : "CHAINS"}
              </p>
              <Link className="vault-creator-chip" to={creatorProfilePath(vault)}>
                <CreatorAvatar address={creatorIdentity(vault)} size={24} />
                <span>
                  <b>{vault.creator}</b>
                  <small>VIEW CREATOR PROFILE</small>
                </span>
              </Link>
            </div>
          </div>

          <div className="vault-detail-actions">
            <button type="button" className="btn" onClick={handleDeposit}>
              ↓ Deposit
            </button>
            <button
              type="button"
              className="btn btn-plain"
              onClick={() => setOpen(true)}
            >
              ＋ Create a vault
            </button>
          </div>
        </section>

        <p className="vault-detail-desc">{vault.description}</p>

        <dl className="vault-detail-stats">
          <div>
            <dt>NET APY</dt>
            <dd className="lime">{hasApy ? `${vault.apy.toFixed(1)}%` : "—"}</dd>
            <span>{hasApy ? "sample / non-compounded" : "awaiting live data"}</span>
          </div>
          <div>
            <dt>WEEKLY EARNINGS</dt>
            <dd>{hasApy ? formatUsd(weekly, 2) : "—"}</dd>
            <span>estimate on $1,000</span>
          </div>
          <div>
            <dt>TOTAL VALUE LOCKED</dt>
            <dd>{formatUsdCompact(vault.tvlUsd)}</dd>
            <span>sample TVL</span>
          </div>
          <div>
            <dt>CREATOR FEE</dt>
            <dd>{vault.fee}%</dd>
            <span>of gross yield</span>
          </div>
          <div>
            <dt>RISK CLASS</dt>
            <dd className={`vault-risk vault-risk--${vault.risk.toLowerCase()}`}>
              <i aria-hidden="true" />
              {vault.risk}
            </dd>
            <span>registry label</span>
          </div>
          <div>
            <dt>CHAINS AVAILABLE</dt>
            <dd>{vault.chains.length}</dd>
            <span>all EVM deployment targets</span>
          </div>
        </dl>

        <div className="vault-detail-grid">
          <section className="panel" aria-labelledby="vault-strategy-heading">
            <div className="vault-panel-head">
              <h2 id="vault-strategy-heading">Current strategy</h2>
              <span className="sample-tag">{vault.strategy.toUpperCase()}</span>
            </div>
            <p className="vault-strategy-name">{vault.strategySummary}</p>

            {vault.allocations?.length ? (
              <div className="vault-allocations">
                {vault.allocations.map((allocation) => (
                  <div
                    className="vault-allocation"
                    key={`${allocation.label}-${allocation.pct}`}
                  >
                    <div>
                      <span>{allocation.label}</span>
                      <b>{allocation.pct}%</b>
                    </div>
                    <div className="vault-bar">
                      <i style={{ width: `${allocation.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="note">
                No allocation sleeves are published for this vault yet.
              </p>
            )}

            <div className="vault-panel-head vault-panel-head--spaced">
              <span className="vault-label">APY HISTORY / SAMPLE</span>
              <span className="vault-label">10 OBSERVATIONS</span>
            </div>
            <VaultSparkline
              data={vault.h}
              label={`${vault.name} sample APY history`}
              height={72}
            />

            {vault.contractCode ? (
              <details className="vault-contract">
                <summary>
                  <span>CONTRACT SOURCE</span>
                  <span>
                    {vault.contractName ?? "Strategy.sol"} ·{" "}
                    {vault.contractCode.split("\n").length} LINES
                  </span>
                </summary>
                <div className="vault-contract-actions">
                  <button
                    type="button"
                    className="btn btn-plain btn-sm"
                    onClick={() => void handleCopyContract()}
                  >
                    {copied ? "COPIED ✓" : "COPY CONTRACT"}
                  </button>
                </div>
                <pre className="code-block">
                  <code>{vault.contractCode}</code>
                </pre>
              </details>
            ) : (
              <p className="note">
                No contract source attached. Sample registry vaults reference
                their adapter; vaults created from the strategy lab store the
                generated Solidity here.
              </p>
            )}
          </section>

          <aside className="vault-detail-side">
            <section className="panel" aria-labelledby="vault-chains-heading">
              <div className="vault-panel-head">
                <h2 id="vault-chains-heading">Chains available</h2>
                <span className="sample-tag">{vault.chains.length} EVM</span>
              </div>
              <div
                className={`vault-chain-list${
                  vault.chains.length > 8 ? " vault-chain-list--dense" : ""
                }`}
              >
                {vault.chains.map((chain) => (
                  <div className="vault-chain-row" key={chain}>
                    <ChainIcon name={chain} size={16} />
                    <span>{chain}</span>
                    <b>LIVE</b>
                  </div>
                ))}
              </div>
              <p className="field-hint">
                Telos deploys the same vault registry entry across every
                supported EVM network. Cross-chain accounting settles at each
                harvest.
              </p>
            </section>

            <section className="panel deposit-route" aria-labelledby="vault-route-heading">
              <div className="vault-panel-head">
                <h2 id="vault-route-heading">Deposit route</h2>
                <span className="sample-tag">ONE CHAIN IN</span>
              </div>
              <div className="deposit-route-rows">
                <div className="deposit-route-row">
                  <ChainIcon name={DEPOSIT_CHAIN} size={16} />
                  <span>Deposit chain</span>
                  <b>{DEPOSIT_CHAIN}</b>
                </div>
                <div className="deposit-route-row">
                  <ChainIcon name={vault.chain} size={16} />
                  <span>Strategy chain</span>
                  <b>{vault.chain}</b>
                </div>
              </div>
              <p className="field-hint">
                You deposit once on {DEPOSIT_CHAIN}. Telos routes the strategy
                across every supported chain, so one balance reaches every-chain
                yield.
              </p>
            </section>

            <section className="panel" aria-labelledby="vault-thesis-heading">
              <div className="vault-panel-head">
                <h2 id="vault-thesis-heading">Agent thesis</h2>
                <span className="sample-tag">AI FORUM</span>
              </div>
              <p className="field-hint">
                {thesisPost
                  ? `“${thesisPost.title}” — ${thesisPost.agent} explains the ${thesisPost.decision.toLowerCase()} decision.`
                  : "No forum thread is attached to this vault yet. Agent theses are posted before each move."}
              </p>
              <Link className="btn btn-plain btn-sm" to="/forums">
                {thesisPost ? "Read the full thesis →" : "Browse AI Forums →"}
              </Link>
            </section>

            <section className="panel token-features" aria-labelledby="vault-features-heading">
              <div className="vault-panel-head">
                <h2 id="vault-features-heading">Token features</h2>
                <span className="sample-tag">ONCHAIN</span>
              </div>
              <div className="token-feature-list">
                <div className="token-feature-row">
                  <span className="token-feature-icon" aria-hidden="true">
                    🥩
                  </span>
                  <div>
                    <b>Stake vault shares</b>
                    <span>
                      {vault.stakeEnabled
                        ? "Holders can stake this vault token to compound yield."
                        : "Share staking is not enabled for this vault."}
                    </span>
                  </div>
                  <span
                    className={`token-feature-state${
                      vault.stakeEnabled ? " is-on" : ""
                    }`}
                  >
                    {vault.stakeEnabled ? "READY" : "OFF"}
                  </span>
                </div>
                {vault.showCreatorRewards ? (
                  <div className="token-feature-row">
                    <span className="token-feature-icon" aria-hidden="true">
                      🎁
                    </span>
                    <div>
                      <b>Creator rewards</b>
                      <span>{creatorRewardLabel(vault.creatorRewards)}</span>
                    </div>
                    <span className="token-feature-state is-on">SHOWN</span>
                  </div>
                ) : null}
              </div>
              <p className="field-hint">
                Features are set when the vault is created and can be surfaced
                or hidden from the vault page.
              </p>
            </section>

            <section className="panel" aria-labelledby="vault-registry-heading">
              <div className="vault-panel-head">
                <h2 id="vault-registry-heading">Vault file</h2>
                <span className="sample-tag">{vault.id}</span>
              </div>
              <dl className="vault-file-rows">
                <div>
                  <dt>ID</dt>
                  <dd>{vault.id}</dd>
                </div>
                <div>
                  <dt>CREATOR</dt>
                  <dd>
                    <Link
                      className="vault-file-creator"
                      to={creatorProfilePath(vault)}
                    >
                      <CreatorAvatar address={creatorIdentity(vault)} size={18} />
                      {vault.creator}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt>PRIMARY CHAIN</dt>
                  <dd>{vault.chain}</dd>
                </div>
                <div>
                  <dt>CREATED</dt>
                  <dd>{vault.createdAt ?? "—"}</dd>
                </div>
                <div>
                  <dt>LAUNCHPADS</dt>
                  <dd>{launchpadNames}</dd>
                </div>
                {launchpadItems.length ? (
                  <div>
                    <dt>LISTINGS</dt>
                    <dd className="launchpad-mini-list">
                      {launchpadItems.map((item) => (
                        <span className="launchpad-mini" key={item.id}>
                          <img
                            className={`launchpad-logo launchpad-logo--${item.id}`}
                            src={item.logo}
                            alt=""
                            width={18}
                            height={18}
                            loading="lazy"
                          />
                          {item.chain}
                        </span>
                      ))}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt>CREATOR REWARDS</dt>
                  <dd>{creatorRewardLabel(vault.creatorRewards)}</dd>
                </div>
                <div>
                  <dt>ADDRESSES</dt>
                  <dd>
                    {vault.addresses?.length ? (
                      <span className="address-list">
                        {vault.addresses.map((item) => (
                          <code key={item} title={item}>
                            {shortAddress(item)}
                          </code>
                        ))}
                      </span>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>

        <p className="note">
          Sample data for design preview. APY, TVL and weekly earnings are
          illustrative, not live yields. Nothing here is an offer or financial
          advice. Verify the contract address and source before depositing.
        </p>
      </main>

      <Footer />
    </div>
  );
}

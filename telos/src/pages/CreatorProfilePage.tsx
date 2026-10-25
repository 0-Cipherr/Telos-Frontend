import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CreatorAvatar from "../components/CreatorAvatar";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import VaultTile from "../components/VaultTile";
import { useCreatedVaults } from "../custom-contexts/CreatedVaultsContext";
import { useRegistryActionModal } from "../custom-contexts/ModalContext";
import {
  annualCreatorEarnings,
  creatorIdentity,
  creatorRewardLabel,
  formatUsd,
  formatUsdCompact,
  shortAddress,
  type Vault,
} from "../vaults";

type Props = {
  ready: boolean;
  authenticated: boolean;
  login: () => void;
  logout: () => void;
  address?: string;
};

function normalize(value: string): string {
  try {
    return decodeURIComponent(value).trim().toLowerCase();
  } catch {
    return value.trim().toLowerCase();
  }
}

function creatorMatches(target: string, vault: Vault): boolean {
  const full = normalize(creatorIdentity(vault));
  const display = normalize(vault.creator);
  const short = normalize(shortAddress(target));
  return full === target || display === target || display === short || full === short;
}

function isFullAddress(value: string): boolean {
  return /^0x[a-f0-9]{40}$/i.test(value);
}

export default function CreatorProfilePage({
  ready,
  authenticated,
  login,
  logout,
  address,
}: Props) {
  const { address: routeAddress } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const { allVaults, createdVaults } = useCreatedVaults();
  const { setOpen } = useRegistryActionModal();
  const [copied, setCopied] = useState(false);

  const target = normalize(routeAddress ?? "");
  const creatorVaults = useMemo(
    () => allVaults.filter((vault) => creatorMatches(target, vault)),
    [allVaults, target],
  );

  const displayAddress =
    creatorVaults.find((vault) => vault.creatorAddress)?.creatorAddress ??
    (isFullAddress(target) ? target : creatorVaults[0]?.creator ?? routeAddress ?? "");

  const stats = useMemo(() => {
    const chains = new Set(creatorVaults.flatMap((vault) => vault.chains));
    const tvl = creatorVaults.reduce((sum, vault) => sum + vault.tvlUsd, 0);
    const annual = creatorVaults.reduce(
      (sum, vault) => sum + annualCreatorEarnings(vault),
      0,
    );
    return {
      chains: chains.size,
      tvl,
      annual,
      weekly: annual / 52,
      live: creatorVaults.filter((vault) => vault.status === "live").length,
    };
  }, [creatorVaults]);

  const createdIds = useMemo(
    () => new Set(createdVaults.map((vault) => vault.id)),
    [createdVaults],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayAddress);
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
        <section className="page-hero creator-hero">
          <div className="page-eyebrow">
            <span className="sample-tag">CREATOR PROFILE</span>
            <span className="page-rule" aria-hidden="true" />
            <span>REGISTRY CREATOR</span>
          </div>

          <div className="creator-hero-id">
            <CreatorAvatar
              address={displayAddress || target}
              size={96}
              className="creator-hero-avatar"
            />
            <div className="creator-hero-copy">
              <h1>{displayAddress ? shortAddress(displayAddress, 8, 6) : "Unknown creator"}</h1>
              <p className="tagline page-lede">
                Vaults created by this address, the yield they have generated,
                and the creator rewards routed to them.
              </p>
              <div className="creator-address-row">
                <code>{displayAddress || "no address"}</code>
                <button
                  type="button"
                  className="btn btn-plain btn-sm"
                  onClick={() => void handleCopy()}
                  disabled={!displayAddress}
                >
                  {copied ? "COPIED ✓" : "COPY ADDRESS"}
                </button>
              </div>
            </div>
          </div>

          <dl className="page-stats">
            <div>
              <dt>VAULTS CREATED</dt>
              <dd>{String(creatorVaults.length).padStart(2, "0")}</dd>
            </div>
            <div>
              <dt>LIVE VAULTS</dt>
              <dd>{String(stats.live).padStart(2, "0")}</dd>
            </div>
            <div>
              <dt>TOTAL TVL</dt>
              <dd>{formatUsdCompact(stats.tvl)}</dd>
            </div>
            <div>
              <dt>CREATOR EARNINGS / YR</dt>
              <dd className="lime">{formatUsd(stats.annual, 2)}</dd>
            </div>
          </dl>

          <div className="page-actions">
            <button type="button" className="btn" onClick={() => setOpen(true)}>
              ＋ Create a vault
            </button>
            <button
              type="button"
              className="btn btn-plain"
              onClick={() => navigate("/vaults")}
            >
              Browse all vaults →
            </button>
          </div>
        </section>

        <section className="section" aria-labelledby="creator-vaults-heading">
          <div className="section-title">
            <h2 id="creator-vaults-heading">Vaults by this creator</h2>
            <span className="sample-tag">ONCHAIN REGISTRY</span>
          </div>

          {creatorVaults.length > 0 ? (
            <div className="allvaults-grid">
              {creatorVaults.map((vault) => (
                <VaultTile
                  key={vault.id}
                  vault={vault}
                  own={createdIds.has(vault.id)}
                />
              ))}
            </div>
          ) : (
            <div className="empty" role="status">
              <b>No vaults found for this address.</b>
              <p className="note">
                This creator has not registered a vault yet. If this is your
                address, create a vault and it will show up here with its
                earnings.
              </p>
              <button type="button" className="btn" onClick={() => setOpen(true)}>
                ＋ Create a vault
              </button>
            </div>
          )}
        </section>

        <section className="section" aria-labelledby="creator-earnings-heading">
          <div className="section-title">
            <h2 id="creator-earnings-heading">Creator earnings</h2>
            <span className="sample-tag">ESTIMATED</span>
          </div>

          <div className="creator-earnings">
            <div className="creator-earnings-head">
              <span>VAULT</span>
              <span>TVL</span>
              <span>APY</span>
              <span>FEE</span>
              <span>REWARDS</span>
              <span>PER YEAR</span>
              <span>PER WEEK</span>
            </div>
            {creatorVaults.length > 0 ? (
              creatorVaults.map((vault) => {
                const annual = annualCreatorEarnings(vault);
                return (
                  <div className="creator-earnings-row" key={vault.id}>
                    <span className="creator-earnings-vault">
                      <Link to={`/vaults/${vault.id}`}>{vault.name}</Link>
                      <span>{vault.id}</span>
                    </span>
                    <span>{formatUsdCompact(vault.tvlUsd)}</span>
                    <span>{vault.apy > 0 ? `${vault.apy.toFixed(1)}%` : "—"}</span>
                    <span>{vault.fee}%</span>
                    <span className="creator-earnings-reward">
                      {creatorRewardLabel(vault.creatorRewards)}
                    </span>
                    <b className="lime">{formatUsd(annual, 2)}</b>
                    <b>{formatUsd(annual / 52, 2)}</b>
                  </div>
                );
              })
            ) : (
              <div className="creator-earnings-empty">
                No vaults, so no creator rewards yet.
              </div>
            )}
            <div className="creator-earnings-total">
              <span>TOTAL</span>
              <span>{formatUsdCompact(stats.tvl)}</span>
              <span>—</span>
              <span>—</span>
              <span>—</span>
              <b className="lime">{formatUsd(stats.annual, 2)}</b>
              <b>{formatUsd(stats.weekly, 2)}</b>
            </div>
          </div>

          <p className="note">
            Creator earnings are a simple estimate: TVL × APY × creator fee.
            They are not live revenue and this is not financial advice. Deposits
            settle on Robinhood Testnet while strategies can deploy on any
            supported EVM chain.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

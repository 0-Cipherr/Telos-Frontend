import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import CreatorAvatar from "../components/CreatorAvatar";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import VaultTile from "../components/VaultTile";
import { useCreatedVaults } from "../custom-contexts/CreatedVaultsContext";
import { useRegistryActionModal } from "../custom-contexts/ModalContext";
import {
  annualCreatorEarnings,
  creatorIdentity,
  formatUsd,
  formatUsdCompact,
  median,
  type VaultKind,
  type VaultRisk,
} from "../vaults";
import { EVM_CHAIN_NAMES } from "../chains";

type Props = {
  ready: boolean;
  authenticated: boolean;
  login: () => void;
  logout: () => void;
  address?: string;
};

type SortKey = "tvl" | "apy" | "fee" | "newest";

const KIND_OPTIONS: Array<{ value: "all" | VaultKind; label: string }> = [
  { value: "all", label: "All vaults" },
  { value: "ready", label: "Ready-made" },
  { value: "custom", label: "Custom" },
];

const RISK_OPTIONS: Array<{ value: "all" | VaultRisk; label: string }> = [
  { value: "all", label: "All risk" },
  { value: "LOW", label: "Low risk" },
  { value: "MEDIUM", label: "Medium risk" },
  { value: "HIGH", label: "High risk" },
];

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "tvl", label: "Sort: TVL" },
  { value: "apy", label: "Sort: APY" },
  { value: "fee", label: "Sort: Fee" },
  { value: "newest", label: "Sort: Newest" },
];

export default function VaultsPage({
  ready,
  authenticated,
  login,
  logout,
  address,
}: Props) {
  const navigate = useNavigate();
  const { allVaults, createdVaults } = useCreatedVaults();
  const { setOpen } = useRegistryActionModal();
  const [query, setQuery] = useState("");
  const [chain, setChain] = useState("all");
  const [kind, setKind] = useState<"all" | VaultKind>("all");
  const [risk, setRisk] = useState<"all" | VaultRisk>("all");
  const [sort, setSort] = useState<SortKey>("tvl");

  const createdIds = useMemo(
    () => new Set(createdVaults.map((vault) => vault.id)),
    [createdVaults],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const result = allVaults.filter((vault) => {
      if (kind !== "all" && vault.kind !== kind) return false;
      if (risk !== "all" && vault.risk !== risk) return false;
      if (chain !== "all" && !vault.chains.includes(chain)) return false;
      if (!needle) return true;
      return [
        vault.id,
        vault.name,
        vault.asset,
        vault.chain,
        vault.chains.join(" "),
        vault.proto ?? "",
        vault.strategy,
        vault.description,
        vault.creator,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });

    return [...result].sort((a, b) => {
      switch (sort) {
        case "apy":
          return b.apy - a.apy;
        case "fee":
          return a.fee - b.fee;
        case "newest":
          return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
        case "tvl":
        default:
          return b.tvlUsd - a.tvlUsd;
      }
    });
  }, [allVaults, chain, kind, query, risk, sort]);

  const notes = useMemo(() => {
    const chains = new Set(allVaults.flatMap((vault) => vault.chains));
    const totalTvl = allVaults.reduce((sum, vault) => sum + vault.tvlUsd, 0);
    return {
      chains: chains.size,
      totalTvl,
      medianApy: median(allVaults.map((vault) => vault.apy).filter(Boolean)),
    };
  }, [allVaults]);

  const creators = useMemo(() => {
    const map = new Map<
      string,
      {
        identity: string;
        display: string;
        vaults: number;
        tvl: number;
        earnings: number;
      }
    >();

    for (const vault of allVaults) {
      const identity = creatorIdentity(vault);
      const key = identity.toLowerCase();
      const entry =
        map.get(key) ??
        {
          identity,
          display: vault.creator,
          vaults: 0,
          tvl: 0,
          earnings: 0,
        };
      entry.vaults += 1;
      entry.tvl += vault.tvlUsd;
      entry.earnings += annualCreatorEarnings(vault);
      map.set(key, entry);
    }

    return [...map.values()].sort((a, b) => b.tvl - a.tvl).slice(0, 6);
  }, [allVaults]);

  const resetFilters = () => {
    setQuery("");
    setChain("all");
    setKind("all");
    setRisk("all");
    setSort("tvl");
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
        <section className="page-hero">
          <div className="page-eyebrow">
            <span className="sample-tag">VAULT INDEX / ALL EVM</span>
            <span className="page-rule" aria-hidden="true" />
            <span>REGISTRY V.01</span>
          </div>
          <h1>
            Every vault, <span className="lime-text">every chain.</span>
          </h1>
          <p className="tagline page-lede">
            Browse the full Telos registry across every supported EVM network.
            Each file shows APY, weekly earnings, the live strategy, the
            available chains and the full contract source when one is attached.
            Deposits settle on Robinhood Testnet; the strategy can deploy on any
            chain.
          </p>
          <div className="page-actions">
            <button
              type="button"
              className="btn"
              onClick={() => setOpen(true)}
            >
              ＋ Create a vault
            </button>
            <button
              type="button"
              className="btn btn-plain"
              onClick={() => navigate("/forums")}
            >
              ✦ Read AI theses
            </button>
            <button
              type="button"
              className="btn btn-plain"
              onClick={() => navigate("/")}
            >
              ← Back home
            </button>
          </div>

          <dl className="page-stats">
            <div>
              <dt>VAULTS</dt>
              <dd>{String(allVaults.length).padStart(2, "0")}</dd>
            </div>
            <div>
              <dt>EVM CHAINS LIVE</dt>
              <dd>{notes.chains}</dd>
            </div>
            <div>
              <dt>MEDIAN APY</dt>
              <dd className="lime">{notes.medianApy.toFixed(1)}%</dd>
            </div>
            <div>
              <dt>TOTAL TVL</dt>
              <dd>{formatUsdCompact(notes.totalTvl)}</dd>
            </div>
          </dl>
        </section>

        <section className="section" id="creators" aria-labelledby="creators-heading">
          <div className="section-title">
            <h2 id="creators-heading">Creators</h2>
            <span className="sample-tag">PFPS GENERATED FROM ADDRESS</span>
          </div>
          <div className="creator-strip">
            {creators.map((creator) => (
              <Link
                key={creator.identity}
                className="creator-card"
                to={`/creators/${encodeURIComponent(creator.identity)}`}
              >
                <CreatorAvatar address={creator.identity} size={42} />
                <span className="creator-card-copy">
                  <b>{creator.display}</b>
                  <span>
                    {creator.vaults} {creator.vaults === 1 ? "vault" : "vaults"} ·{" "}
                    {formatUsdCompact(creator.tvl)} TVL
                  </span>
                  <span className="creator-card-earn">
                    {formatUsd(creator.earnings, 2)}/yr creator rewards
                  </span>
                </span>
                <span className="creator-card-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section" aria-labelledby="vault-index-heading">
          <div className="section-title">
            <h2 id="vault-index-heading">Registry</h2>
            <span className="sample-tag">SAMPLE DATA</span>
          </div>

          <div className="vault-index-controls">
            <div className="vault-index-search">
              <span aria-hidden="true">&gt;</span>
              <input
                className="input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search vault, chain, protocol, strategy…"
                aria-label="Search vaults"
              />
            </div>
            <label className="vault-index-field">
              <span>NETWORK</span>
              <select
                className="input"
                value={chain}
                onChange={(event) => setChain(event.target.value)}
              >
                <option value="all">All EVM chains</option>
                {EVM_CHAIN_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="vault-index-field">
              <span>TYPE</span>
              <select
                className="input"
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as "all" | VaultKind)
                }
              >
                {KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="vault-index-field">
              <span>RISK</span>
              <select
                className="input"
                value={risk}
                onChange={(event) =>
                  setRisk(event.target.value as "all" | VaultRisk)
                }
              >
                {RISK_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="vault-index-field">
              <span>ORDER</span>
              <select
                className="input"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="vault-results">
            <span aria-live="polite">
              SHOWING {String(filtered.length).padStart(2, "0")} /{" "}
              {String(allVaults.length).padStart(2, "0")}
            </span>
            <span>
              {chain === "all" ? "ALL EVM NETWORKS" : chain.toUpperCase()}
            </span>
          </div>

          {filtered.length > 0 ? (
            <div className="allvaults-grid">
              {filtered.map((vault) => (
                <VaultTile
                  key={vault.id}
                  vault={vault}
                  own={createdIds.has(vault.id)}
                />
              ))}
            </div>
          ) : (
            <div className="empty" role="status">
              <b>No vaults match this query.</b>
              <p className="note">
                Clear the filters to return to the full index. New listings
                appear here as soon as the registry reports them.
              </p>
              <button type="button" className="btn" onClick={resetFilters}>
                Reset filters ↺
              </button>
            </div>
          )}

          <p className="note">
            Sample data for design preview. Protocol names describe example
            strategy targets, not official integrations or partnerships. Every
            EVM network listed is a deployment target; weekly earnings are a
            simple non-compounded estimate on a $1,000 deposit. Not live yields,
            not financial advice.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

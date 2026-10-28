import { useMemo, useState, type ReactNode } from "react";
import DeedBuyModal from "../components/DeedBuyModal";
import DeedCard from "../components/DeedCard";
import DeedKeyIcon from "../components/DeedKeyIcon";
import DeedListModal from "../components/DeedListModal";
import OwnedDeedCard from "../components/OwnedDeedCard";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { useCreatedVaults } from "../custom-contexts/CreatedVaultsContext";
import { useDeedMarket } from "../custom-contexts/DeedMarketContext";
import { useRegistryActionModal } from "../custom-contexts/ModalContext";
import {
  DEMO_DEED_TRADER,
  ETH_USD_REFERENCE,
  deedStockSymbol,
  formatEth,
  isPonsDeedVault,
  type DeedListing,
} from "../deeds";
import {
  annualCreatorEarnings,
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
  /** Wallet-less preview mode uses a local demo trader identity. */
  preview?: boolean;
};

type BuyTarget = {
  listing: DeedListing;
  vault: Vault;
};

type DeedSort = "fees" | "price-asc" | "price-desc" | "apy" | "newest";
type DeedView = "all" | "owned";

const SORT_OPTIONS: Array<{ value: DeedSort; label: string }> = [
  { value: "fees", label: "Highest fee stream" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "apy", label: "Highest APY" },
  { value: "newest", label: "Newest listing" },
];

function matchesDeed(
  vault: Vault,
  listing: DeedListing | undefined,
  needle: string,
  stock: string,
): boolean {
  if (stock !== "all" && deedStockSymbol(vault) !== stock) return false;
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
    deedStockSymbol(vault) ?? "",
    listing?.id ?? "",
    listing?.seller ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

function sortDeedItems<T extends { vault: Vault; listing?: DeedListing }>(
  items: T[],
  sort: DeedSort,
): T[] {
  return [...items].sort((a, b) => {
    const aPrice = a.listing
      ? Number.parseFloat(a.listing.priceEth)
      : 0;
    const bPrice = b.listing
      ? Number.parseFloat(b.listing.priceEth)
      : 0;

    switch (sort) {
      case "price-asc":
        return aPrice - bPrice;
      case "price-desc":
        return bPrice - aPrice;
      case "apy":
        return b.vault.apy - a.vault.apy;
      case "newest":
        return String(
          b.listing?.createdAt ?? b.vault.createdAt ?? "",
        ).localeCompare(
          String(a.listing?.createdAt ?? a.vault.createdAt ?? ""),
        );
      case "fees":
      default:
        return (
          annualCreatorEarnings(b.vault) -
          annualCreatorEarnings(a.vault)
        );
    }
  });
}

function SearchIcon() {
  return (
    <svg
      className="deed-search__icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="m16.5 16.5 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DeedEmptyState({
  title,
  copy,
  actions,
}: {
  title: string;
  copy: string;
  actions: ReactNode;
}) {
  return (
    <div className="deed-empty-state">
      <span className="deed-empty-state__icon">
        <DeedKeyIcon size={46} />
      </span>
      <h2>{title}</h2>
      <p>{copy}</p>
      <div className="deed-empty-state__actions">{actions}</div>
    </div>
  );
}

export default function DeedsPage({
  ready,
  authenticated,
  login,
  logout,
  address,
  preview = false,
}: Props) {
  const { allVaults, createdVaults } = useCreatedVaults();
  const { listings, ownership, cancelListing } = useDeedMarket();
  const { setOpen } = useRegistryActionModal();
  const [query, setQuery] = useState("");
  const [stock, setStock] = useState("all");
  const [sort, setSort] = useState<DeedSort>("fees");
  const [view, setView] = useState<DeedView>("all");
  const [buyTarget, setBuyTarget] = useState<BuyTarget | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [listVaultId, setListVaultId] = useState<string | null>(null);

  /** Preview mode gets a demo trader so the full loop is clickable. */
  const traderAddress =
    address ?? (preview ? DEMO_DEED_TRADER : undefined);

  const market = useMemo(() => {
    const vaultMap = new Map(allVaults.map((vault) => [vault.id, vault]));
    return listings.flatMap((listing) => {
      const vault = vaultMap.get(listing.vaultId);
      if (!vault || !isPonsDeedVault(vault)) return [];
      return [{ listing, vault }];
    });
  }, [allVaults, listings]);

  const owners = useMemo(
    () =>
      new Set(
        market.map(({ listing }) => listing.sellerAddress ?? listing.seller),
      ).size,
    [market],
  );

  const stocks = useMemo(
    () =>
      [
        ...new Set(
          market
            .map(({ vault }) => deedStockSymbol(vault))
            .filter((symbol): symbol is string => Boolean(symbol)),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [market],
  );

  const bannerTickers = useMemo(() => {
    const pool = stocks.length ? stocks : ["PONS"];
    return Array.from({ length: 4 }, () => pool).flat();
  }, [stocks]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sortDeedItems(
      market.filter(({ vault, listing }) =>
        matchesDeed(vault, listing, needle, stock),
      ),
      sort,
    );
  }, [market, query, sort, stock]);

  const floor = useMemo(
    () =>
      market.reduce((minimum, { listing }) => {
        const value = Number.parseFloat(listing.priceEth);
        return Number.isFinite(value) ? Math.min(minimum, value) : minimum;
      }, Number.POSITIVE_INFINITY),
    [market],
  );

  const totalFeeStream = useMemo(
    () =>
      market.reduce(
        (sum, { vault }) => sum + annualCreatorEarnings(vault),
        0,
      ),
    [market],
  );

  const ownedVaults = useMemo(() => {
    if (!traderAddress) return [];
    const current = traderAddress.toLowerCase();
    const createdIds = new Set(createdVaults.map((vault) => vault.id));

    return allVaults.filter((vault) => {
      if (!isPonsDeedVault(vault)) return false;
      const deed = ownership[vault.id];
      if (deed) return deed.owner.toLowerCase() === current;
      return (
        createdIds.has(vault.id) ||
        vault.creatorAddress?.toLowerCase() === current
      );
    });
  }, [allVaults, createdVaults, ownership, traderAddress]);

  const ownerItems = useMemo(
    () =>
      ownedVaults.map((vault) => ({
        vault,
        listing: listings.find(
          (listing) => listing.vaultId === vault.id,
        ),
      })),
    [listings, ownedVaults],
  );

  const filteredOwned = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sortDeedItems(
      ownerItems.filter(({ vault, listing }) =>
        matchesDeed(vault, listing, needle, stock),
      ),
      sort,
    );
  }, [ownerItems, query, sort, stock]);

  const listableVaults = useMemo(
    () =>
      ownedVaults.filter(
        (vault) => !listings.some((listing) => listing.vaultId === vault.id),
      ),
    [listings, ownedVaults],
  );

  const resetFilters = () => {
    setQuery("");
    setStock("all");
    setSort("fees");
  };

  const openList = (vaultId?: string) => {
    if (!traderAddress) {
      login();
      return;
    }
    setListVaultId(vaultId ?? null);
    setListOpen(true);
  };

  const handleCancel = (listing: DeedListing, vault: Vault) => {
    if (!window.confirm(`Cancel the deed listing for ${vault.name}?`)) return;
    cancelListing(listing.id);
  };

  const openCreate = () => {
    setOpen(true);
  };

  return (
    <div className="page page--deeds">
      <Navbar
        ready={ready}
        authenticated={authenticated}
        login={login}
        logout={logout}
        address={address}
      />

      <main className="wrap deeds-wrap">
        <section className="deed-collection" aria-labelledby="deeds-title">
          <div className="deed-banner" aria-hidden="true">
            <span className="deed-banner__label">
              PONS · STOCK-PAIRED FEE DEEDS
            </span>
            <DeedKeyIcon size={220} className="deed-banner__mark" />
            <span className="deed-banner__stamp">TRANSFERABLE</span>
            <div className="deed-banner__ticker">
              {bannerTickers.map((symbol, index) => (
                <span key={`${symbol}-${index}`}>
                  <b>{symbol}</b>
                  <em>stock pair</em>
                </span>
              ))}
            </div>
          </div>

          <div className="deed-collection__head">
            <div className="deed-collection__avatar">
              <img src="/launchpads/pons.png" alt="" loading="lazy" />
            </div>

            <div className="deed-collection__copy">
              <div className="deed-collection__title">
                <h1 id="deeds-title">Telos Deeds</h1>
                <span
                  className="deed-verified"
                  title="Verified collection"
                >
                  ✓
                </span>
              </div>
              <p className="deed-collection__tagline">
                Own the vault. Earn the stock.
              </p>
              <p className="deed-collection__desc">
                A deed is the transferable right to a pons vault&apos;s creator
                fee stream. Pons pays those fees in the vault&apos;s paired
                Robinhood stock, and the deed is yours to hold or resell.
              </p>
              <div className="deed-collection__meta">
                <span className="deed-chain">
                  <i aria-hidden="true" /> Pons
                </span>
                <span>Robinhood Chain</span>
                <span>Fees paid in stock</span>
                <span>{owners} owners</span>
              </div>
            </div>

            <div className="deed-collection__actions">
              <button
                type="button"
                className="btn deed-btn deed-btn--primary"
                onClick={() => openList()}
              >
                List a deed
              </button>
              <button
                type="button"
                className="btn deed-btn deed-btn--ghost"
                onClick={openCreate}
              >
                Create a vault
              </button>
            </div>
          </div>

          <dl className="deed-collection__stats">
            <div>
              <dt>Items</dt>
              <dd>{String(market.length).padStart(2, "0")}</dd>
            </div>
            <div>
              <dt>Stock pairs</dt>
              <dd>{String(stocks.length).padStart(2, "0")}</dd>
            </div>
            <div>
              <dt>Floor price</dt>
              <dd>
                {Number.isFinite(floor) ? formatEth(floor) : "—"}
              </dd>
            </div>
            <div>
              <dt>Fee stream</dt>
              <dd>
                {formatUsdCompact(totalFeeStream)}
                <small>/yr</small>
              </dd>
            </div>
          </dl>

          {preview && !address ? (
            <p className="note deed-preview-note">
              Preview trader <b>{shortAddress(DEMO_DEED_TRADER)}</b> is used so
              the buy and sell loop is clickable. Connect a wallet to trade as
              yourself.
            </p>
          ) : null}
        </section>

        <div className="deed-toolbar">
          <div className="deed-tabs" role="tablist" aria-label="Deed views">
            <button
              type="button"
              role="tab"
              id="deed-tab-all"
              aria-selected={view === "all"}
              aria-controls="deed-panel"
              className={`deed-tab${view === "all" ? " is-active" : ""}`}
              onClick={() => setView("all")}
            >
              All deeds <span>{market.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              id="deed-tab-owned"
              aria-selected={view === "owned"}
              aria-controls="deed-panel"
              className={`deed-tab${view === "owned" ? " is-active" : ""}`}
              onClick={() => setView("owned")}
            >
              Your deeds <span>{ownedVaults.length}</span>
            </button>
          </div>

          <div className="deed-toolbar__controls">
            <label className="deed-search">
              <SearchIcon />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search deeds or stocks"
                aria-label="Search vault deeds"
              />
            </label>

            <label className="deed-select">
              <span className="sr-only">Stock pair</span>
              <select
                value={stock}
                onChange={(event) => setStock(event.target.value)}
              >
                <option value="all">All stocks</option>
                {stocks.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            <label className="deed-select">
              <span className="sr-only">Sort deeds</span>
              <select
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value as DeedSort)
                }
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div
          id="deed-panel"
          role="tabpanel"
          aria-labelledby={`deed-tab-${view}`}
        >
          <div className="deed-results">
            <span aria-live="polite">
              {view === "all"
                ? `${filtered.length} ${
                    filtered.length === 1 ? "deed" : "deeds"
                  }`
                : `${filteredOwned.length} owned`}
            </span>
            <span>
              {view === "all"
                ? "Pons stock pairs · Fees paid in stock"
                : "Creator fee rights · Resell anytime"}
            </span>
          </div>

          {view === "all" ? (
            filtered.length ? (
              <div className="deed-grid">
                {filtered.map(({ listing, vault }) => {
                  const ownListing = Boolean(
                    traderAddress &&
                      listing.sellerAddress &&
                      listing.sellerAddress.toLowerCase() ===
                        traderAddress.toLowerCase(),
                  );
                  return (
                    <DeedCard
                      key={listing.id}
                      listing={listing}
                      vault={vault}
                      ownListing={ownListing}
                      onBuy={(nextListing, nextVault) =>
                        setBuyTarget({
                          listing: nextListing,
                          vault: nextVault,
                        })
                      }
                      onCancel={handleCancel}
                    />
                  );
                })}
              </div>
            ) : (
              <DeedEmptyState
                title="No deeds match this search."
                copy="Try a different stock pair or clear the filters to see every pons fee deed."
                actions={
                  <>
                    <button
                      type="button"
                      className="btn deed-btn deed-btn--primary"
                      onClick={resetFilters}
                    >
                      Clear filters
                    </button>
                    <button
                      type="button"
                      className="btn deed-btn deed-btn--ghost"
                      onClick={() => openList()}
                    >
                      List a deed
                    </button>
                  </>
                }
              />
            )
          ) : !traderAddress ? (
            <DeedEmptyState
              title="Connect a wallet to see your deeds."
              copy="Your purchased and created vault deeds will show up here, ready to hold or list."
              actions={
                <button
                  type="button"
                  className="btn deed-btn deed-btn--primary"
                  onClick={login}
                >
                  Connect wallet
                </button>
              }
            />
          ) : !ownedVaults.length ? (
            <DeedEmptyState
              title="You don't own a pons deed yet."
              copy="Buy a deed to earn a vault's stock-denominated creator fees, or create a pons vault and list the first deed yourself."
              actions={
                <>
                  <button
                    type="button"
                    className="btn deed-btn deed-btn--primary"
                    onClick={() => setView("all")}
                  >
                    Browse deeds
                  </button>
                  <button
                    type="button"
                    className="btn deed-btn deed-btn--ghost"
                    onClick={openCreate}
                  >
                    Create a vault
                  </button>
                </>
              }
            />
          ) : filteredOwned.length ? (
            <div className="deed-grid">
              {filteredOwned.map(({ vault, listing }) => {
                if (listing) {
                  const ownListing = Boolean(
                    listing.sellerAddress &&
                      traderAddress &&
                      listing.sellerAddress.toLowerCase() ===
                        traderAddress.toLowerCase(),
                  );
                  return (
                    <DeedCard
                      key={listing.id}
                      listing={listing}
                      vault={vault}
                      ownListing={ownListing}
                      onBuy={(nextListing, nextVault) =>
                        setBuyTarget({
                          listing: nextListing,
                          vault: nextVault,
                        })
                      }
                      onCancel={handleCancel}
                    />
                  );
                }
                return (
                  <OwnedDeedCard
                    key={vault.id}
                    vault={vault}
                    onList={() => openList(vault.id)}
                  />
                );
              })}
            </div>
          ) : (
            <DeedEmptyState
              title="No owned deeds match this search."
              copy="Clear the filters to see every deed in your portfolio."
              actions={
                <button
                  type="button"
                  className="btn deed-btn deed-btn--primary"
                  onClick={resetFilters}
                >
                  Clear filters
                </button>
              }
            />
          )}

          <p className="deed-disclaimer">
            Deeds are pons stock-paired vault fee rights. Prices are quoted in
            ETH; USD estimates use a fixed {formatUsd(ETH_USD_REFERENCE)}/ETH
            reference, not a live feed. Preview build: deed transfers and fee
            income are simulated; no funds move.
          </p>
        </div>
      </main>

      <Footer />

      {buyTarget ? (
        <DeedBuyModal
          listing={buyTarget.listing}
          vault={buyTarget.vault}
          authenticated={Boolean(traderAddress)}
          address={traderAddress}
          login={login}
          onClose={() => setBuyTarget(null)}
        />
      ) : null}

      {listOpen ? (
        <DeedListModal
          vaults={listableVaults}
          initialVaultId={listVaultId}
          seller={traderAddress ? shortAddress(traderAddress) : "You"}
          sellerAddress={traderAddress}
          onClose={() => {
            setListOpen(false);
            setListVaultId(null);
          }}
          onCreate={() => {
            setListOpen(false);
            setListVaultId(null);
            setOpen(true);
          }}
        />
      ) : null}
    </div>
  );
}

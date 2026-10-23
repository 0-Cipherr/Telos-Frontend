import { useCallback, useMemo, useState } from "react";
import type { Vault, VaultKind, RiskLevel } from "../types";
import { VAULTS } from "../data";
import SectionHead from "./SectionHead";
import VaultCard from "./VaultCard";
import VaultDetails from "./VaultDetails";

type Option<T extends string> = { value: T; label: string };

type FilterGroupProps<T extends string> = {
  legend: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
};

function FilterGroup<T extends string>({
  legend,
  value,
  options,
  onChange,
}: FilterGroupProps<T>) {
  return (
    <fieldset className="tl-filters">
      <legend className="tl-label">{legend}</legend>
      <div className="tl-tabs">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`tl-tab${value === option.value ? " is-active" : ""}`}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const KIND_OPTIONS: readonly Option<"ALL" | VaultKind>[] = [
  { value: "ALL", label: "ALL" },
  { value: "ready", label: "READY-MADE" },
  { value: "custom", label: "CUSTOM" },
];
const CHAIN_OPTIONS: readonly Option<"ALL" | Vault["chain"]>[] = [
  { value: "ALL", label: "ALL" },
  { value: "Base", label: "BASE" },
  { value: "Arbitrum", label: "ARBITRUM" },
];
const RISK_OPTIONS: readonly Option<"ALL" | RiskLevel>[] = [
  { value: "ALL", label: "ALL" },
  { value: "LOW", label: "LOW" },
  { value: "MEDIUM", label: "MED" },
  { value: "HIGH", label: "HIGH" },
];

export default function Marketplace() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"ALL" | VaultKind>("ALL");
  const [chain, setChain] = useState<"ALL" | Vault["chain"]>("ALL");
  const [risk, setRisk] = useState<"ALL" | RiskLevel>("ALL");
  const [selected, setSelected] = useState<Vault | null>(null);

  const closeDetails = useCallback(() => setSelected(null), []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return VAULTS.filter((vault) => {
      if (kind !== "ALL" && vault.kind !== kind) return false;
      if (chain !== "ALL" && vault.chain !== chain) return false;
      if (risk !== "ALL" && vault.risk !== risk) return false;
      if (!needle) return true;
      return [
        vault.id,
        vault.name,
        vault.asset,
        vault.chain,
        vault.proto ?? "",
        vault.strategy,
        vault.creator,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [chain, kind, query, risk]);

  const resetFilters = () => {
    setQuery("");
    setKind("ALL");
    setChain("ALL");
    setRisk("ALL");
  };

  return (
    <section
      id="marketplace"
      className="tl-wrap tl-section"
      aria-labelledby="tl-marketplace-title"
    >
      <SectionHead
        id="tl-marketplace-title"
        index="02"
        kicker="MARKETPLACE / VAULT INDEX"
        title="The vault index."
        lede="Ready-made vaults wrap an existing DeFi strategy. Custom vaults come from independent creators with their own terms. Every file shows the creator and the fee before you allocate."
        meta="09 LISTINGS / SAMPLE DATA"
      />

      <div className="tl-controls">
        <div className="tl-search">
          <span className="tl-search__prompt" aria-hidden="true">
            &gt;
          </span>
          <label className="tl-sr" htmlFor="tl-search-input">
            Search vaults
          </label>
          <input
            id="tl-search-input"
            type="search"
            className="tl-input tl-search__input"
            placeholder="SEARCH VAULT, ASSET, PROTOCOL, CREATOR…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className="tl-search__hint" aria-hidden="true">
            {query ? "FILTERING" : "09 RECORDS"}
          </span>
        </div>

        <div className="tl-controls__filters">
          <FilterGroup
            legend="TYPE"
            value={kind}
            options={KIND_OPTIONS}
            onChange={setKind}
          />
          <FilterGroup
            legend="NETWORK"
            value={chain}
            options={CHAIN_OPTIONS}
            onChange={setChain}
          />
          <FilterGroup
            legend="RISK"
            value={risk}
            options={RISK_OPTIONS}
            onChange={setRisk}
          />
        </div>
      </div>

      <div className="tl-results">
        <span aria-live="polite">
          SHOWING {String(filtered.length).padStart(2, "0")} /{" "}
          {String(VAULTS.length).padStart(2, "0")}
        </span>
        <span>SORT: REGISTRY ORDER</span>
      </div>

      {filtered.length > 0 ? (
        <div className="tl-vgrid">
          {filtered.map((vault) => (
            <VaultCard key={vault.id} vault={vault} onInspect={setSelected} />
          ))}
        </div>
      ) : (
        <div className="tl-empty" role="status">
          <span className="tl-empty__code">ERR_404 / NO RECORDS</span>
          <h3>No vaults match this query.</h3>
          <p>
            Clear the search and filters to return to the full index. New
            listings appear here once the registry reports them.
          </p>
          <button type="button" className="tl-btn" onClick={resetFilters}>
            RESET INDEX <span aria-hidden="true">↺</span>
          </button>
        </div>
      )}

      <p className="tl-note">
        Sample data for design preview. Protocol names describe example strategy
        targets, not official integrations or partnerships. Base and Arbitrum
        are planned targets; the protocol currently runs on their Sepolia
        testnets. Not live yields, not financial advice.
      </p>

      {selected ? (
        <VaultDetails vault={selected} onClose={closeDetails} />
      ) : null}
    </section>
  );
}

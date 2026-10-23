import type { VaultFilterKind } from "../vaults";

type SearchBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  kind: VaultFilterKind;
  onKindChange: (value: VaultFilterKind) => void;
  chain: string;
  onChainChange: (value: string) => void;
};

export default function SearchBar({
  query,
  onQueryChange,
  kind,
  onKindChange,
  chain,
  onChainChange,
}: SearchBarProps) {
  const allActive = kind === "all" && chain === "All";

  return (
    <div className="searchbar">
      <form
        className="search-form"
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <input
          className="input"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by vault, protocol, chain or creator…"
          aria-label="Search vaults"
        />
        <button type="submit" className="btn">
          🔍 Search
        </button>
      </form>

      <div className="filter-row" role="group" aria-label="Vault filters">
        <button
          type="button"
          className={`filter-link${allActive ? " on" : ""}`}
          onClick={() => {
            onKindChange("all");
            onChainChange("All");
          }}
        >
          All
        </button>
        <span className="sep" aria-hidden="true">
          |
        </span>
        <button
          type="button"
          className={`filter-link${kind === "ready" ? " on" : ""}`}
          onClick={() => onKindChange(kind === "ready" ? "all" : "ready")}
        >
          📦 Ready-made
        </button>
        <span className="sep" aria-hidden="true">
          |
        </span>
        <button
          type="button"
          className={`filter-link${kind === "custom" ? " on" : ""}`}
          onClick={() => onKindChange(kind === "custom" ? "all" : "custom")}
        >
          🛠️ Custom
        </button>
        <span className="sep" aria-hidden="true">
          |
        </span>
        <button
          type="button"
          className={`filter-link${chain === "Base" ? " on" : ""}`}
          onClick={() => onChainChange(chain === "Base" ? "All" : "Base")}
        >
          🔵 Base
        </button>
        <span className="sep" aria-hidden="true">
          |
        </span>
        <button
          type="button"
          className={`filter-link${chain === "Arbitrum" ? " on" : ""}`}
          onClick={() => onChainChange(chain === "Arbitrum" ? "All" : "Arbitrum")}
        >
          🔷 Arbitrum
        </button>
      </div>
    </div>
  );
}

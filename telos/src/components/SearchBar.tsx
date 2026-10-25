import type { VaultFilterKind } from "../vaults";
import { CHAINS } from "../vaults";

type SearchBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  kind: VaultFilterKind;
  onKindChange: (value: VaultFilterKind) => void;
  chain: string;
  onChainChange: (value: string) => void;
};

const QUICK_CHAINS = ["Ethereum", "Base", "Arbitrum", "Telos"];

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
        {QUICK_CHAINS.map((name) => (
          <span className="quick-chain" key={name}>
            <button
              type="button"
              className={`filter-link${chain === name ? " on" : ""}`}
              onClick={() => onChainChange(chain === name ? "All" : name)}
            >
              {name === "Ethereum" ? "⟠" : name === "Base" ? "🔵" : name === "Arbitrum" ? "🔷" : "◆"}{" "}
              {name}
            </button>
            <span className="sep" aria-hidden="true">
              |
            </span>
          </span>
        ))}
        <label className="chain-filter-label">
          <span className="sr-only">All EVM chains</span>
          <select
            className="input chain-filter-select"
            value={CHAINS.includes(chain) ? chain : "All"}
            onChange={(event) => onChainChange(event.target.value)}
            aria-label="Filter by EVM chain"
          >
            <option value="All">All EVM chains</option>
            {CHAINS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

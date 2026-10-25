import { useState } from "react";
import { Link } from "react-router-dom";
import { DEPOSIT_CHAIN } from "../chains";
import type { Vault, VaultFilterKind } from "../vaults";
import { formatUsd, tvlValue, weeklyEarnings } from "../vaults";
import { useTxConfirmer } from "../custom-contexts/TxConfirmerContext";

type SortKey = "apy" | "tvl" | "fee";
type SortDir = "asc" | "desc";
type Sort = { key: SortKey; dir: SortDir };

type VaultTableProps = {
  vaults: Vault[];
  query: string;
  kind: VaultFilterKind;
  chain: string;
};

type TableHeadProps = {
  sort?: Sort | null;
  onSort?: (key: SortKey) => void;
};

function TableHead({ sort, onSort }: TableHeadProps) {
  const renderSortable = (key: SortKey, label: string) => {
    const active = sort?.key === key;
    const ariaSort = active
      ? sort?.dir === "asc"
        ? "ascending"
        : "descending"
      : "none";

    return (
      <th scope="col" aria-sort={ariaSort}>
        {onSort ? (
          <button
            type="button"
            className="sort-btn"
            onClick={() => onSort(key)}
            title={`Sort by ${label}`}
          >
            {label}
            {active ? (sort?.dir === "asc" ? " ▲" : " ▼") : ""}
          </button>
        ) : (
          label
        )}
      </th>
    );
  };

  return (
    <thead>
      <tr>
        <th scope="col">Type</th>
        <th scope="col">Vault</th>
        <th scope="col">Chains</th>
        {renderSortable("apy", "APY")}
        <th scope="col">Wk / $1k</th>
        {renderSortable("tvl", "TVL")}
        {renderSortable("fee", "Fee")}
        <th scope="col">Creator</th>
        <th scope="col">Actions</th>
      </tr>
    </thead>
  );
}

function VaultRow({
  vault,
  openDisabled = false,
}: {
  vault: Vault;
  openDisabled?: boolean;
}) {
  const { confirmTx } = useTxConfirmer();
  const vaultEmoji = vault.kind === "ready" ? "📦" : "🛠️";
  const token =
    vault.name.match(/USDC|USDT|WETH|ETH|DAI|WBTC|sUSDe|ARB/i)?.[0]?.toUpperCase() ??
    "USDC";
  const chains =
    vault.chains.length > 1
      ? `${vault.chains[0]} +${vault.chains.length - 1}`
      : vault.chain;

  const handleDeposit = () => {
    void confirmTx({
      kind: "deposit",
      chains: [DEPOSIT_CHAIN],
      deposit: {
        vaultName: vault.name,
        token,
        apy: vault.apy,
        fee: vault.fee,
        vaultChain: vault.chain,
      },
      note: `Deposits settle on ${DEPOSIT_CHAIN}. Testnet only — no assets are transferred in this build.`,
    });
  };

  return (
    <tr>
      <td className="nowrap">
        {vault.kind === "ready" ? "📦 Ready" : "🛠️ Custom"}
      </td>
      <td>
        <span className="vault-name">
          <span aria-hidden="true">{vaultEmoji}</span>
          <b>{vault.name}</b>
        </span>
        <span className="vault-sub">
          {vault.kind === "ready" ? `via ${vault.proto}` : vault.strategy}
        </span>
      </td>
      <td className="nowrap" title={vault.chains.join(" · ")}>
        🌐 {chains}
      </td>
      <td className="apy">{vault.apy > 0 ? `${vault.apy.toFixed(1)}%` : "—"}</td>
      <td className="nowrap">
        {vault.apy > 0 ? formatUsd(weeklyEarnings(vault.apy), 2) : "—"}
      </td>
      <td className="nowrap">${vault.tvl}</td>
      <td className="nowrap">{vault.fee}%</td>
      <td className="creator">{vault.creator}</td>
      <td>
        <span className="row-actions">
          <button
            type="button"
            className="btn btn-sm"
            disabled={openDisabled}
            onClick={handleDeposit}
            title={
              openDisabled
                ? "Preview only — this vault is not deployed"
                : `Deposit into ${vault.name}`
            }
          >
            📥 Deposit
          </button>
          {openDisabled ? (
            <button
              type="button"
              className="btn btn-plain btn-sm"
              disabled
              title="Preview only"
            >
              🧲 Open
            </button>
          ) : (
            <Link
              className="btn btn-plain btn-sm"
              to={`/vaults/${vault.id}`}
              title={`Open ${vault.name}`}
            >
              🧲 Open
            </Link>
          )}
        </span>
      </td>
    </tr>
  );
}

export function VaultPreview({ vault }: { vault: Vault }) {
  return (
    <div className="table-scroll">
      <table className="vaults preview-table">
        <TableHead />
        <tbody>
          <VaultRow vault={vault} openDisabled />
        </tbody>
      </table>
    </div>
  );
}

export default function VaultTable({
  vaults,
  query,
  kind,
  chain,
}: VaultTableProps) {
  const [sort, setSort] = useState<Sort | null>(null);
  const term = query.trim().toLowerCase();

  const shown = vaults.filter((vault) => {
    if (kind !== "all" && vault.kind !== kind) return false;
    if (chain !== "All" && !vault.chains.includes(chain)) return false;
    if (!term) return true;

    const source =
      vault.kind === "ready" ? (vault.proto ?? "") : vault.strategy;
    return [
      vault.id,
      vault.name,
      source,
      vault.chain,
      vault.chains.join(" "),
      vault.description,
      vault.creator,
    ]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  const sorted = sort
    ? [...shown].sort((a, b) => {
        const left = sort.key === "tvl" ? tvlValue(a.tvl) : a[sort.key];
        const right = sort.key === "tvl" ? tvlValue(b.tvl) : b[sort.key];
        return sort.dir === "asc" ? left - right : right - left;
      })
    : shown;

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current?.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  };

  return (
    <div>
      <div className="table-scroll">
        <table className="vaults">
          <TableHead sort={sort} onSort={toggleSort} />
          <tbody>
            {sorted.map((vault) => (
              <VaultRow key={vault.id} vault={vault} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="result-count">
        {sorted.length} of {vaults.length} vaults
      </p>
      {sorted.length === 0 ? (
        <p className="empty">🔍 No vaults found. Try another search.</p>
      ) : null}
    </div>
  );
}

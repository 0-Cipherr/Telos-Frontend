import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { isAddress } from "viem";
import { telosFetch } from "../api-handler/Telos/telos-session";
import { useCreatedVaults } from "../custom-contexts/CreatedVaultsContext";
import { useRegistryActionModal } from "../custom-contexts/ModalContext";
import { useStrategyLauncher } from "../custom-contexts/StrategyLauncherContext";
import { useTxConfirmer } from "../custom-contexts/TxConfirmerContext";
import type { DeployedStrategy } from "../pages/StrategiesPage";
import { lockBodyScroll } from "../utils/scrollLock";
import {
  MAX_CREATOR_FEE_PERCENT,
  PROTOCOL_FEE_PERCENT,
  type Vault,
  type VaultRisk,
} from "../vaults";

type Props = {
  address?: string;
};

function shortAddress(value: string): string {
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

const RISK: Record<DeployedStrategy["risk"], VaultRisk> = {
  LOW: "LOW",
  MED: "MEDIUM",
  HIGH: "HIGH",
};

export default function RegistryActionModal({ address }: Props) {
  const navigate = useNavigate();
  const { addVault } = useCreatedVaults();
  const { confirmTx } = useTxConfirmer();
  const { setOpen } = useRegistryActionModal();
  const { openStrategy } = useStrategyLauncher();

  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [description, setDescription] = useState("");
  const [strategies, setStrategies] = useState<DeployedStrategy[] | null>(null);
  const [strategyId, setStrategyId] = useState("");
  const [fee, setFee] = useState(1);
  const [feeReceiver, setFeeReceiver] = useState(address ?? "");
  const [error, setError] = useState("");

  const strategy = strategies?.find((item) => item.id === strategyId) ?? null;

  useEffect(() => {
    let cancelled = false;
    telosFetch<{ strategies: DeployedStrategy[] }>("/registry/strategies")
      .then((data) => {
        if (!cancelled) setStrategies(data.strategies);
      })
      .catch(() => {
        if (!cancelled) setStrategies([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const unlockScroll = lockBodyScroll();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlockScroll();
    };
  }, [setOpen]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedTicker = ticker.trim().toUpperCase();
    const trimmedReceiver = feeReceiver.trim();

    if (!strategy) return setError("Pick a deployed strategy for this vault.");
    if (!trimmedName) return setError("A vault name is required.");
    if (!trimmedTicker) return setError("A ticker is required.");
    if (!isAddress(trimmedReceiver)) {
      return setError("Fee receiver must be a valid EVM address.");
    }
    if (fee < 0 || fee > MAX_CREATOR_FEE_PERCENT) {
      return setError(`Creator fee must be between 0 and ${MAX_CREATOR_FEE_PERCENT}%.`);
    }

    const confirmed = await confirmTx({
      kind: "deploy",
      chains: [strategy.chain],
      rows: [
        { label: "Vault", value: trimmedName },
        { label: "Ticker", value: trimmedTicker },
        { label: "Strategy", value: `${strategy.name} · $${strategy.ticker}` },
        { label: "Strategy chain", value: strategy.chain },
        { label: "Creator fee", value: `${fee}%` },
        { label: "Protocol fee", value: `${PROTOCOL_FEE_PERCENT}%` },
        { label: "Fee receiver", value: shortAddress(trimmedReceiver) },
      ],
      note: "Testnet only. Deployment is simulated in this build — no contract call is made.",
    });
    if (!confirmed) return;

    const now = new Date();
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const id = `TL-${now.getTime().toString(36).toUpperCase()}${suffix}`;

    const vault: Vault = {
      id,
      name: trimmedName,
      asset: strategy.asset,
      chain: strategy.chain,
      chains: [strategy.chain],
      kind: "custom",
      proto: "Telos strategy",
      strategy: strategy.name,
      strategySummary: strategy.thesis,
      description: description.trim() || strategy.thesis,
      allocations: strategy.allocations,
      risk: RISK[strategy.risk],
      apy: strategy.apy,
      tvl: "0",
      tvlUsd: 0,
      fee,
      protocolFee: PROTOCOL_FEE_PERCENT,
      creator: shortAddress(trimmedReceiver),
      creatorAddress: trimmedReceiver,
      color: "#8fd400",
      h: [0, 0, 0, 0, 0, 0, 0],
      status: "draft",
      createdAt: now.toISOString().slice(0, 10),
    };

    addVault(vault);
    setOpen(false);
    navigate(`/vaults/${id}`);
  };

  return (
    <div className="modal-overlay" onClick={() => setOpen(false)}>
      <div
        className="panel modal registry-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="registry-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleCreate}>
          <div className="modal-head">
            <div>
              <span className="registry-kicker">REGISTRY / CREATE VAULT</span>
              <h2 id="registry-modal-title">Create a vault</h2>
            </div>
            <button
              type="button"
              className="btn btn-plain btn-sm"
              onClick={() => setOpen(false)}
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>

          <div className="registry-scroll">
            <fieldset className="registry-group">
              <legend>
                <span>Strategy</span>
                <span className="registry-count">
                  {strategies ? `${strategies.length} deployed` : "loading"}
                </span>
              </legend>
              {strategies && strategies.length === 0 ? (
                <div className="registry-empty">
                  <p className="field-hint">
                    No strategies are deployed yet. A vault runs a deployed strategy, so create one first.
                  </p>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      setOpen(false);
                      openStrategy();
                    }}
                  >
                    ✦ Create a strategy
                  </button>
                </div>
              ) : (
                <>
                  <div className="field">
                    <label htmlFor="registry-strategy">Deployed strategy</label>
                    <select
                      id="registry-strategy"
                      className="input"
                      value={strategyId}
                      onChange={(event) => setStrategyId(event.target.value)}
                      required
                    >
                      <option value="">Choose a strategy…</option>
                      {(strategies ?? []).map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.chain}
                        </option>
                      ))}
                    </select>
                  </div>
                  {strategy ? (
                    <div className="registry-strategy-preview">
                      <p>{strategy.thesis}</p>
                      <span className="field-hint">
                        {strategy.chain} · {strategy.risk} risk · {strategy.fee}% strategy fee
                      </span>
                    </div>
                  ) : null}
                </>
              )}
            </fieldset>

            <div className="registry-grid-2">
              <div className="field">
                <label htmlFor="registry-vault-name">Vault name</label>
                <input
                  id="registry-vault-name"
                  className="input"
                  type="text"
                  value={name}
                  maxLength={32}
                  placeholder="My Yield Vault"
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="registry-ticker">Ticker</label>
                <input
                  id="registry-ticker"
                  className="input"
                  type="text"
                  value={ticker}
                  maxLength={8}
                  placeholder="TLS"
                  spellCheck={false}
                  onChange={(event) => setTicker(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="registry-grid-2">
              <div className="field">
                <label htmlFor="registry-fee-receiver">Fee receiver</label>
                <input
                  id="registry-fee-receiver"
                  className="input"
                  type="text"
                  value={feeReceiver}
                  placeholder="0x…"
                  spellCheck={false}
                  onChange={(event) => setFeeReceiver(event.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="registry-fee">Creator fee (%)</label>
                <input
                  id="registry-fee"
                  className="input"
                  type="number"
                  min={0}
                  max={MAX_CREATOR_FEE_PERCENT}
                  step={0.1}
                  value={fee}
                  onChange={(event) => setFee(Number(event.target.value))}
                />
                <p className="field-hint">
                  Capped at {MAX_CREATOR_FEE_PERCENT}%. Protocol fee is {PROTOCOL_FEE_PERCENT}%.
                </p>
              </div>
            </div>

            <div className="field">
              <label htmlFor="registry-description">Description</label>
              <textarea
                id="registry-description"
                className="input registry-textarea"
                value={description}
                rows={3}
                placeholder="Optional. Defaults to the strategy thesis."
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </div>

          {error ? (
            <p className="registry-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="modal-actions registry-actions">
            <button type="submit" className="btn" disabled={!strategy}>
              Create vault
            </button>
            <button type="button" className="btn btn-plain" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

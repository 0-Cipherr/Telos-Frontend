import { useEffect, useRef, useState, type FormEvent } from "react";
import { NetworkArbitrumSepolia, NetworkBaseSepolia } from "@web3icons/react";
import type { TxRequest } from "../custom-contexts/TxConfirmerContext";
import { lockBodyScroll } from "../utils/scrollLock";

type ChainMeta = {
  label: string;
  explorer: string;
  Icon: typeof NetworkBaseSepolia;
};

function chainMeta(chain: string): ChainMeta {
  const isBase = chain.toLowerCase().includes("base");
  const hasSepolia = chain.toLowerCase().includes("sepolia");
  const baseLabel = hasSepolia ? chain : `${chain} Sepolia`;

  return isBase
    ? {
        label: baseLabel,
        explorer: "https://sepolia.basescan.org/tx/",
        Icon: NetworkBaseSepolia,
      }
    : {
        label: baseLabel,
        explorer: "https://sepolia.arbiscan.io/tx/",
        Icon: NetworkArbitrumSepolia,
      };
}

function randomHash(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

function formatAmount(value: string): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return parsed.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

type Props = {
  request: TxRequest;
  onDone: (confirmed: boolean) => void;
};

type Status = "review" | "pending" | "success" | "error";

export default function TxConfirmer({ request, onDone }: Props) {
  const [status, setStatus] = useState<Status>("review");
  const [amount, setAmount] = useState("");
  const [confirmedSteps, setConfirmedSteps] = useState(0);
  const [hashes, setHashes] = useState<Array<{ chain: string; hash: string }>>(
    [],
  );
  const [error, setError] = useState("");
  const running = useRef(false);

  const isDeposit = request.kind === "deposit";
  const chains = request.chains.length ? request.chains : ["Base Sepolia"];
  const numericAmount = Number(amount);
  const amountValid =
    !isDeposit || (Number.isFinite(numericAmount) && numericAmount > 0);
  const progress = (confirmedSteps / chains.length) * 100;

  useEffect(() => lockBodyScroll(), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Capture phase: keep Escape from closing the dialog underneath.
      event.stopPropagation();
      if (status === "review") onDone(false);
      if (status === "success") onDone(true);
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [status, onDone]);

  const close = () => {
    onDone(status === "success");
  };

  const run = async () => {
    if (running.current) return;
    running.current = true;
    setStatus("pending");
    setConfirmedSteps(0);
    setHashes([]);
    setError("");

    try {
      const next: Array<{ chain: string; hash: string }> = [];
      for (let index = 0; index < chains.length; index += 1) {
        await wait(1150);
        next.push({ chain: chains[index], hash: randomHash() });
        setHashes([...next]);
        setConfirmedSteps(index + 1);
      }
      setStatus("success");
    } catch {
      setError("The transaction could not be confirmed. Nothing was sent.");
      setStatus("error");
    } finally {
      running.current = false;
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!amountValid) return;
    void run();
  };

  const title = isDeposit ? "Confirm deposit" : "Confirm deployment";
  const successTitle = isDeposit
    ? "Deposit confirmed"
    : chains.length > 1
      ? `${chains.length} deployments confirmed`
      : "Vault deployed";

  return (
    <div className="modal-overlay tx-overlay">
      <div
        className="panel modal tx-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-confirmer-title"
      >
        <div className="modal-head">
          <div>
            <span className="tx-kicker">
              {status === "review"
                ? "TRANSACTION / REVIEW"
                : status === "pending"
                  ? "TRANSACTION / IN PROGRESS"
                  : status === "success"
                    ? "TRANSACTION / CONFIRMED"
                    : "TRANSACTION / FAILED"}
            </span>
            <h2 id="tx-confirmer-title">
              {status === "success" ? successTitle : title}
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-plain btn-sm"
            onClick={close}
            aria-label="Close transaction confirmer"
            disabled={status === "pending"}
          >
            ✕
          </button>
        </div>

        {status === "review" ? (
          <form onSubmit={submit}>
            {isDeposit && request.deposit ? (
              <div className="field">
                <label htmlFor="tx-amount">
                  Amount
                  <span>{request.deposit.token}</span>
                </label>
                <div className="tx-amount">
                  <input
                    id="tx-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(event) =>
                      setAmount(event.target.value.replace(/[^0-9.]/g, ""))
                    }
                    autoFocus
                  />
                  <span>{request.deposit.token}</span>
                </div>
                <div className="tx-quick">
                  {[100, 500, 1000].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className="btn btn-plain btn-sm"
                      onClick={() => setAmount(String(value))}
                    >
                      {value.toLocaleString("en-US")}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="tx-section">
              <span className="tx-label">
                {isDeposit ? "Network" : "Deployment plan"}
              </span>
              <div className="tx-plan">
                {chains.map((chain, index) => {
                  const meta = chainMeta(chain);
                  const Icon = meta.Icon;
                  return (
                    <div className="tx-plan-item" key={chain}>
                      <Icon variant="branded" size={16} />
                      <span className="tx-plan-name">{meta.label}</span>
                      <span className="tx-tag">
                        {isDeposit
                          ? "DEPOSIT"
                          : index === 0
                            ? "NATIVE"
                            : "OTHER CHAIN"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="tx-rows">
              {isDeposit && request.deposit ? (
                <>
                  <div className="tx-row">
                    <span>Vault</span>
                    <b>{request.deposit.vaultName}</b>
                  </div>
                  <div className="tx-row">
                    <span>Amount</span>
                    <b>
                      {amount
                        ? `${formatAmount(amount)} ${request.deposit.token}`
                        : "—"}
                    </b>
                  </div>
                  <div className="tx-row">
                    <span>Est. APY</span>
                    <b className="lime">{request.deposit.apy.toFixed(1)}%</b>
                  </div>
                  <div className="tx-row">
                    <span>Creator fee</span>
                    <b>{request.deposit.fee}%</b>
                  </div>
                </>
              ) : null}

              {request.rows?.map((row) => (
                <div className="tx-row" key={row.label}>
                  <span>{row.label}</span>
                  <b>{row.value || "—"}</b>
                </div>
              ))}

              <div className="tx-row">
                <span>Est. network cost</span>
                <b>{chains.length > 1 ? "$0.02 – $0.06" : "$0.01 – $0.03"}</b>
              </div>
            </div>

            <div className="modal-actions">
              <button type="submit" className="btn" disabled={!amountValid}>
                {isDeposit
                  ? "Confirm deposit"
                  : chains.length > 1
                    ? `Confirm ${chains.length} deployments`
                    : "Confirm deployment"}
              </button>
              <button
                type="button"
                className="btn btn-plain"
                onClick={() => onDone(false)}
              >
                Cancel
              </button>
            </div>

            <p className="tx-note">
              {request.note ??
                "Testnet only. Confirmations are simulated in this build."}
            </p>
          </form>
        ) : null}

        {status === "pending" ? (
          <div aria-live="polite">
            <div className="tx-pending-head">
              <span className="tx-spinner" aria-hidden="true" />
              <div>
                <b>
                  {isDeposit
                    ? "Confirm in your wallet…"
                    : `Deploying ${Math.min(confirmedSteps + 1, chains.length)} of ${chains.length}…`}
                </b>
                <span>
                  {isDeposit
                    ? "Waiting for signature"
                    : chainMeta(chains[Math.min(confirmedSteps, chains.length - 1)])
                        .label}
                </span>
              </div>
            </div>

            <div
              className="tx-progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
            >
              <i style={{ width: `${progress}%` }} />
            </div>

            <div className="tx-plan">
              {chains.map((chain, index) => {
                const meta = chainMeta(chain);
                const Icon = meta.Icon;
                const done = index < confirmedSteps;
                const active = index === confirmedSteps;
                return (
                  <div
                    className={`tx-plan-item${done ? " is-done" : ""}${
                      active ? " is-active" : ""
                    }`}
                    key={chain}
                  >
                    <Icon variant="branded" size={16} />
                    <span className="tx-plan-name">{meta.label}</span>
                    <span className="tx-status">
                      {done
                        ? "CONFIRMED"
                        : active
                          ? isDeposit
                            ? "SIGNING…"
                            : "DEPLOYING…"
                          : "QUEUED"}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="tx-note">
              Keep this window open. This is a testnet simulation — no funds are
              moved.
            </p>
          </div>
        ) : null}

        {status === "success" ? (
          <div className="tx-success" aria-live="polite">
            <div className="tx-check" aria-hidden="true">
              ✓
            </div>
            <p className="tx-success-copy">
              {isDeposit && request.deposit
                ? `Deposit of ${formatAmount(amount)} ${request.deposit.token} into ${request.deposit.vaultName}.`
                : `Vault deployed on ${chains
                    .map((chain) => chainMeta(chain).label)
                    .join(" + ")}.`}
            </p>

            <div className="tx-rows">
              {hashes.map((item) => {
                const meta = chainMeta(item.chain);
                return (
                  <div className="tx-row" key={item.hash}>
                    <span>{meta.label}</span>
                    <b>
                      <a
                        href={`${meta.explorer}${item.hash}`}
                        target="_blank"
                        rel="noreferrer"
                        title={item.hash}
                      >
                        {shortHash(item.hash)} ↗
                      </a>
                    </b>
                  </div>
                );
              })}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => onDone(true)}>
                Done
              </button>
            </div>

            <p className="tx-note">
              Simulated {isDeposit ? "deposit" : "deployment"} — no contract call
              was made and no funds moved.
            </p>
          </div>
        ) : null}

        {status === "error" ? (
          <div aria-live="assertive">
            <p className="tx-error" role="alert">
              {error}
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn"
                onClick={() => setStatus("review")}
              >
                Try again
              </button>
              <button
                type="button"
                className="btn btn-plain"
                onClick={() => onDone(false)}
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { auditStatusLabel, isAuditCleared } from "../strategies/ethskills-audit";
import {
  strategyFileName,
  validateStrategySource,
  type StrategySpec,
} from "../strategies/strategy-standard";
import { saveStrategy } from "../strategies/strategy-store";
import { llmLabel } from "../llm-models";
import { lockBodyScroll } from "../utils/scrollLock";

type Props = {
  open: boolean;
  spec: StrategySpec | null;
  onClose: () => void;
  onCreateVault: (spec: StrategySpec) => void;
  onOpenChat: () => void;
};

/**
 * Compact strategy review dialog.
 *
 * The chat returns a JSON strategy object (metadata + full contract). This
 * modal renders that object with just enough context to save it or carry it
 * into the create-vault form — no separate verification workflow.
 */
export default function CreateStrategyModal({
  open,
  spec,
  onClose,
  onCreateVault,
  onOpenChat,
}: Props) {
  const [current, setCurrent] = useState<StrategySpec | null>(spec);
  const [registered, setRegistered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setCurrent(spec);
    setRegistered(false);
    setError("");
    setCopied(false);
  }, [open, spec]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const unlock = lockBodyScroll();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlock();
    };
  }, [open, onClose]);

  const validation = useMemo(
    () =>
      current?.validation ??
      (current ? validateStrategySource(current.code) : { ok: false, issues: [] }),
    [current],
  );
  const auditCleared = isAuditCleared(current?.audit);
  const canUse = Boolean(current?.code) && validation.ok;
  const lineCount = current?.code ? current.code.split("\n").length : 0;

  const handleSave = () => {
    if (!current) return;
    if (!validation.ok) {
      setError("Fix the validator issues before saving this strategy.");
      return;
    }
    saveStrategy({ ...current, validation });
    setRegistered(true);
    setError("");
  };

  const handleCreateVault = () => {
    if (!current) return;
    if (!validation.ok) {
      setError("Fix the validator issues before creating a vault.");
      return;
    }
    saveStrategy({ ...current, validation });
    onCreateVault({ ...current, validation });
  };

  const handleCopy = async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.code || current.prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard is blocked by the browser. Select the source to copy it.");
    }
  };

  const handleDownload = () => {
    if (!current?.code) return;
    const blob = new Blob([current.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = strategyFileName(current);
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!open || !current) return null;

  return (
    <div className="modal-overlay strategy-modal-overlay" onClick={onClose}>
      <div
        className="panel modal strategy-modal strategy-modal--simple"
        role="dialog"
        aria-modal="true"
        aria-labelledby="strategy-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head strategy-modal-head">
          <div>
            <span className="registry-kicker">STRATEGY / JSON REVIEW</span>
            <h2 id="strategy-modal-title">🧬 {current.name}</h2>
            <p className="strategy-modal-sub">
              ${current.ticker} · {current.chain} · {current.asset} ·{" "}
              {current.risk} RISK · {current.fee}% FEE
            </p>
          </div>
          <button
            type="button"
            className="btn btn-plain btn-sm"
            onClick={onClose}
            aria-label="Close strategy dialog"
          >
            ✕
          </button>
        </div>

        <div className="strategy-modal-scroll">
          <div className="strategy-pill-row">
            <span
              className={`strategy-pill${
                validation.ok ? " is-pass" : " is-fail"
              }`}
            >
              {validation.ok
                ? "VALIDATOR ✓"
                : `VALIDATOR ✗ ${validation.issues.length}`}
            </span>
            <span className="strategy-pill">
              MODEL {current.model ? llmLabel(current.model) : "NOT RECORDED"}
            </span>
            <span
              className={`strategy-pill${
                auditCleared ? " is-pass" : " is-pending"
              }`}
            >
              AUDIT {auditStatusLabel(current.audit)}
            </span>
            {current.source === "llm" ? (
              <span className="strategy-pill is-pass">JSON ✓</span>
            ) : (
              <span className="strategy-pill">LOCAL TEMPLATE</span>
            )}
          </div>

          <div className="strategy-simple-grid">
            <section className="strategy-panel">
              <span className="strategy-panel-label">THESIS</span>
              <p>{current.thesis}</p>
            </section>
            <section className="strategy-panel">
              <span className="strategy-panel-label">ALLOCATIONS</span>
              <div className="strategy-allocations">
                {current.allocations.map((item) => (
                  <div key={`${item.label}-${item.pct}`}>
                    <div className="strategy-alloc-head">
                      <span>{item.label}</span>
                      <b>{item.pct}%</b>
                    </div>
                    <div className="strategy-bar">
                      <i style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="strategy-panel">
            <span className="strategy-panel-label">GUARDRAILS</span>
            <ul className="strategy-guardrails">
              {current.guardrails.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </section>

          <details className="strategy-code-wrap">
            <summary>
              <span>CONTRACT SOURCE</span>
              <span>
                {current.code
                  ? `${lineCount} LINES · ${strategyFileName(current)}`
                  : "NO SOURCE"}
              </span>
            </summary>
            <pre className="strategy-code">
              <code>{current.code || current.prompt}</code>
            </pre>
          </details>

          {validation.issues.length ? (
            <ul className="strategy-simple-issues">
              {validation.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}

          {registered ? (
            <p className="strategy-success" role="status">
              ✓ Strategy saved to your local strategy library.
            </p>
          ) : null}

          {error ? (
            <p className="registry-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="modal-actions strategy-actions">
          <button
            type="button"
            className="btn"
            onClick={handleCreateVault}
            disabled={!canUse}
            title={
              canUse
                ? "Open the create-vault form with this strategy attached"
                : "Fix the failed validator checks first"
            }
          >
            CREATE VAULT WITH STRATEGY →
          </button>
          <button
            type="button"
            className="btn btn-plain"
            onClick={handleSave}
            disabled={!canUse || registered}
          >
            {registered ? "SAVED ✓" : "SAVE STRATEGY"}
          </button>
          <button type="button" className="btn btn-plain" onClick={onOpenChat}>
            BACK TO CHAT
          </button>
          <button type="button" className="btn btn-plain" onClick={onClose}>
            CLOSE
          </button>
        </div>

        <div className="strategy-modal-tools">
          <button
            type="button"
            className="linklike"
            onClick={() => void handleCopy()}
          >
            {copied ? "COPIED ✓" : "COPY CONTRACT"}
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            className="linklike"
            onClick={handleDownload}
            disabled={!current.code}
          >
            DOWNLOAD .SOL
          </button>
          <span aria-hidden="true">·</span>
          <span>
            {lineCount} LINES · TESTNET ONLY
          </span>
        </div>
      </div>
    </div>
  );
}

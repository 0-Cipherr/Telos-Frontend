import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTelosApiKey, telosFetch } from "../api-handler/Telos/telos-session";
import { auditStatusLabel, isAuditCleared } from "../strategies/ethskills-audit";
import { strategyFileName, validateStrategySource, type StrategySpec } from "../strategies/strategy-standard";
import { lockBodyScroll } from "../utils/scrollLock";

type Props = {
  open: boolean;
  spec: StrategySpec | null;
  onClose: () => void;
  onOpenChat: () => void;
};

/**
 * Review and deploy a strategy drafted in the strategy chat. Deploying
 * registers it with the Telos API, so it shows up on the Strategies page and
 * can be picked when creating a vault.
 */
export default function CreateStrategyModal({ open, spec, onClose, onOpenChat }: Props) {
  const navigate = useNavigate();
  const [deployed, setDeployed] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

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
    () => spec?.validation ?? (spec ? validateStrategySource(spec.code) : { ok: false, issues: [] }),
    [spec],
  );
  const auditCleared = isAuditCleared(spec?.audit);
  const lineCount = spec?.code ? spec.code.split("\n").length : 0;

  if (!open || !spec) return null;

  const handleDeploy = async () => {
    if (!validation.ok) {
      setError("Fix the validator issues before deploying.");
      return;
    }
    if (!getTelosApiKey()) {
      setError("Connect your wallet to deploy a strategy.");
      return;
    }
    setDeploying(true);
    setError("");
    try {
      await telosFetch("/creator/strategies", {
        method: "POST",
        body: JSON.stringify({
          name: spec.name,
          ticker: spec.ticker,
          chain: spec.chain,
          asset: spec.asset,
          risk: spec.risk,
          fee: spec.fee,
          thesis: spec.thesis,
          allocations: spec.allocations,
          guardrails: spec.guardrails,
          contractName: spec.code.match(/contract\s+([A-Za-z_]\w*)\s+is\s+IStrategy/)?.[1] ?? "",
          contractCode: spec.code,
          model: spec.model ?? "",
          auditStatus: auditStatusLabel(spec.audit),
        }),
      });
      setDeployed(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Deploy failed.");
    } finally {
      setDeploying(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(spec.code || spec.prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard is blocked by the browser. Select the source to copy it.");
    }
  };

  const handleDownload = () => {
    if (!spec.code) return;
    const blob = new Blob([spec.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = strategyFileName(spec);
    anchor.click();
    URL.revokeObjectURL(url);
  };

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
            <span className="registry-kicker">STRATEGY / REVIEW &amp; DEPLOY</span>
            <h2 id="strategy-modal-title">{spec.name}</h2>
            <p className="strategy-modal-sub">
              ${spec.ticker} · {spec.chain} · {spec.asset} · {spec.risk} RISK · {spec.fee}% FEE
            </p>
          </div>
          <button type="button" className="btn btn-plain btn-sm" onClick={onClose} aria-label="Close strategy dialog">
            ✕
          </button>
        </div>

        <div className="strategy-modal-scroll">
          <div className="strategy-pill-row">
            <span className={`strategy-pill${validation.ok ? " is-pass" : " is-fail"}`}>
              {validation.ok ? "VALIDATOR ✓" : `VALIDATOR ✗ ${validation.issues.length}`}
            </span>
            <span className={`strategy-pill${auditCleared ? " is-pass" : " is-pending"}`}>
              AUDIT {auditStatusLabel(spec.audit)}
            </span>
          </div>

          <section className="strategy-panel">
            <span className="strategy-panel-label">AI THESIS</span>
            <p>{spec.thesis}</p>
          </section>

          <section className="strategy-panel">
            <span className="strategy-panel-label">ALLOCATIONS</span>
            <div className="strategy-allocations">
              {spec.allocations.map((item) => (
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

          <section className="strategy-panel">
            <span className="strategy-panel-label">GUARDRAILS</span>
            <ul className="strategy-guardrails">
              {spec.guardrails.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </section>

          <details className="strategy-code-wrap">
            <summary>
              <span>CONTRACT SOURCE</span>
              <span>{spec.code ? `${lineCount} LINES · ${strategyFileName(spec)}` : "NO SOURCE"}</span>
            </summary>
            <pre className="strategy-code">
              <code>{spec.code || spec.prompt}</code>
            </pre>
          </details>

          {validation.issues.length ? (
            <ul className="strategy-simple-issues">
              {validation.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}

          {deployed ? (
            <p className="strategy-success" role="status">
              ✓ Strategy deployed. It is now listed on the Strategies page.
            </p>
          ) : null}

          {error ? (
            <p className="registry-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="modal-actions strategy-actions">
          {deployed ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                onClose();
                navigate("/strategies");
              }}
            >
              VIEW STRATEGIES →
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={() => void handleDeploy()}
              disabled={!validation.ok || deploying}
              title={validation.ok ? "Deploy this strategy" : "Fix the failed validator checks first"}
            >
              {deploying ? "DEPLOYING…" : "DEPLOY STRATEGY"}
            </button>
          )}
          <button type="button" className="btn btn-plain" onClick={onOpenChat}>
            BACK TO CHAT
          </button>
          <button type="button" className="btn btn-plain" onClick={onClose}>
            CLOSE
          </button>
        </div>

        <div className="strategy-modal-tools">
          <button type="button" className="linklike" onClick={() => void handleCopy()}>
            {copied ? "COPIED ✓" : "COPY CONTRACT"}
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" className="linklike" onClick={handleDownload} disabled={!spec.code}>
            DOWNLOAD .SOL
          </button>
          <span aria-hidden="true">·</span>
          <span>{lineCount} LINES · TESTNET ONLY</span>
        </div>
      </div>
    </div>
  );
}

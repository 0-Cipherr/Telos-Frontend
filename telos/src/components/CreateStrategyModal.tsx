import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  auditStatusLabel,
  blockingFindings,
  isAuditCleared,
} from "../strategies/ethskills-audit";
import {
  strategyFileName,
  validateStrategySource,
  type StrategySpec,
} from "../strategies/strategy-standard";
import { saveStrategy } from "../strategies/strategy-store";
import { lockBodyScroll } from "../utils/scrollLock";

type Check = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

type VerificationStatus = "idle" | "running" | "verified" | "unverified" | "failed";

type Verification = {
  status: VerificationStatus;
  checks: Check[];
  fingerprint?: string;
  checkedAt?: number;
};

type Props = {
  open: boolean;
  spec: StrategySpec | null;
  onClose: () => void;
  onCreateVault: (spec: StrategySpec) => void;
  onOpenChat: () => void;
};

function fallbackFingerprint(source: string): string {
  // FNV-1a fallback so the fingerprint still renders on insecure origins where
  // `crypto.subtle` is unavailable.
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function fingerprintSource(source: string): Promise<string | undefined> {
  if (!source) return Promise.resolve(undefined);
  if (!globalThis.crypto?.subtle) {
    return Promise.resolve(fallbackFingerprint(source));
  }
  return globalThis.crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(source))
    .then((digest) =>
      Array.from(new Uint8Array(digest))
        .slice(0, 8)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(""),
    )
    .catch(() => fallbackFingerprint(source));
}

function statusCopy(status: VerificationStatus): { label: string; detail: string } {
  switch (status) {
    case "running":
      return {
        label: "VERIFYING…",
        detail: "Checking the contract structure, interface and latest audit.",
      };
    case "verified":
      return {
        label: "✓ CONTRACT VERIFIED",
        detail: "Structure and audit checks passed. This strategy is cleared to register.",
      };
    case "failed":
      return {
        label: "✗ NOT VERIFIED",
        detail: "Fix the failed checks before this contract can be registered.",
      };
    case "unverified":
      return {
        label: "⚠ UNVERIFIED DRAFT",
        detail: "The source is structurally valid, but the audit has not cleared yet.",
      };
    default:
      return {
        label: "NOT CHECKED",
        detail: "Run verification to inspect this contract.",
      };
  }
}

export default function CreateStrategyModal({
  open,
  spec,
  onClose,
  onCreateVault,
  onOpenChat,
}: Props) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState<StrategySpec | null>(spec);
  const [verification, setVerification] = useState<Verification>({
    status: "idle",
    checks: [],
  });
  const [registered, setRegistered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setCurrent(spec);
    setRegistered(false);
    setError("");
    setCopied(false);
    setVerification({ status: "idle", checks: [] });
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

  const verify = async (target: StrategySpec | null = current) => {
    if (!target) return;
    setVerification((previous) => ({ ...previous, status: "running" }));
    setError("");

    const code = target.code?.trim() ?? "";
    const validation = target.validation ?? validateStrategySource(code);
    const audit = target.audit;
    const cleared = isAuditCleared(audit);
    const blockers = blockingFindings(audit).length;
    const hasInterface =
      /contract\s+[A-Za-z_]\w*\s+is\s+IStrategy/.test(code) &&
      /import\s*\{[^}]*IStrategy[^}]*\}\s*from\s*["'][^"']*IStrategy\.sol["']/.test(code);

    const checks: Check[] = [
      {
        id: "source",
        label: "Contract source",
        ok: Boolean(code),
        detail: code ? `${code.split("\n").length} lines attached` : "No Solidity source",
      },
      {
        id: "interface",
        label: "Telos IStrategy interface",
        ok: hasInterface,
        detail: hasInterface
          ? "Implements the canonical IStrategy interface"
          : "Missing the IStrategy import or implementation",
      },
      {
        id: "validator",
        label: "Structural validator",
        ok: validation.ok,
        detail: validation.ok
          ? "Auth, accounting, events and forbidden constructs passed"
          : validation.issues.slice(0, 2).join(" · "),
      },
      {
        id: "audit",
        label: "ETHSKILLS audit",
        ok: cleared,
        detail: audit ? auditStatusLabel(audit) : "No audit on this draft",
      },
      {
        id: "blockers",
        label: "Blocking findings",
        ok: blockers === 0,
        detail:
          blockers === 0
            ? "No critical/high findings"
            : `${blockers} critical/high finding${blockers === 1 ? "" : "s"}`,
      },
    ];

    const fingerprint = await fingerprintSource(code);
    const failed = !code || !validation.ok || audit?.status === "failed";
    const status: VerificationStatus = cleared
      ? "verified"
      : failed
        ? "failed"
        : "unverified";

    setVerification({
      status,
      checks,
      fingerprint,
      checkedAt: Date.now(),
    });
    setCurrent({ ...target, validation });
  };

  // Verify automatically when the modal opens with a new contract.
  useEffect(() => {
    if (open && spec) void verify(spec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, spec]);

  const validation = useMemo(
    () => current?.validation ?? (current ? validateStrategySource(current.code) : null),
    [current],
  );
  const copy = statusCopy(verification.status);
  const auditCleared = isAuditCleared(current?.audit);
  const canRegister = Boolean(current?.code) && Boolean(validation?.ok);
  const canCreateVault = Boolean(current?.code) && Boolean(validation?.ok);

  const handleRegister = () => {
    if (!current) return;
    if (!validation?.ok) {
      setError("Fix the validator issues before registering this strategy.");
      return;
    }
    saveStrategy({ ...current, validation });
    setRegistered(true);
    setError("");
  };

  const handleCreateVault = () => {
    if (!current) return;
    if (!validation?.ok) {
      setError("Fix the validator issues before creating a vault with this strategy.");
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
        className="panel modal strategy-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="strategy-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head strategy-modal-head">
          <div>
            <span className="registry-kicker">CREATE STRATEGY / VERIFICATION</span>
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
            aria-label="Close create strategy dialog"
          >
            ✕
          </button>
        </div>

        <div className="strategy-modal-scroll">
          <section className={`strategy-verify strategy-verify--${verification.status}`}>
            <div className="strategy-verify-head">
              <div>
                <span className="strategy-verify-badge">{copy.label}</span>
                <p className="strategy-verify-copy">{copy.detail}</p>
              </div>
              <button
                type="button"
                className="btn btn-plain btn-sm"
                onClick={() => void verify(current)}
                disabled={verification.status === "running"}
              >
                ↻ RE-VERIFY
              </button>
            </div>

            <ul className="strategy-checks">
              {verification.checks.map((check) => (
                <li key={check.id} className={check.ok ? "is-pass" : "is-fail"}>
                  <span aria-hidden="true">{check.ok ? "✓" : "✗"}</span>
                  <div>
                    <b>{check.label}</b>
                    <span>{check.detail}</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="strategy-verify-foot">
              <span>
                FINGERPRINT{" "}
                <code>{verification.fingerprint ?? "computing…"}</code>
              </span>
              <span>
                {verification.checkedAt
                  ? new Date(verification.checkedAt).toLocaleTimeString()
                  : "not checked"}
              </span>
            </div>
            <p className="field-hint">
              Front-end verification checks structure and the latest ETHSKILLS
              audit. The backend remains authoritative before deployment.
            </p>
          </section>

          <div className="strategy-grid">
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
                  ? `${current.code.split("\n").length} LINES · ${strategyFileName(current)}`
                  : "NO SOURCE"}
              </span>
            </summary>
            <pre className="strategy-code">
              <code>{current.code || current.prompt}</code>
            </pre>
          </details>

          {registered ? (
            <p className="strategy-success" role="status">
              ✓ Strategy registered in your local strategy library. It now
              appears in AI Forums with its thesis and verification state.
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
            onClick={handleRegister}
            disabled={!canRegister || registered}
            title={
              canRegister
                ? auditCleared
                  ? "Register this verified strategy"
                  : "Register as an unverified draft"
                : "Fix the failed verification checks first"
            }
          >
            {registered
              ? "REGISTERED ✓"
              : auditCleared
                ? "REGISTER VERIFIED STRATEGY"
                : "REGISTER AS DRAFT"}
          </button>
          <button
            type="button"
            className="btn btn-plain"
            onClick={handleCreateVault}
            disabled={!canCreateVault}
            title="Open the create-vault flow with this strategy attached"
          >
            CREATE VAULT WITH STRATEGY →
          </button>
          {registered ? (
            <button
              type="button"
              className="btn btn-plain"
              onClick={() => {
                onClose();
                navigate("/forums");
              }}
            >
              VIEW THESIS IN AI FORUMS →
            </button>
          ) : null}
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
            AUDIT {auditStatusLabel(current.audit)} · TESTNET ONLY
          </span>
        </div>
      </div>
    </div>
  );
}

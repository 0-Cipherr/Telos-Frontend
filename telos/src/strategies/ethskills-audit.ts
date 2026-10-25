import {
  STRATEGY_INTERFACE_SOURCE,
  extractMarkedJson,
  type StrategySpec,
} from "./strategy-standard";

/**
 * ETHSKILLS audit integration.
 *
 * ethskills.com is not an audit API — it publishes a pinned audit methodology
 * and checklist set (https://ethskills.com/audit/SKILL.md). We fetch that
 * material, run a *fresh-context* reviewer pass over the generated contract,
 * and require a clean audit before the contract can be used.
 */
export const ETHSKILLS_AUDIT_URL = "https://ethskills.com/audit/SKILL.md";
export const ETHSKILLS_AUDIT_REV = "ffe4b670e78e1945bcf275f79d4b7b0481bcff35";

const CHECKLIST_BASE = `https://raw.githubusercontent.com/austintgriffith/evm-audit-skills/${ETHSKILLS_AUDIT_REV}`;
const CACHE_TTL_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 9_000;
const MAX_CHECKLIST_CHARS = 40_000;

export type AuditSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type AuditFinding = {
  severity: AuditSeverity;
  title: string;
  location: string;
  impact: string;
  remediation: string;
};

export type StrategyAudit = {
  status: "running" | "passed" | "failed" | "unavailable";
  verdict?: "PASS" | "FAIL";
  summary?: string;
  findings: AuditFinding[];
  engine: string;
  checkedAt?: number;
  error?: string;
};

export type AuditPack = {
  skill: string;
  checklists: { name: string; text: string }[];
  engine: string;
  degraded: boolean;
};

const ALWAYS_CHECKLISTS = [
  "evm-audit-general",
  "evm-audit-precision-math",
  "evm-audit-erc20",
  "evm-audit-access-control",
  "evm-audit-chain-specific",
] as const;

const DOMAIN_CHECKLISTS: { name: string; pattern: RegExp }[] = [
  { name: "evm-audit-defi-lending", pattern: /aave|compound|morpho|lend|borrow|collateral|debt/i },
  { name: "evm-audit-defi-amm", pattern: /uniswap|aerodrome|curve|gmx|pool|swap|liquidity/i },
  { name: "evm-audit-oracles", pattern: /chainlink|oracle|pricefeed|price feed|twap|pyth|sequencer/i },
  { name: "evm-audit-erc4626", pattern: /erc4626|converttoassets|previewredeem|previewdeposit/i },
  { name: "evm-audit-flashloans", pattern: /flashloan|flash loan/i },
  { name: "evm-audit-staking", pattern: /stake|staking|restak|eigen/i },
  { name: "evm-audit-signatures", pattern: /ecrecover|eip712|permit|signature/i },
];

const FALLBACK_METHODOLOGY = `# Fallback EVM audit methodology (derived from ethskills.com/audit)

The canonical pack could not be fetched. Audit conservatively with these checks:

1. Trust boundaries: only \`vault\` may call deposit/withdraw/withdrawAll/harvest. Any other caller must revert Unauthorized.
2. Asset custody: the strategy never pulls funds from the vault; deposit uses the pre-funded balance. Withdrawals transfer to the vault before returning.
3. Accounting: totalAssets = idle asset balance + live value of deployed positions, denominated in asset(). No stale caches, no double counting, no liabilities ignored.
4. Harvest: must not move tokens. profitOrLoss excludes deposits/withdrawals; lastTotalAssets is adjusted by actual capital flows.
5. Reentrancy: all state-changing entry points are nonReentrant; state is updated before external calls where practical.
6. ERC20 edge cases: SafeERC20, fee-on-transfer and rebasing tokens, missing return values, token decimals.
7. External protocols: addresses are constructor-supplied and non-zero; share/asset conversion is read live; liquidity, slippage, oracle staleness and sequencer status are handled where applicable.
8. Failure modes: partial withdrawals are reported honestly; withdrawAll does not brick on illiquid positions; zero amounts revert InvalidAmount.
9. Arithmetic: 0.8.24 checked math, explicit int256 cast bounds, no precision loss that favors the user over the vault.
10. Deployability: no placeholders, no hardcoded addresses, no owner backdoor, no delegatecall/assembly/selfdestruct, no unbounded loops.`;

type CachedPack = { key: string; pack: AuditPack; cachedAt: number };
let cachedPack: CachedPack | null = null;

function detectDomains(code: string): string[] {
  return DOMAIN_CHECKLISTS.filter((entry) => entry.pattern.test(code))
    .map((entry) => entry.name)
    .slice(0, 2);
}

function cacheKey(domains: string[]): string {
  return `${ETHSKILLS_AUDIT_REV}:${domains.join(",")}`;
}

async function fetchText(
  url: string,
  signal: AbortSignal,
  limit = MAX_CHECKLIST_CHARS,
): Promise<string> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "text/markdown, text/plain" },
    });
    if (!response.ok) throw new Error(`${url} → ${response.status}`);
    return (await response.text()).slice(0, limit);
  } finally {
    window.clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

export async function fetchAuditPack(
  code: string,
  signal: AbortSignal,
): Promise<AuditPack> {
  if (signal.aborted) throw new Error("audit cancelled");

  const domains = detectDomains(code);
  const key = cacheKey(domains);
  if (cachedPack && cachedPack.key === key && Date.now() - cachedPack.cachedAt < CACHE_TTL_MS) {
    return cachedPack.pack;
  }

  const names = [...ALWAYS_CHECKLISTS, ...domains];
  const [skillResult, ...checklistResults] = await Promise.allSettled([
    fetchText(ETHSKILLS_AUDIT_URL, signal, 20_000),
    ...names.map((name) => fetchText(`${CHECKLIST_BASE}/${name}/references/checklist.md`, signal)),
  ]);

  if (signal.aborted) throw new Error("audit cancelled");

  const skill =
    skillResult.status === "fulfilled" && skillResult.value.trim()
      ? skillResult.value.trim()
      : FALLBACK_METHODOLOGY;

  const checklists: AuditPack["checklists"] = [];
  checklistResults.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value.trim()) {
      checklists.push({ name: names[index], text: result.value.trim() });
    }
  });

  const degraded = skillResult.status !== "fulfilled" || checklists.length < names.length;
  const pack: AuditPack = {
    skill,
    checklists,
    engine: `ethskills.com/audit · checklist ${ETHSKILLS_AUDIT_REV.slice(0, 7)}${
      degraded ? " · fallback" : ""
    }`,
    degraded,
  };

  cachedPack = { key, pack, cachedAt: Date.now() };
  return pack;
}

function checklistBlock(pack: AuditPack): string {
  if (!pack.checklists.length) return "(no checklist files fetched — use the methodology above)";
  return pack.checklists
    .map((item) => `## ${item.name}\n\n${item.text}`)
    .join("\n\n---\n\n");
}

export function buildAuditMessages(spec: StrategySpec, pack: AuditPack) {
  const system = `You are an INDEPENDENT smart-contract security auditor. You did not write this contract and you must not modify it. Your only output is an audit verdict and findings.

You are following the ETHSKILLS audit methodology and its pinned checklists. Map trust boundaries, external calls, accounting invariants, access control and chain assumptions; verify every finding against the actual code; rank by demonstrated impact and exploitability.

SCOPE
- One generated Solidity strategy adapter, one contract, deployed per vault.
- Only the vault may call deposit / withdraw / withdrawAll / harvest.
- asset() is the accounting unit. totalAssets() must include idle balance + live value of deployed positions, net of liabilities.
- External capital flows must never be counted as profit in harvest().
- Testnet target: ${spec.chain} EVM deployment.

SEVERITY
- CRITICAL: funds can be stolen, drained or permanently locked; anyone can move vault capital.
- HIGH: vault withdrawals can be blocked/bricked, accounting can be inflated or falsified, authorization can be bypassed, or loss is likely under normal use.
- MEDIUM: conditional loss or griefing, oracle/slippage/decimals failure, integration assumption that is unsafe without extra checks.
- LOW: bounded issue or defensive-coding gap.
- INFO: no security impact.

RULES
- Report only issues present in this code. No generic advice, no rewrites, no code patches.
- Every finding must cite a function name or source location.
- If a claim depends on an external protocol, state what must be verified onchain.
- Verdict is FAIL when any CRITICAL or HIGH finding exists. PASS otherwise.
- Never return PASS if the file is incomplete, contains placeholders, or a required function could not be inspected.

OUTPUT — exactly one line, nothing after it:
AUDIT:{"verdict":"PASS|FAIL","summary":"<=240 chars","findings":[{"severity":"CRITICAL|HIGH|MEDIUM|LOW|INFO","title":"...","location":"function/line","impact":"...","remediation":"..."}]}

ETHSKILLS METHODOLOGY
${pack.skill}

ETHSKILLS CHECKLISTS
${checklistBlock(pack)}

TELOS IStrategy STANDARD
\`\`\`solidity
${STRATEGY_INTERFACE_SOURCE}
\`\`\``;

  const user = `Audit this contract. Name: ${spec.name}. Chain: ${spec.chain}. Asset: ${spec.asset}. Risk label: ${spec.risk}.

\`\`\`solidity
${spec.code}
\`\`\``;

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}

function normalizeSeverity(value: unknown): AuditSeverity {
  const severity = String(value ?? "").toUpperCase();
  return severity === "CRITICAL" ||
    severity === "HIGH" ||
    severity === "MEDIUM" ||
    severity === "LOW" ||
    severity === "INFO"
    ? severity
    : "INFO";
}

const SEVERITY_RANK: Record<AuditSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

export function sortFindings(findings: AuditFinding[]): AuditFinding[] {
  return [...findings].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

export function blockingFindings(audit?: StrategyAudit): AuditFinding[] {
  return (audit?.findings ?? []).filter(
    (finding) => finding.severity === "CRITICAL" || finding.severity === "HIGH",
  );
}

export function isAuditCleared(audit?: StrategyAudit): boolean {
  return (
    audit?.status === "passed" &&
    audit.verdict === "PASS" &&
    blockingFindings(audit).length === 0
  );
}

export function parseAuditReply(reply: string, pack: AuditPack): StrategyAudit {
  const markers = [...reply.matchAll(/\bAUDIT\s*:/gi)]
    .map((match) => match.index ?? -1)
    .filter((index) => index >= 0);

  // Prefer the last marker: models sometimes echo the word "AUDIT:" in prose.
  let raw: unknown = null;
  for (let index = markers.length - 1; index >= 0 && !raw; index -= 1) {
    raw = extractMarkedJson(reply.slice(markers[index]), "AUDIT");
  }

  const engine = pack.engine;
  const checkedAt = Date.now();

  if (!raw || typeof raw !== "object") {
    return {
      status: "unavailable",
      findings: [],
      engine,
      checkedAt,
      error: "the auditor did not return a parsable AUDIT block",
    };
  }

  const record = raw as {
    verdict?: unknown;
    summary?: unknown;
    findings?: unknown;
  };

  const findings: AuditFinding[] = Array.isArray(record.findings)
    ? record.findings
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item) => ({
          severity: normalizeSeverity(item.severity),
          title: String(item.title ?? "Untitled finding").slice(0, 160),
          location: String(item.location ?? "unknown location").slice(0, 120),
          impact: String(item.impact ?? "").slice(0, 400),
          remediation: String(item.remediation ?? "").slice(0, 400),
        }))
        .slice(0, 30)
    : [];

  const verdict = String(record.verdict ?? "").toUpperCase() === "PASS" ? "PASS" : "FAIL";
  const blocking = findings.some(
    (finding) => finding.severity === "CRITICAL" || finding.severity === "HIGH",
  );
  const passed = verdict === "PASS" && !blocking;

  return {
    status: passed ? "passed" : "failed",
    verdict: passed ? "PASS" : "FAIL",
    summary: String(record.summary ?? "").slice(0, 300) || undefined,
    findings: sortFindings(findings),
    engine,
    checkedAt,
  };
}

export function buildAuditRepairPrompt(audit: StrategyAudit): string {
  const findings = sortFindings(audit.findings);
  return `The ETHSKILLS security audit FAILED your previous contract. Fix the findings below without changing the IStrategy interface, then return the COMPLETE corrected file in the same format: one short sentence, the META line, then one fenced solidity block.

${findings
  .map(
    (finding, index) =>
      `${index + 1}. [${finding.severity}] ${finding.title} @ ${finding.location}\n   impact: ${finding.impact}\n   fix: ${finding.remediation}`,
  )
  .join("\n")}

Do not argue with the findings and do not omit the contract. Re-emit every required member and event.`;
}

export function auditStatusLabel(audit?: StrategyAudit): string {
  if (!audit) return "NOT AUDITED";
  switch (audit.status) {
    case "running":
      return "AUDITING…";
    case "passed":
      return "PASS";
    case "failed":
      return `FAIL${audit.findings.length ? ` · ${audit.findings.length}` : ""}`;
    case "unavailable":
      return "UNAVAILABLE";
  }
}

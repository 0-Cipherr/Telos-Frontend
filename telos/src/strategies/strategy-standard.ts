import interfaceSource from "../../contracts/IStrategy.sol?raw";
import { EVM_CHAIN_NAMES, normalizeChain } from "../chains";
import type { StrategyAudit } from "./ethskills-audit";

/**
 * Single source of truth for the Telos strategy standard.
 *
 * `contracts/IStrategy.sol` is the canonical interface. It is pulled in as raw
 * text so the prompt the model sees can never drift from the interface the
 * vaults actually compile against.
 */
export const STRATEGY_INTERFACE_SOURCE = interfaceSource.trim();

export const STRATEGY_STANDARD_RULES = [
  "Implement IStrategy exactly: same function names, argument order, mutability and return types. Never add, remove or rename interface functions.",
  "Every state-changing entry point (deposit, withdraw, withdrawAll, harvest) reverts with Unauthorized() unless msg.sender == vault.",
  "Constructor takes vault and asset plus any protocol addresses, rejects zero addresses with ZeroAddress(), and stores immutables.",
  "totalAssets() is always denominated in asset() and includes idle balance plus the live value of every deployed position, net of liabilities.",
  "deposit() never pulls tokens from the vault: the vault pre-funds the strategy. Deploy from the strategy's own balance and return the amount actually deployed.",
  "withdraw() and withdrawAll() transfer the returned asset to the vault before returning. Partial fills are allowed; report the amount actually transferred.",
  "harvest() must not move tokens. profitOrLoss = currentAssets - lastTotalAssets, and external capital flows must adjust lastTotalAssets so they are never counted as profit or loss.",
  "No admin keys, owner overrides, withdrawal pauses, delegatecall, assembly, selfdestruct, tx.origin or arbitrary external calls.",
  "Protocol addresses come from the constructor. Never hardcode a protocol, vault or token address in the source.",
  "Solidity 0.8.24, OpenZeppelin v5 SafeERC20 + ReentrancyGuard, one self-contained file, no TODOs or placeholders.",
] as const;

type Allocation = { label: string; pct: number };

export type StrategyValidation = {
  ok: boolean;
  issues: string[];
};

export type StrategySpec = {
  name: string;
  ticker: string;
  asset: string;
  chain: string;
  risk: "LOW" | "MED" | "HIGH";
  fee: number;
  thesis: string;
  allocations: Allocation[];
  guardrails: string[];
  /** Human-readable summary sent to the vault builder. */
  prompt: string;
  /** Full Solidity source produced by the model. Empty for local-sim drafts. */
  code: string;
  /** Where the contract came from: the linked model or the local template. */
  source?: "llm" | "local";
  validation?: StrategyValidation;
  /** Independent ETHSKILLS audit. Only a passing audit unlocks use. */
  audit?: StrategyAudit;
};

export type ParsedStrategyReply = {
  text: string;
  spec?: StrategySpec;
};

/*//////////////////////////////////////////////////////////////
                              PROMPT
//////////////////////////////////////////////////////////////*/

export const STRATEGY_SYSTEM_PROMPT = `You are TELOS STRATEGIST, the strategy copilot for the Telos yield hub. You can chat normally, explain trade-offs, brainstorm ideas, compare venues, and refine a strategy with the user. You only emit a Solidity contract when the user actually asks you to compile, build, generate, ship, or create a strategy.

VOICE
- concise, warm, lowercase, terminal energy without being rude.
- answer questions directly. no markdown headings. short paragraphs or bullets are fine.
- never promise returns and never give financial advice. testnet only.
- you can explain a decision, ask for context, or push back on a bad idea without forcing a contract.

CONVERSATION
- do not interrogate. ask at most ONE short clarifying question when a missing fact genuinely blocks the work.
- if the user gives partial information, infer sensible defaults and state them in one line. never stall waiting for every field.
- ordinary chat, questions, and requests for an opinion get a normal answer. do not append a contract to those replies.
- when the user asks for changes, refinements, or a different venue, discuss the change first unless they clearly asked you to recompile.
- compile immediately when the user says "compile", "build it", "ship it", "generate", "make the strategy", "just do it", "spec it", "surprise me", or otherwise confirms they want the contract.
- if the user asks for a strategy but leaves gaps, fill them with the defaults below and say what you assumed. do not ask about the creator fee more than once.

SUPPORTED CONTEXT
- EVM networks: ${EVM_CHAIN_NAMES.join(", ")}.
- Assets: USDC, USDT, DAI, WETH, WBTC, or a clear wrapper/position the user names.
- Play: lending, liquidity provision, delta-neutral, momentum, fixed yield, basis carry, rotation, or a named protocol.
- Risk: LOW, MED or HIGH.
- Creator fee: integer 0-8.
- Sensible defaults: Base, USDC, MED risk, 5% fee, lending if the play is unclear.

OUTPUT FORMAT — only when you are compiling a strategy
1. One short sentence, max 20 words. You may add one short note about assumptions.
2. A line that starts exactly with META: followed by compact JSON, never inside a code fence:
META:{"name":"...","ticker":"...","asset":"USDC","chain":"Base","risk":"LOW","fee":5,"thesis":"...","allocations":[{"label":"...","pct":100}],"guardrails":["..."]}
3. One fenced \`\`\`solidity block containing the COMPLETE file, from the SPDX line to the final closing brace.
Nothing after the closing fence.
META rules: allocations must sum to 100; fee is an integer 0-8; risk is LOW, MED or HIGH; chain is one of the supported EVM networks; ticker is at most 8 characters; guardrails has 3-5 short operational rules.
Do not output "SPEC:". Do not output a card, a table, or deployment instructions.

THE STANDARD — verbatim, do not modify or re-declare it in your output
\`\`\`solidity
${STRATEGY_INTERFACE_SOURCE}
\`\`\`

NON-NEGOTIABLE IMPLEMENTATION RULES
1. File starts with \`// SPDX-License-Identifier: UNLICENSED\` and \`pragma solidity ^0.8.24;\`.
2. Import the standard: \`import {IStrategy} from "./IStrategy.sol";\`. Use OpenZeppelin v5 \`SafeERC20\` and \`ReentrancyGuard\` (\`@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol\`, \`@openzeppelin/contracts/utils/ReentrancyGuard.sol\`).
3. Exactly one contract: \`contract <Name>Strategy is IStrategy\`. Use \`using SafeERC20 for IERC20;\` and a private \`IERC20 internal immutable _asset;\` while exposing \`address public immutable override asset;\`.
4. Constructor signature: \`constructor(address vault_, address asset_, <protocol addresses...>)\`. Reject every zero address with \`revert ZeroAddress()\`. Store \`vault\` as \`address public immutable override vault;\`. Reject a zero vault/asset even if the caller is trusted.
5. Authorization: every mutating function is \`external override nonReentrant\` and gated by an \`onlyVault\` modifier that checks \`msg.sender == vault\` and otherwise \`revert Unauthorized()\`. There is no owner, governance, pause or rescue path.
6. \`totalAssets()\` must be \`external view override\` and return: idle \`_asset.balanceOf(address(this))\` plus the live asset value of every deployed position (use the protocol's exchange rate / \`convertToAssets\` / oracle read). Never return a stale cached number and never include assets the strategy does not control. Because it is \`external\`, any call from another function in the same contract must be written \`this.totalAssets()\` — a bare \`totalAssets()\` will not compile.
7. \`deposit(uint256 assets, bytes calldata data)\`: validate \`assets > 0\` with \`revert InvalidAmount()\`; the vault has already transferred the tokens, so NEVER call \`transferFrom\`. Deploy from the strategy's own balance, measure the actual amount deployed, leave unused tokens idle, emit \`Deposited(vault, assets, assetsDeployed)\` and return the actual amount. Unused \`data\` must be unnamed in the implementation to avoid warnings.
8. \`withdraw(uint256 assets, bytes calldata data)\`: cap the request at \`totalAssets()\`; free assets from the protocol into THIS contract (do not pass the vault as the protocol recipient); transfer the freed balance to \`vault\` with \`safeTransfer\` BEFORE returning; emit \`Withdrawn(vault, assets, assetsReturned)\`; return the actual amount that reached the vault. A partial fill is valid. Revert \`InsufficientLiquidity()\` only when nothing can be returned. Account for the outflow exactly: snapshot \`uint256 vaultBefore = _asset.balanceOf(vault)\` at the start of the function, then after settling set \`assetsReturned = _asset.balanceOf(vault) - vaultBefore\` and subtract that from \`_lastTotalAssets\` (clamped at zero).
9. \`withdrawAll(bytes calldata data)\`: exit every position the strategy controls, transfer the entire idle asset balance to \`vault\` BEFORE returning, emit \`WithdrawnAll(vault, assetsReturned)\`, and return the actual amount. Never revert because a position is illiquid; return what you recovered. Measure \`assetsReturned\` with the same vault balance delta, then set \`_lastTotalAssets = 0\`.
10. \`harvest(bytes calldata data)\` must not transfer tokens. Compute \`currentAssets = totalAssets()\`; \`profitOrLoss = int256(currentAssets) - int256(_lastTotalAssets)\`; then set \`_lastTotalAssets = currentAssets\`; emit \`Harvested(vault, currentAssets, profitOrLoss)\`. Guard the int256 casts so a value above type(int256).max cannot wrap.
11. External capital flows are NOT profit. The vault pre-funds deposit, so that call is \`_lastTotalAssets += assets\` (the full pre-funded amount, not just the deployed delta). On withdraw/withdrawAll subtract the exact vault balance delta. The harvest identity must hold: deposit then immediate harvest reports 0, and withdraw then immediate harvest reports 0.
12. Source must compile cleanly with 0.8.24. No TODO, no \`...\`, no placeholder or zero addresses in the body, no hardcoded protocol/token/vault addresses, no \`delegatecall\`, \`assembly\`, \`selfdestruct\`, \`tx.origin\`, unbounded loops or arrays, and no upgradeable proxy.
13. Protocol-specific code: declare only the minimal external interface you call inside the file, with the protocol address supplied through the constructor. If a protocol's exact ABI is uncertain, use a well-known, liquid venue on that chain and keep the integration surface minimal. Declare that interface in THIS file but at FILE LEVEL, outside the contract — do not nest an interface inside the contract body — and never import "./interfaces/...", "./libraries/..." or any other local file.
14. The contract must be standalone: the ONLY allowed imports are \`./IStrategy.sol\` and OpenZeppelin imports. It must be safe to deploy as-is on the target testnet.

SELF-CHECK BEFORE YOU COMPILE
An independent ETHSKILLS security audit runs before this contract can be registered. Write as if a hostile reviewer will try to drain it.
- all seven IStrategy members exist with matching signatures and \`override\`
- all four mutating functions are nonReentrant and onlyVault
- all four events are emitted
- deposit does not transferFrom
- withdraw/withdrawAll settle to the vault before returning (safeTransfer, or a protocol call whose recipient is the vault)
- harvest moves no tokens and adjusts _lastTotalAssets for flows; internal calls use this.totalAssets()
- deposit does \`_lastTotalAssets += assets\`; withdraw measures the vault balance delta and subtracts it; withdrawAll zeroes it
- protocol interfaces are declared at file level; no local imports besides ./IStrategy.sol
- no forbidden constructs, no placeholders
Only then emit META plus the solidity block.`;

/**
 * True when the user is clearly asking for a contract, not just chatting.
 * The chat uses this to decide whether a missing contract is a problem.
 */
export function wantsCompileRequest(text: string): boolean {
  const value = text.trim().toLowerCase();
  if (!value) return false;
  if (/\b(compile|recompile|ship it|ship this|spec it|just do it|do it|let'?s go|surprise me)\b/.test(value)) {
    return true;
  }
  return /\b(compile|build|generate|emit|write|draft|create|make|code)\b[^.!?]{0,24}\b(contract|strategy|vault|it|this|that|one)\b/.test(
    value,
  );
}


/*//////////////////////////////////////////////////////////////
                        OUTPUT PARSING
//////////////////////////////////////////////////////////////*/

export function extractMarkedJson(source: string, marker: string): unknown {
  const match = new RegExp(`${marker}\\s*:`, "i").exec(source);
  if (!match) return null;
  const start = source.indexOf("{", match.index + match[0].length);
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(source.slice(start, index + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function looksLikeStrategy(body: string): boolean {
  return /pragma\s+solidity/i.test(body) || /contract\s+\w+\s+is\s+IStrategy/i.test(body);
}

export function extractStrategyCode(content: string): string {
  const fence = /```[ \t]*(?:solidity|sol)?[ \t]*\r?\n([\s\S]*?)```/gi;
  for (const match of content.matchAll(fence)) {
    const body = match[1].trim();
    if (looksLikeStrategy(body)) return body;
  }

  // Some models forget the fence. Recover from the SPDX/pragma line.
  const start = content.search(/\/\/\s*SPDX-License-Identifier/i);
  const pragma = content.search(/pragma\s+solidity/i);
  const from = start >= 0 ? start : pragma;
  if (from < 0) return "";
  const tail = content.slice(from);
  const end = tail.lastIndexOf("}");
  return end >= 0 ? tail.slice(0, end + 1).trim() : "";
}

export function extractContractName(code: string): string {
  const match = code.match(/contract\s+([A-Za-z_]\w*)\s+is\s+IStrategy/);
  return match?.[1] ?? "";
}

function deriveName(code: string, fallback: string): string {
  return extractContractName(code).replace(/Strategy$/, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2") || fallback;
}

function deriveTicker(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? parts.map((part) => part[0]).join("") : name.slice(0, 3);
  return initials.toUpperCase().slice(0, 8) || "TLS";
}

function normalizeAllocations(raw: unknown): Allocation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is { label: string; pct: number } =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as { label?: unknown }).label === "string" &&
        Number.isFinite((item as { pct?: unknown }).pct),
    )
    .map((item) => ({
      label: item.label.trim() || "Strategy sleeve",
      pct: Math.max(0, Math.min(100, Math.round(item.pct))),
    }))
    .slice(0, 8);
}

function buildPromptSummary(spec: Omit<StrategySpec, "prompt">): string {
  const contract = extractContractName(spec.code);
  return [
    `TELOS STRATEGY — ${spec.name} (${spec.ticker})`,
    contract ? `Contract: ${contract}.sol · IStrategy` : "Contract: pending",
    `Chain: ${spec.chain} (EVM)`,
    `Asset: ${spec.asset}`,
    `Risk: ${spec.risk}`,
    `Creator fee: ${spec.fee}%`,
    "Allocations:",
    ...spec.allocations.map((item) => `- ${item.pct}% ${item.label}`),
    "Guardrails:",
    ...spec.guardrails.map((item) => `- ${item}`),
    `Thesis: ${spec.thesis}`,
  ].join("\n");
}

export function parseStrategyReply(content: string): ParsedStrategyReply {
  const text = visibleAnswer(content);
  const code = extractStrategyCode(content);
  const raw = extractMarkedJson(content, "META");

  if (!code) return { text };

  const meta = (raw && typeof raw === "object" ? raw : {}) as Partial<StrategySpec>;
  const name = String(meta.name ?? "").trim().slice(0, 48) || deriveName(code, "Telos Strategy");
  const asset = String(meta.asset ?? "USDC").toUpperCase().slice(0, 10);
  const chain = normalizeChain(String(meta.chain ?? "Base"), "Base");
  const risk = meta.risk === "LOW" || meta.risk === "HIGH" ? meta.risk : "MED";
  const parsedFee = Number(meta.fee);
  const fee = Number.isFinite(parsedFee)
    ? Math.max(0, Math.min(8, Math.round(parsedFee)))
    : 5;
  const allocations = normalizeAllocations(meta.allocations);
  const guardrails = Array.isArray(meta.guardrails)
    ? meta.guardrails.filter((item): item is string => typeof item === "string").slice(0, 6)
    : [];
  const validation = validateStrategySource(code);

  const spec: StrategySpec = {
    name,
    ticker: String(meta.ticker ?? deriveTicker(name)).toUpperCase().slice(0, 8),
    asset,
    chain,
    risk,
    fee,
    thesis: String(meta.thesis ?? "LLM-compiled IStrategy adapter.").slice(0, 280),
    allocations: allocations.length ? allocations : [{ label: "Single strategy sleeve", pct: 100 }],
    guardrails: guardrails.length
      ? guardrails
      : ["Only the authorized vault can move capital.", "Harvest excludes external capital flows."],
    prompt: "",
    code,
    source: "llm",
    validation,
  };
  spec.prompt = buildPromptSummary(spec);
  return { text, spec };
}

/** Prose only: hide META and the contract while the stream is still arriving. */
export function visibleAnswer(content: string): string {
  const meta = content.search(/\bMETA\s*:/i);
  const fence = content.search(/```[ \t]*(?:solidity|sol)?[ \t]*\r?\n/i);
  const cuts = [meta, fence].filter((index) => index >= 0);
  const cut = cuts.length ? Math.min(...cuts) : -1;
  let visible = cut >= 0 ? content.slice(0, cut) : content;

  // A marker that is still arriving (e.g. the lone "M" before "ETA:") would
  // otherwise flash in the bubble and then get stuck there while the contract
  // streams, because the following updates are empty and get skipped.
  visible = visible.replace(/(?:^|\n)[ \t]*(?:M(?:E(?:T(?:A)?)?)?|`{1,3}[a-zA-Z]*)[ \t]*$/i, "");

  return visible.trim();
}

export function strategyFileName(spec: StrategySpec): string {
  const contract = extractContractName(spec.code);
  if (contract) return `${contract}.sol`;
  const clean = spec.name.replace(/[^A-Za-z0-9]/g, "");
  return `${clean || "Telos"}Strategy.sol`;
}

/*//////////////////////////////////////////////////////////////
                           VALIDATION
//////////////////////////////////////////////////////////////*/

function findBody(source: string, pattern: RegExp): string | null {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const matcher = new RegExp(pattern.source, flags);

  for (let match = matcher.exec(source); match; match = matcher.exec(source)) {
    const open = source.indexOf("{", match.index);
    if (open < 0) return null;

    // Generated contracts often declare minimal protocol interfaces inline
    // (e.g. `interface IPool { function withdraw(...) external; }`). Those
    // declarations end in `;` and have no body, so the next `{` belongs to a
    // completely different block. Skip them instead of validating a stub.
    const semi = source.indexOf(";", match.index);
    if (semi >= 0 && semi < open) continue;

    let depth = 0;
    let inString: string | null = null;
    for (let index = open; index < source.length; index += 1) {
      const char = source[index];
      if (inString) {
        if (char === "\\") index += 1;
        else if (char === inString) inString = null;
        continue;
      }
      if (char === '"' || char === "'") {
        inString = char;
        continue;
      }
      if (char === "{") depth += 1;
      else if (char === "}") {
        depth -= 1;
        if (depth === 0) return source.slice(match.index, index + 1);
      }
    }
    return null;
  }
  return null;
}

function functionBody(source: string, name: string): string | null {
  return findBody(source, new RegExp(`function\\s+${name}\\s*\\(`));
}

const MUTATING_FUNCTIONS = ["deposit", "withdraw", "withdrawAll", "harvest"] as const;

/**
 * Deterministic structural gate. It cannot prove a contract is correct, but it
 * rejects every drift from the standard that would break the vault integration.
 */
export function validateStrategySource(source: string): StrategyValidation {
  const code = source.trim();
  const issues: string[] = [];
  const add = (issue: string) => {
    if (issues.length < 10 && !issues.includes(issue)) issues.push(issue);
  };

  if (!code) return { ok: false, issues: ["no Solidity source was produced"] };

  if (!/\/\/\s*SPDX-License-Identifier/i.test(code)) add("missing SPDX license line");
  if (!/pragma\s+solidity\s+(?:\^|>=)\s*0\.8\.24/i.test(code)) add("pragma must be ^0.8.24");
  if (!/import\s*\{[^}]*IStrategy[^}]*\}\s*from\s*["'][^"']*IStrategy\.sol["']/.test(code)) {
    add('missing import {IStrategy} from "./IStrategy.sol"');
  }

  // The vault compiles exactly one file plus ./IStrategy.sol and OZ. A model
  // that invents `./interfaces/...` produces a contract that cannot compile,
  // so reject it here instead of letting it reach the audit/deploy step.
  const imports = [...code.matchAll(/\bimport\s+(?:[^"']*?\bfrom\s*)?["']([^"']+)["']/g)];
  for (const [, path] of imports) {
    if (path === "./IStrategy.sol" || path.startsWith("@openzeppelin/")) continue;
    add(`unsupported import "${path}" — declare protocol interfaces inline`);
  }

  const contract = /contract\s+([A-Za-z_]\w*)\s+is\s+IStrategy/.exec(code);
  if (!contract) add("contract must declare `is IStrategy`");
  else if (!/override/.test(code)) add("interface members must be marked override");

  // Solidity only allows contract/interface declarations at file level. A
  // nested `interface` inside the strategy body cannot compile.
  const contractBody = findBody(code, /contract\s+[A-Za-z_]\w*\s+is\s+IStrategy/) ?? "";
  if (/\binterface\s+[A-Za-z_]\w*/.test(contractBody)) {
    add("protocol interfaces must be declared at file level, outside the contract");
  }

  for (const fn of ["asset", "vault", "totalAssets", ...MUTATING_FUNCTIONS]) {
    const asFunction = new RegExp(`function\\s+${fn}\\s*\\(`).test(code);
    const asPublicVar = new RegExp(
      `(?:\\b${fn}\\b[^;\\n]*\\bpublic\\b|\\bpublic\\b[^;\\n]*\\b${fn}\\b)`,
    ).test(code);
    if (!asFunction && !(asPublicVar && (fn === "asset" || fn === "vault"))) {
      add(`missing required ${fn}() member`);
    }
  }

  const authModifier = findBody(code, /modifier\s+onlyVault\b/);
  const modifierGuards =
    Boolean(authModifier) && /msg\.sender/.test(authModifier!) && /Unauthorized/.test(authModifier!);

  for (const fn of MUTATING_FUNCTIONS) {
    const body = functionBody(code, fn);
    if (!body) continue;
    const inlineGuard = /msg\.sender/.test(body) && /Unauthorized/.test(body);
    if (!modifierGuards && !inlineGuard) {
      add(`${fn}() is not gated on msg.sender == vault`);
    }
    if (!/nonReentrant/.test(body)) add(`${fn}() must be nonReentrant`);
  }

  const totalBody = functionBody(code, "totalAssets") ?? "";
  if (totalBody && !/balanceOf/.test(totalBody)) add("totalAssets() must include the idle asset balance");

  const depositBody = functionBody(code, "deposit") ?? "";
  // Case-insensitive: `safeTransferFrom` has a capital T and was slipping
  // through a case-sensitive check.
  if (depositBody && /transferfrom/i.test(depositBody)) {
    add("deposit() must not pull tokens from the vault");
  }

  for (const fn of ["withdraw", "withdrawAll"] as const) {
    const body = functionBody(code, fn) ?? "";
    // Two valid patterns: the strategy transfers the freed tokens itself, or
    // it tells the protocol to pay the vault directly (e.g. Aave
    // `pool.withdraw(asset, amount, vault)`). Both settle before returning.
    const sendsToVault =
      /safeTransfer\s*\([^)]*\bvault\b/.test(body) ||
      /\.transfer\s*\([^)]*\bvault\b/.test(body) ||
      /\b[A-Za-z_]\w*\.[A-Za-z_]\w*\s*\([^;{}]*\bvault\b/.test(body);
    if (body && !sendsToVault) {
      add(`${fn}() must transfer assets back to the vault`);
    }
    if (body && !/\bvault\b/.test(body) && !/msg\.sender/.test(body)) {
      add(`${fn}() must send assets to the vault`);
    }
  }

  const harvestBody = functionBody(code, "harvest") ?? "";
  if (harvestBody) {
    if (!/last[A-Za-z]*TotalAssets|totalAssetsSnapshot/i.test(harvestBody)) {
      add("harvest() must track a lastTotalAssets snapshot");
    }
    if (/safeTransfer|\.transfer\s*\(/.test(harvestBody)) {
      add("harvest() must not transfer tokens");
    }
  }

  // IStrategy declares totalAssets() as external, so a bare internal call from
  // deposit/withdraw/withdrawAll/harvest does not compile. It must be `this.`.
  for (const fn of MUTATING_FUNCTIONS) {
    const body = functionBody(code, fn) ?? "";
    if (/\btotalAssets\s*\(/.test(body) && !/\bthis\.totalAssets\s*\(/.test(body)) {
      add(`${fn}() calls external totalAssets() without this.`);
    }
  }

  for (const event of ["Deposited", "Withdrawn", "WithdrawnAll", "Harvested"]) {
    if (!new RegExp(`emit\\s+${event}\\s*\\(`).test(code)) add(`missing emit ${event}`);
  }

  const forbidden: [RegExp, string][] = [
    [/\btx\.origin\b/, "tx.origin is forbidden"],
    [/\bdelegatecall\b/, "delegatecall is forbidden"],
    [/\bselfdestruct\b/, "selfdestruct is forbidden"],
    [/\bassembly\b/, "assembly is forbidden"],
    [/\b(?:TODO|FIXME|YOUR_|PLACEHOLDER)\b/i, "source contains a placeholder"],
    [/\.\.\./, "source contains an ellipsis placeholder"],
  ];
  for (const [pattern, message] of forbidden) {
    if (pattern.test(code)) add(message);
  }

  const hardcoded = code.match(/\b0x[a-fA-F0-9]{40}\b/g) ?? [];
  if (hardcoded.some((address) => !/^0x0{40}$/i.test(address))) {
    add("protocol/token addresses must come from the constructor, not literals");
  }

  return { ok: issues.length === 0, issues };
}

export function buildRepairPrompt(issues: string[]): string {
  return `The contract you just returned failed the Telos strategy validator. Fix every issue below and return the COMPLETE corrected file again in the same format: one short sentence, the META line, then one fenced solidity block.

ISSUES
${issues.map((issue, index) => `${index + 1}. ${issue}`).join("\n")}

Rules reminder: implement IStrategy exactly, gate deposit/withdraw/withdrawAll/harvest on msg.sender == vault, emit all four events, deposit must not transferFrom and must add the full pre-funded \`assets\` to _lastTotalAssets, withdraw/withdrawAll must safeTransfer to the vault before returning and subtract the vault balance delta from _lastTotalAssets, harvest must move no tokens and must adjust lastTotalAssets for external capital flows. Only import ./IStrategy.sol and @openzeppelin/... — declare every protocol interface at file level in the same file (never nested inside the contract, never imported from a local path). Because totalAssets() is external, call it as this.totalAssets() from other functions. No placeholders, no hardcoded addresses, no forbidden constructs.`;
}

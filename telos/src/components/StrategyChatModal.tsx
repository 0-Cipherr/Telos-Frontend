import { useEffect, useRef, useState, type FormEvent } from "react";
import { CHAIN_ALIAS_PATTERN, normalizeChain } from "../chains";
import { lockBodyScroll } from "../utils/scrollLock";
import { buildLocalContract } from "../strategies/local-contract";
import {
  auditStatusLabel,
  blockingFindings,
  buildAuditMessages,
  buildAuditRepairPrompt,
  fetchAuditPack,
  isAuditCleared,
  parseAuditReply,
  type StrategyAudit,
} from "../strategies/ethskills-audit";
import {
  STRATEGY_SYSTEM_PROMPT,
  buildRepairPrompt,
  parseStrategyReply,
  strategyFileName,
  validateStrategySource,
  visibleAnswer,
  wantsCompileRequest,
  type StrategySpec,
} from "../strategies/strategy-standard";
import { loadSavedStrategies } from "../strategies/strategy-store";

export type { StrategySpec } from "../strategies/strategy-standard";

type Role = "bot" | "user" | "sys";

type Message = {
  id: number;
  role: Role;
  text: string;
  chips?: string[];
  card?: StrategySpec;
};

type Draft = {
  goal?: string;
  asset?: string;
  chain?: string;
  risk?: "LOW" | "MED" | "HIGH";
  fee?: number;
  protocol?: string;
};

type StrategyChatModalProps = {
  open: boolean;
  onClose: () => void;
  onUseStrategy: (spec: StrategySpec) => void;
};

const KEY_STORAGE = "telos.llm.key";
const MODEL_STORAGE = "telos.llm.model";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
// Dev/preview server proxy (see vite.config.ts). Keeps the API key server-side
// so the lab is usable without any login/paste-a-key step.
const PROXY_URL = "/api/chat";
const DIRECT_URL = "https://openrouter.ai/api/v1/chat/completions";
// Free OpenRouter models queue before the first token, so be patient. The
// strongest free coder model takes ~40s for a full contract. The modal still
// shows a "computing" indicator while it waits.
const FIRST_TOKEN_TIMEOUT_MS = 60_000;
const HARD_TIMEOUT_MS = 240_000;
const MAX_REPAIRS = 2;
// Free models sometimes echo the request instead of compiling. One strict
// nudge is usually enough to get back on format.
const NO_CONTRACT_PROMPT = `The user asked you to compile a strategy, but your last reply did not contain a Solidity contract. Do not repeat the request or apologize. If a required fact is genuinely missing, ask exactly ONE short question. Otherwise emit the strategy now: one short sentence, the META: line, then one fenced solidity block containing the COMPLETE file.`;
const AUDIT_TIMEOUT_MS = 200_000;

const WELCOME =
  "hey — i'm strategist, your telos strategy copilot. we can just talk through an idea, compare venues, or compile a real IStrategy contract when you're ready. nothing gets registered until it passes verification in the strategy modal.";

const WELCOME_CHIPS = [
  "USDC lending on Base, low risk",
  "Delta-neutral USDC on Arbitrum",
  "Explain funding carry vs lending",
  "🎲 surprise me",
];

function readStorage(key: string, fallback: string): string {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: string) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    /* localStorage can be unavailable; the lab still works for this session. */
  }
}

function extractDraft(text: string, previous: Draft): Draft {
  const next: Draft = { ...previous };
  const lower = text.toLowerCase();

  const asset = lower.match(/\b(usdc|usdt|dai|weth|eth|wbtc|btc|sol)\b/)?.[1];
  if (asset) {
    next.asset =
      asset === "eth" ? "WETH" : asset === "btc" ? "WBTC" : asset.toUpperCase();
  }

  const chain = lower.match(CHAIN_ALIAS_PATTERN)?.[1];
  if (chain) next.chain = normalizeChain(chain, "Base");

  if (/\b(low|safe|stable|conservative|chill|careful)\b/.test(lower)) {
    next.risk = "LOW";
  } else if (/\b(high|degen|aggressive|spicy|ape|maxi|turbo)\b/.test(lower)) {
    next.risk = "HIGH";
  } else if (/\b(med|medium|balanced|moderate|mid)\b/.test(lower)) {
    next.risk = "MED";
  }

  const fee = lower.match(/\b(\d{1,2})\s*%/);
  if (fee) next.fee = Math.max(0, Math.min(8, Number(fee[1])));

  const protocol = lower.match(
    /\b(aave|morpho|aerodrome|pendle|gmx|uniswap|curve)\b/,
  )?.[1];
  if (protocol) {
    next.protocol = protocol.charAt(0).toUpperCase() + protocol.slice(1);
  }

  if (/delta|neutral|hedg|basis/.test(lower)) {
    next.goal = "Delta-neutral";
  } else if (/stable|yield|lend|tbill|t-bill|savings/.test(lower)) {
    next.goal = "Stable yield";
  } else if (/momentum|trend|breakout|eth\b|weth\b/.test(lower)) {
    next.goal = "Momentum";
  } else if (/\blp\b|liquidity|pool|farm/.test(lower)) {
    next.goal = "LP fees";
  } else if (text.trim().length > 12) {
    next.goal = "Balanced yield";
  }

  return next;
}

function nextQuestion(draft: Draft): { text: string; chips: string[] } | null {
  if (!draft.goal) {
    return {
      text: "what's the play? i can also just pick something sensible if you say surprise me.",
      chips: [
        "Stable yield",
        "Delta-neutral",
        "ETH momentum",
        "LP fees",
        "🎲 surprise me",
      ],
    };
  }
  if (!draft.risk) {
    return {
      text: "how spicy are we going? say 'defaults' and i'll use balanced risk.",
      chips: ["Low risk", "Balanced", "Degen", "Use defaults"],
    };
  }
  if (!draft.chain) {
    return {
      text: "which chain should the strategy target? (deposits still settle on Robinhood Testnet)",
      chips: ["Base", "Arbitrum", "Ethereum", "Robinhood Testnet", "Use defaults"],
    };
  }
  if (!draft.asset) {
    return {
      text: "what asset should it hold?",
      chips: ["USDC", "WETH", "DAI", "WBTC", "Use defaults"],
    };
  }
  return null;
}

function pick<T>(items: T[], seed: string): T {
  let total = 0;
  for (let i = 0; i < seed.length; i += 1) total += seed.charCodeAt(i);
  return items[total % items.length];
}

function buildStrategy(input: Draft): StrategySpec {
  const goal = input.goal ?? "Balanced yield";
  const asset = input.asset ?? "USDC";
  const chain = normalizeChain(input.chain ?? "Base", "Base");
  const risk = input.risk ?? "MED";
  const fee = input.fee ?? 5;

  const lending = "Aave v3";
  const lp =
    chain === "Base"
      ? "Aerodrome"
      : chain === "Arbitrum"
        ? "Camelot"
        : "Uniswap v3";
  const hedge =
    chain === "Base"
      ? "Pendle"
      : chain === "Arbitrum"
        ? "GMX"
        : "Pendle";
  const protocol = input.protocol;
  const pair =
    asset === "USDC" || asset === "USDT" || asset === "DAI"
      ? "USDC/USDT"
      : `${asset}/USDC`;

  const sleeve =
    protocol && protocol !== "Any"
      ? protocol
      : /stable|delta/i.test(goal)
        ? lending
        : /lp/i.test(goal)
          ? lp
          : hedge;

  let allocations: { label: string; pct: number }[];
  if (/delta/i.test(goal)) {
    allocations = [
      { label: `${lending} — ${asset} lending base`, pct: 50 },
      { label: `${hedge} — fixed-yield hedge`, pct: 30 },
      { label: "Stable buffer / dry powder", pct: 20 },
    ];
  } else if (/stable/i.test(goal)) {
    allocations =
      risk === "LOW"
        ? [
            { label: `${sleeve} — ${asset} lending`, pct: 75 },
            { label: `${lp} — ${pair} pool`, pct: 25 },
          ]
        : [
            { label: `${sleeve} — ${asset} lending`, pct: 55 },
            { label: `${lp} — ${pair} pool`, pct: 35 },
            { label: "Stable buffer / dry powder", pct: 10 },
          ];
  } else if (/lp/i.test(goal)) {
    allocations = [
      { label: `${sleeve} — concentrated ${asset} LP`, pct: risk === "HIGH" ? 60 : 40 },
      { label: `${lending} — lending sleeve`, pct: risk === "HIGH" ? 20 : 45 },
      { label: "Stable buffer / dry powder", pct: risk === "HIGH" ? 20 : 15 },
    ];
  } else {
    allocations = [
      { label: `${sleeve} — ${asset} momentum leg`, pct: risk === "HIGH" ? 55 : 35 },
      { label: `${lending} — collateral yield`, pct: risk === "HIGH" ? 25 : 45 },
      { label: "Stable buffer / dry powder", pct: risk === "HIGH" ? 20 : 20 },
    ];
  }

  const bases: Record<string, string[]> = {
    "Stable yield": ["Steady Stack", "Boring Alpha", "T-Bill Maxi"],
    "Delta-neutral": ["Delta Shield", "Neutral Zone", "Basis Bandit"],
    Momentum: ["Momentum Rig", "Trend Surfer", "Turbo Trend"],
    "LP fees": ["LP Machine", "Pool Party", "Fee Farmer"],
    "Balanced yield": ["Balanced Beam", "Yield Mixer", "Middle Path"],
  };
  const name = `${asset} ${pick(bases[goal] ?? bases["Balanced yield"], goal + asset)}`;
  const ticker = `${asset.slice(0, 3)}X`.toUpperCase().slice(0, 8);

  const riskLine =
    risk === "LOW"
      ? "capital preservation first"
      : risk === "MED"
        ? "risk-adjusted yield"
        : "maximum yield, maximum sweat";

  const thesis = `${goal} sleeve on ${chain}, chasing ${riskLine}. Rotates into ${lp} when lending APR compresses. Testnet draft — not financial advice.`;

  const guardrails = [
    "Creator fee hard-capped at 8%.",
    risk === "HIGH"
      ? "Max 2x leverage; auto-deleverage at 15% drawdown."
      : "No leverage above 1.25x.",
    `Rebalance monthly or on ${risk === "HIGH" ? "3%" : "5%"} allocation drift.`,
    "Pause deposits if oracle staleness exceeds 15 minutes.",
    "Withdraw-only mode if TVL drops 30% in 24 hours.",
  ];

  const prompt = [
    `TELOS STRATEGY SPEC — ${name} (${ticker})`,
    `Chain: ${chain} (EVM)`,
    `Asset: ${asset}`,
    `Risk: ${risk}`,
    `Creator fee: ${fee}%`,
    "Allocations:",
    ...allocations.map((item) => `- ${item.pct}% ${item.label}`),
    "Guardrails:",
    ...guardrails.map((item) => `- ${item}`),
    `Thesis: ${thesis}`,
  ].join("\n");

  // The local engine always ships a contract. It is intentionally a simple
  // idle-asset adapter, clearly marked as unaudited in the UI.
  const local = buildLocalContract({ name, asset, chain, risk, thesis });
  const code = local.code;

  return {
    name,
    ticker,
    asset,
    chain,
    risk,
    fee,
    thesis,
    allocations,
    guardrails,
    prompt,
    code,
    source: "local",
    validation: validateStrategySource(code),
    audit: {
      status: "unavailable",
      findings: [],
      engine: "telos local template",
      error: "LLM offline — deterministic IStrategy template, not audited",
      checkedAt: Date.now(),
    },
  };
}

const RANDOM_DRAFTS: Draft[] = [
  { goal: "Stable yield", risk: "LOW", chain: "Base", asset: "USDC", fee: 5, protocol: "Morpho" },
  { goal: "Delta-neutral", risk: "MED", chain: "Arbitrum", asset: "USDC", fee: 8, protocol: "Pendle" },
  { goal: "Momentum", risk: "HIGH", chain: "Ethereum", asset: "WETH", fee: 8, protocol: "Aave" },
  { goal: "LP fees", risk: "MED", chain: "Base", asset: "WETH", fee: 5, protocol: "Aerodrome" },
  { goal: "LP fees", risk: "MED", chain: "Optimism", asset: "USDC", fee: 6, protocol: "Uniswap" },
  { goal: "Stable yield", risk: "LOW", chain: "Telos", asset: "USDC", fee: 6, protocol: "Telos" },
];

// The model streams prose first, then META, then the Solidity block. Showing
// the JSON/code as it arrives looks broken, so only prose is rendered live.

function describeHttpError(status: number, detail: string): string {
  let extra = detail;
  try {
    const parsed = JSON.parse(detail) as { error?: string | { message?: string } };
    if (typeof parsed.error === "string") extra = parsed.error;
    else if (parsed.error && typeof parsed.error === "object") {
      extra = parsed.error.message ?? extra;
    }
  } catch {
    /* not json — keep the raw text */
  }

  const dailyLimit = /free-models-per-day/i.test(detail);
  const hint =
    status === 401
      ? "openrouter rejected the key"
      : status === 402
        ? "openrouter credits exhausted"
        : status === 404
          ? "model id not found"
          : status === 429
            ? dailyLimit
              ? "free-model daily limit reached (50/day without credits) — add credits or retry after the reset"
              : "rate limited — free models queue hard, try again in a few seconds"
            : status === 503
              ? "no server-side key on the dev proxy"
              : status >= 500
                ? "provider hiccup on openrouter's side"
                : "request failed";
  const trimmed = extra.replace(/\s+/g, " ").trim().slice(0, 140);
  return `${hint} (${status})${trimmed ? ` — ${trimmed}` : ""}`;
}

export default function StrategyChatModal({
  open,
  onClose,
  onUseStrategy,
}: StrategyChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [apiKey, setApiKey] = useState(() => readStorage(KEY_STORAGE, ""));
  const [keyDraft, setKeyDraft] = useState(() => readStorage(KEY_STORAGE, ""));
  const [model, setModel] = useState(() => readStorage(MODEL_STORAGE, DEFAULT_MODEL));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [server, setServer] = useState<{
    checked: boolean;
    ready: boolean;
    model?: string;
  }>({ checked: false, ready: false });
  const [savedCount, setSavedCount] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [thinkingTokens, setThinkingTokens] = useState(0);
  const [auditing, setAuditing] = useState(false);

  const draftRef = useRef<Draft>({});
  const historyRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const seededRef = useRef(false);
  const idRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const abortReasonRef = useRef<"user" | "timeout" | null>(null);
  const requestRef = useRef(0);
  const repairsRef = useRef(0);
  const repairTimerRef = useRef(0);
  const auditAbortRef = useRef<AbortController | null>(null);
  const auditSeqRef = useRef(0);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const llmReady = apiKey.trim().length > 8;
  // Prefer the user's own key when present. Otherwise use the keyless server
  // proxy (vite.config.ts), including before its health check resolves so the
  // first message doesn't get pushed onto the slower local fallback.
  const useProxy = !llmReady && (server.ready || !server.checked);
  const activeModel = llmReady
    ? model.replace(/^.*\//, "")
    : (server.model ?? "local-engine").replace(/^.*\//, "");
  const engineLabel = llmReady
    ? "BYOK LINK"
    : server.ready
      ? "TELOS LINK"
      : server.checked
        ? "LOCAL SIM"
        : "CONNECTING";

  // Ask the dev proxy whether it has a server-side key. Short timeout so a
  // static/prod deploy (no proxy) fails over to the local engine instantly.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 1500);
    fetch(PROXY_URL, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { ok?: boolean; model?: string };
      })
      .then((data) => {
        if (!cancelled) {
          setServer({ checked: true, ready: Boolean(data?.ok), model: data?.model });
        }
      })
      .catch(() => {
        if (!cancelled) setServer({ checked: true, ready: false });
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open]);

  const pushMessage = (message: Omit<Message, "id">) => {
    idRef.current += 1;
    const entry = { ...message, id: idRef.current };
    setMessages((current) => [...current, entry]);
    return entry;
  };

  const updateMessage = (id: number, patch: Partial<Omit<Message, "id">>) => {
    setMessages((current) =>
      current.map((message) => (message.id === id ? { ...message, ...patch } : message)),
    );
  };

  const pushBot = (text: string, chips?: string[], card?: StrategySpec) =>
    pushMessage({ role: "bot", text, chips, card });

  useEffect(() => {
    return () => {
      abortRef.current?.abort("unmount");
      auditAbortRef.current?.abort();
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
      window.clearTimeout(repairTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!seededRef.current) {
      seededRef.current = true;
      pushBot(WELCOME, WELCOME_CHIPS);
    }
    setSavedCount(loadSavedStrategies().length);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => {
      window.clearTimeout(focusTimer);
      // Closing the lab cancels an in-flight audit instead of spending credits
      // in the background.
      auditAbortRef.current?.abort();
      auditAbortRef.current = null;
      auditSeqRef.current += 1;
      setAuditing(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, typing]);

  const generateFrom = (draft: Draft) => {
    const spec = buildStrategy(draft);
    pushBot(
      "local compile ✓ — deterministic IStrategy template attached. it is not protocol-specific and not audited, so it will open in the create-strategy modal as an unverified draft. you can still review and register it there.",
      undefined,
      spec,
    );
  };

  const advanceLocal = (text: string) => {
    const next = extractDraft(text, draftRef.current);
    draftRef.current = next;

    if (/surprise|random|🎲|whatever|idk/i.test(text)) {
      const randomDraft = { ...RANDOM_DRAFTS[Math.floor(Math.random() * RANDOM_DRAFTS.length)] };
      draftRef.current = randomDraft;
      generateFrom(randomDraft);
      return;
    }

    if (/^(hi|hey|hello|yo|sup|gm)\b/i.test(text.trim())) {
      pushBot(
        "hey. want to talk through a strategy, or should i compile one? try: “compile a low-risk USDC lending strategy on Base”.",
        ["Compile a USDC lending strategy on Base", "Explain funding carry", "🎲 surprise me"],
      );
      return;
    }

    if (/help|what can you|how does this work|who are you/i.test(text)) {
      pushBot(
        "i can chat through ideas, compare venues, and compile a complete IStrategy contract when you ask. contracts go to the create-strategy modal for verification before they can be registered. deposits settle on Robinhood Testnet while strategies can target any supported EVM chain.",
        ["Compile a delta-neutral USDC strategy", "What chains are supported?", "🎲 surprise me"],
      );
      return;
    }

    if (/use defaults?|defaults?/i.test(text)) {
      const defaults: Draft = {
        goal: next.goal ?? "Stable yield",
        risk: next.risk ?? "MED",
        chain: next.chain ?? "Base",
        asset: next.asset ?? "USDC",
        fee: next.fee ?? 5,
      };
      draftRef.current = defaults;
      generateFrom(defaults);
      return;
    }

    if (
      wantsCompileRequest(text) &&
      (next.goal || next.risk || next.chain || next.asset)
    ) {
      generateFrom(next);
      return;
    }

    const question = nextQuestion(next);
    if (!question) {
      generateFrom(next);
      return;
    }

    if (!next.goal && !next.risk && !next.chain && !next.asset && text.trim().length < 16) {
      pushBot(
        "i'm listening. describe the play and i'll either talk it through or compile it when you say so.",
        ["Compile a low-risk USDC strategy on Base", "Compare lending vs LP", "🎲 surprise me"],
      );
      return;
    }

    pushBot(question.text, question.chips);
  };

  const stopLlm = () => {
    if (!abortRef.current) return;
    abortReasonRef.current = "user";
    abortRef.current.abort();
    setTyping(false);
  };

  const runAudit = async (spec: StrategySpec, messageId: number) => {
    if (!spec.code) return;

    const seq = auditSeqRef.current + 1;
    auditSeqRef.current = seq;
    auditAbortRef.current?.abort();
    const controller = new AbortController();
    auditAbortRef.current = controller;
    let timedOut = false;
    const timer = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, AUDIT_TIMEOUT_MS);
    setAuditing(true);

    const write = (audit: StrategyAudit) => {
      updateMessage(messageId, { card: { ...spec, audit } });
    };

    write({ status: "running", findings: [], engine: "ethskills.com/audit" });

    try {
      const pack = await fetchAuditPack(spec.code, controller.signal);
      if (auditSeqRef.current !== seq) return;

      const direct = llmReady;
      const response = await fetch(direct ? DIRECT_URL : PROXY_URL, {
        method: "POST",
        headers: direct
          ? {
              Authorization: `Bearer ${apiKey.trim()}`,
              "Content-Type": "application/json",
              "HTTP-Referer": window.location.origin,
              "X-Title": "Telos Strategy Lab — ETHSKILLS Audit",
            }
          : { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          ...(direct ? { model: model.trim() || DEFAULT_MODEL } : { purpose: "audit" }),
          messages: buildAuditMessages(spec, pack),
          temperature: 0,
          max_tokens: 2200,
          stream: false,
          reasoning: { enabled: false },
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(describeHttpError(response.status, detail));
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content ?? "";
      if (!content.trim()) throw new Error("auditor returned an empty reply");

      const audit = parseAuditReply(content, pack);
      if (auditSeqRef.current !== seq) return;
      write(audit);

      if (audit.status === "passed") {
        pushMessage({
          role: "sys",
          text: "ETHSKILLS AUDIT ✓ — no critical/high findings. contract cleared for strategy creation.",
        });
      } else if (audit.status === "failed") {
        pushMessage({
          role: "sys",
          text: `ETHSKILLS AUDIT FAILED — ${audit.findings.length} finding${
            audit.findings.length === 1 ? "" : "s"
          }. use is locked until the contract passes a re-audit.`,
        });
      } else {
        pushMessage({
          role: "sys",
          text: `ETHSKILLS AUDIT UNAVAILABLE — ${
            audit.error ?? "no parsable verdict"
          }. contract locked until it is audited.`,
        });
      }
    } catch (error) {
      if (auditSeqRef.current !== seq) return;
      const detail = timedOut
        ? "audit timed out"
        : controller.signal.aborted
          ? "audit cancelled"
          : error instanceof Error
            ? error.message
            : "audit failed";
      write({
        status: "unavailable",
        findings: [],
        engine: "ethskills.com/audit",
        error: detail,
        checkedAt: Date.now(),
      });
      pushMessage({
        role: "sys",
        text: `ETHSKILLS AUDIT UNAVAILABLE — ${detail}. contract locked until it is audited.`,
      });
    } finally {
      window.clearTimeout(timer);
      if (auditSeqRef.current === seq) {
        auditAbortRef.current = null;
        setAuditing(false);
      }
    }
  };

  const askLlm = async (text: string, isRepair = false) => {
    // A stale request can hiccup after the user moved on; cancel it silently.
    abortRef.current?.abort();
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const controller = new AbortController();
    abortRef.current = controller;
    abortReasonRef.current = null;
    setTyping(true);
    setStreaming(false);
    setThinkingTokens(0);

    let streamedId = -1;
    let answer = "";
    let sawFirstToken = false;
    let reasoningChars = 0;
    let shownThinking = 0;
    let repairPrompt = "";
    const compileIntent = isRepair || wantsCompileRequest(text);
    const stale = () => requestRef.current !== requestId;

    // Without a first-token timeout the modal sits on "COMPUTING…" forever if
    // OpenRouter queues. The hard timeout also catches a stalled stream.
    const firstTokenTimeout = window.setTimeout(() => {
      if (sawFirstToken) return;
      abortReasonRef.current = "timeout";
      controller.abort();
    }, FIRST_TOKEN_TIMEOUT_MS);
    const hardTimeout = window.setTimeout(() => {
      abortReasonRef.current = "timeout";
      controller.abort();
    }, HARD_TIMEOUT_MS);

    try {
      const direct = llmReady;
      const response = await fetch(direct ? DIRECT_URL : PROXY_URL, {
        method: "POST",
        headers: direct
          ? {
              Authorization: `Bearer ${apiKey.trim()}`,
              "Content-Type": "application/json",
              "HTTP-Referer": window.location.origin,
              "X-Title": "Telos Strategy Lab",
            }
          : { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          // The proxy owns the key and model; only send a model when the user
          // brought their own key.
          ...(direct ? { model: model.trim() || DEFAULT_MODEL } : {}),
          // `historyRef` already ends with the current user message.
          messages: [
            { role: "system", content: STRATEGY_SYSTEM_PROMPT },
            ...historyRef.current.slice(-8),
          ],
          temperature: 0.25,
          max_tokens: 4096,
          stream: true,
          // Skip the hidden reasoning phase (~6s on the default free model).
          reasoning: { enabled: false },
        }),
      });

      if (!response.ok) {
        const raw = await response.text().catch(() => "");
        let detail = raw;
        try {
          const parsed = JSON.parse(raw) as { error?: unknown };
          if (typeof parsed.error === "string") detail = parsed.error;
        } catch {
          /* keep the raw body */
        }
        throw new Error(describeHttpError(response.status, detail));
      }
      if (!response.body) throw new Error("provider returned no stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (stale()) {
          void reader.cancel();
          return;
        }
        pending += decoder.decode(value, { stream: true });
        const lines = pending.split("\n");
        pending = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;

          let chunk: {
            error?: { message?: string };
            choices?: { delta?: { content?: string; reasoning?: string } }[];
          };
          try {
            chunk = JSON.parse(payload);
          } catch {
            continue; // partial frame — the rest arrives on the next read
          }
          if (chunk.error) throw new Error(chunk.error.message ?? "provider error");

          // Some providers ignore the reasoning flag. Surface their thinking as
          // a live token counter instead of six seconds of silent dots.
          const reasoningDelta = chunk.choices?.[0]?.delta?.reasoning;
          if (typeof reasoningDelta === "string" && reasoningDelta) {
            reasoningChars += reasoningDelta.length;
            const approx = Math.round(reasoningChars / 4);
            if (approx - shownThinking >= 40) {
              shownThinking = approx;
              setThinkingTokens(approx);
            }
          }

          const delta = chunk.choices?.[0]?.delta?.content;
          if (typeof delta !== "string" || !delta) continue;

          answer += delta;
          if (!sawFirstToken) {
            sawFirstToken = true;
            setThinkingTokens(0);
            setTyping(false); // dots off: real text is landing now
            setStreaming(true);
          }

          const visible = visibleAnswer(answer);
          // Always update: when the model jumps straight into META the visible
          // prose is empty after the first character, and skipping empty
          // updates used to leave a stray "M" on screen until the stream ended.
          const shown = visible || "drafting contract…";
          if (streamedId < 0) {
            streamedId = pushBot(shown).id;
          } else {
            updateMessage(streamedId, { text: shown });
          }
        }
      }

      if (stale()) return;
      if (!answer.trim()) throw new Error("model returned an empty reply");

      const parsed = parseStrategyReply(answer);
      const finalText =
        parsed.text || (parsed.spec ? "contract compiled." : "reply complete.");
      let cardMessageId = streamedId;
      if (streamedId >= 0) {
        updateMessage(streamedId, { text: finalText, card: parsed.spec });
      } else {
        cardMessageId = pushBot(finalText, undefined, parsed.spec).id;
      }

      historyRef.current.push({ role: "assistant", content: answer.slice(0, 12000) });

      if (parsed.spec) {
        setSavedCount(loadSavedStrategies().length);
        const validation =
          parsed.spec.validation ?? validateStrategySource(parsed.spec.code);
        if (validation.ok) {
          pushMessage({
            role: "sys",
            text: "validator ✓ — interface, auth, accounting and event checks passed. starting ETHSKILLS audit…",
          });
          if (cardMessageId >= 0) void runAudit(parsed.spec, cardMessageId);
        } else if (repairsRef.current < MAX_REPAIRS) {
          repairsRef.current += 1;
          repairPrompt = buildRepairPrompt(validation.issues);
          pushMessage({
            role: "sys",
            text: `validator flagged ${validation.issues.length} issue${
              validation.issues.length === 1 ? "" : "s"
            } — repairing once…\n${validation.issues
              .map((issue) => `· ${issue}`)
              .join("\n")}`,
          });
        } else {
          pushMessage({
            role: "sys",
            text: `validator still failing — do not deploy until these are fixed:\n${validation.issues
              .map((issue) => `· ${issue}`)
              .join("\n")}`,
          });
        }
      } else if (/\bMETA\s*:|pragma\s+solidity/i.test(answer)) {
        pushMessage({
          role: "sys",
          text: "the contract came back incomplete or unparseable — send \"retry\" to recompile it.",
        });
      } else if (compileIntent && repairsRef.current < MAX_REPAIRS && !/\?\s*$/.test(parsed.text.trim())) {
        // The user asked for a contract but got prose. Nudge once with a format
        // reminder instead of leaving them staring at an echo of their request.
        repairsRef.current += 1;
        repairPrompt = NO_CONTRACT_PROMPT;
        pushMessage({
          role: "sys",
          text: "no contract in that reply — recompiling with a stricter format reminder…",
        });
      } else if (compileIntent) {
        pushMessage({
          role: "sys",
          text: "no contract in that reply — say \"compile it\" for another pass.",
        });
      }
    } catch (error) {
      const live = abortRef.current === controller;
      const reason = live ? abortReasonRef.current : "superseded";
      if (reason === "superseded") return;

      if (reason === "user") {
        pushMessage({ role: "sys", text: "stopped. ask again when you're ready." });
      } else {
        const detail =
          reason === "timeout"
            ? sawFirstToken
              ? "the reply stalled mid-stream"
              : `no reply in ${Math.round(FIRST_TOKEN_TIMEOUT_MS / 1000)}s`
            : error instanceof Error
              ? error.message
              : "unknown error";
        const fallback = streamedId < 0;
        pushMessage({
          role: "sys",
          text: isRepair
            ? `LLM OFFLINE — ${detail}. repair skipped; keep this contract out of deploy.`
            : fallback
              ? compileIntent
                ? `LLM OFFLINE — ${detail}. falling back to the local strategist.`
                : `LLM OFFLINE — ${detail}. the local sim can still compile a strategy if you ask for one.`
              : `LLM OFFLINE — ${detail}. that reply got cut short.`,
        });
        // Local answers are instant; run after this block clears the flags.
        if (fallback && !isRepair && compileIntent) {
          queueMicrotask(() => advanceLocal(text));
        }
      }
    } finally {
      window.clearTimeout(firstTokenTimeout);
      window.clearTimeout(hardTimeout);
      if (abortRef.current === controller) abortRef.current = null;
      setTyping(false);
      setStreaming(false);
      setThinkingTokens(0);
      if (repairPrompt && !stale()) {
        historyRef.current.push({ role: "user", content: repairPrompt });
        const prompt = repairPrompt;
        repairTimerRef.current = window.setTimeout(() => void askLlm(prompt, true), 40);
      }
    }
  };

  const handleSend = (raw: string) => {
    const text = raw.trim();
    if (!text || typing || streaming) return;
    setInput("");
    pushMessage({ role: "user", text });

    if (/^new chat$/i.test(text)) {
      resetChat();
      return;
    }

    historyRef.current.push({ role: "user", content: text });
    repairsRef.current = 0;
    window.clearTimeout(repairTimerRef.current);
    repairTimerRef.current = 0;
    if (llmReady || useProxy) {
      void askLlm(text);
    } else {
      advanceLocal(text);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSend(input);
  };

  const resetChat = () => {
    requestRef.current += 1;
    abortReasonRef.current = "user";
    abortRef.current?.abort();
    abortRef.current = null;
    auditSeqRef.current += 1;
    auditAbortRef.current?.abort();
    auditAbortRef.current = null;
    setAuditing(false);
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    window.clearTimeout(repairTimerRef.current);
    repairTimerRef.current = 0;
    setTyping(false);
    setStreaming(false);
    setInput("");
    draftRef.current = {};
    historyRef.current = [];
    repairsRef.current = 0;
    setMessages([]);
    idRef.current = 0;
    pushBot(WELCOME, WELCOME_CHIPS);
    inputRef.current?.focus();
  };

  const handleUse = (spec: StrategySpec) => {
    if (!spec.code) {
      pushMessage({
        role: "sys",
        text: "no contract source on this draft — link a model and compile Solidity first.",
      });
      return;
    }
    if (spec.validation && !spec.validation.ok) {
      pushMessage({
        role: "sys",
        text: `contract failed the structural validator — fix these before attaching it:\n${spec.validation.issues
          .map((issue) => `· ${issue}`)
          .join("\n")}`,
      });
      return;
    }
    if (!isAuditCleared(spec.audit)) {
      pushMessage({
        role: "sys",
        text: "opening the create-strategy modal — this contract has not cleared the ETHSKILLS audit yet, so it will show as an unverified draft.",
      });
    } else {
      pushMessage({
        role: "sys",
        text: "opening the create-strategy modal with the verified contract…",
      });
    }
    onUseStrategy(spec);
    onClose();
  };

  const handleRepairAudit = (spec: StrategySpec) => {
    if (!spec.audit) return;
    const prompt = buildAuditRepairPrompt(spec.audit);
    pushMessage({
      role: "user",
      text: "fix the ETHSKILLS audit findings and re-emit the full contract.",
    });
    historyRef.current.push({ role: "user", content: prompt });
    repairsRef.current = 0;
    window.clearTimeout(repairTimerRef.current);
    repairTimerRef.current = 0;
    void askLlm(prompt, true);
  };

  const handleCopy = async (spec: StrategySpec) => {
    try {
      await navigator.clipboard.writeText(spec.code || spec.prompt);
      setCopied(spec.name);
      const timer = window.setTimeout(() => setCopied(null), 1800);
      timersRef.current.push(timer);
    } catch {
      setCopied(null);
      pushMessage({ role: "sys", text: "clipboard blocked by the browser. select the card text to copy." });
    }
  };

  const handleDownload = (spec: StrategySpec) => {
    if (!spec.code) {
      pushMessage({
        role: "sys",
        text: "no contract source on this draft — link a model and compile first.",
      });
      return;
    }
    try {
      const blob = new Blob([spec.code], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = strategyFileName(spec);
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      pushMessage({ role: "sys", text: "download blocked by the browser. use copy instead." });
    }
  };

  const linkKey = () => {
    const key = keyDraft.trim();
    setApiKey(key);
    writeStorage(KEY_STORAGE, key);
    writeStorage(MODEL_STORAGE, model.trim() || DEFAULT_MODEL);
    pushMessage({
      role: "sys",
      text: key
        ? "llm linked. the lab now routes prompts through openrouter."
        : "llm unlinked. running on the local strategist.",
    });
  };

  if (!open) return null;

  return (
    <div className="y2k-overlay" onClick={onClose}>
      <div
        className="y2k-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby="y2k-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="y2k-titlebar">
          <span className="y2k-brandmark" aria-hidden="true">
            ♪
          </span>
          <span className="y2k-title" id="y2k-title">
            TELOS.FM
          </span>
          <span className="y2k-title-sub">STRATEGY STUDIO</span>
          <span className="y2k-title-meta">2008 EDITION / {engineLabel}</span>
          <div className="y2k-winbtns">
            <span aria-hidden="true">_</span>
            <span aria-hidden="true">□</span>
            <button type="button" onClick={onClose} aria-label="Close strategy lab">
              ×
            </button>
          </div>
        </div>

        <div className="y2k-body">
          <aside className="y2k-rail" aria-label="Strategy lab controls">
            <div className="y2k-rail-brand">
              <span className="y2k-rail-logo" aria-hidden="true">
                T
              </span>
              <span>
                <b>TELOS.FM</b>
                <span>STRATEGY STUDIO</span>
              </span>
            </div>

            <div className="y2k-agent">
              <div className="y2k-agent-face" aria-hidden="true">
                <span>◕</span>
                <span>◕</span>
              </div>
              <div>
                <b>STRATEGIST</b>
                <span className="y2k-agent-status">
                  <i className="y2k-led" aria-hidden="true" />
                  {llmReady ? "BYOK LINKED" : server.ready ? "TELOS LINKED" : "LOCAL SIM"}
                </span>
              </div>
            </div>

            <div className="y2k-rail-block">
              <span className="y2k-label">NOW PLAYING</span>
              <div className="y2k-nowplaying">
                <span className="y2k-nowplaying-art" aria-hidden="true">
                  ✦
                </span>
                <div>
                  <b>Strategy session</b>
                  <span>{typing || streaming || auditing ? "live compile" : "ready to chat"}</span>
                </div>
                <span className="y2k-eq" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>

            <div className="y2k-rail-block">
              <span className="y2k-label">SESSION</span>
              <button type="button" className="btn btn-sm y2k-block" onClick={resetChat}>
                ↻ NEW CHAT
              </button>
              <dl className="y2k-stats">
                <div>
                  <dt>MODEL</dt>
                  <dd>{activeModel || "auto"}</dd>
                </div>
                <div>
                  <dt>SAVED</dt>
                  <dd>{savedCount.toString().padStart(2, "0")}</dd>
                </div>
              </dl>
            </div>

            <div className="y2k-rail-block">
              <button
                type="button"
                className="btn btn-sm y2k-block"
                aria-expanded={settingsOpen}
                onClick={() => setSettingsOpen((current) => !current)}
              >
                ⚙ MODEL / API KEY {settingsOpen ? "▴" : "▾"}
              </button>
              {settingsOpen ? (
                <div className="y2k-settings-body">
                  <label className="y2k-key-label" htmlFor="y2k-key">
                    API KEY
                  </label>
                  <input
                    id="y2k-key"
                    className="input y2k-key"
                    type="password"
                    value={keyDraft}
                    placeholder="sk-or-v1-…"
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(event) => setKeyDraft(event.target.value)}
                  />
                  <label className="y2k-key-label" htmlFor="y2k-model">
                    MODEL
                  </label>
                  <input
                    id="y2k-model"
                    className="input y2k-key"
                    type="text"
                    value={model}
                    spellCheck={false}
                    onChange={(event) => setModel(event.target.value)}
                  />
                  <button type="button" className="btn btn-sm y2k-block" onClick={linkKey}>
                    {llmReady ? "↻ UPDATE KEY" : "⚡ USE OWN KEY"}
                  </button>
                  {llmReady ? (
                    <button
                      type="button"
                      className="btn btn-sm y2k-block"
                      onClick={() => {
                        setKeyDraft("");
                        setApiKey("");
                        writeStorage(KEY_STORAGE, "");
                        pushMessage({ role: "sys", text: "key removed — back on the telos link." });
                      }}
                    >
                      ↩ USE TELOS LINK
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-sm y2k-block"
                    onClick={() => {
                      setModel(DEFAULT_MODEL);
                      writeStorage(MODEL_STORAGE, DEFAULT_MODEL);
                      pushMessage({ role: "sys", text: `model → ${DEFAULT_MODEL} (fastest option).` });
                    }}
                  >
                    ⚡ USE FAST MODEL
                  </button>
                  <p className="y2k-fineprint">
                    works out of the box through the telos llm proxy. paste an
                    openrouter key only if you want to use your own account.
                  </p>
                </div>
              ) : (
                <p className="y2k-fineprint">
                  {llmReady
                    ? "using your key. click to change it."
                    : server.ready
                      ? "telos llm linked — no login needed."
                      : "local sim online. add a key to use the llm."}
                </p>
              )}
            </div>

            <div className="y2k-rail-block y2k-howto">
              <span className="y2k-label">HOW IT WORKS</span>
              <p>01. chat or brainstorm</p>
              <p>02. ask to compile</p>
              <p>03. verify in strategy modal</p>
              <p>04. register the strategy</p>
              <p>05. create a vault if you want</p>
            </div>
          </aside>

          <div className="y2k-chat">
            <div className="y2k-chat-head">
              <div>
                <span className="y2k-chat-kicker">STRATEGY RADIO</span>
                <b>Conversation</b>
              </div>
              <span className="y2k-onair">
                <i aria-hidden="true" /> ON AIR
              </span>
            </div>
            <div className="y2k-transcript" aria-live="polite">
              {messages.map((message) => (
                <div className={`y2k-msg y2k-msg--${message.role}`} key={message.id}>
                  <div className="y2k-avatar" aria-hidden="true">
                    {message.role === "user" ? "YOU" : message.role === "sys" ? "!" : "◕"}
                  </div>
                  <div className="y2k-bubble">
                    <p>{message.text}</p>
                    {message.chips ? (
                      <div className="y2k-chips">
                        {message.chips.map((chip) => (
                          <button
                            type="button"
                            className="y2k-chip"
                            key={chip}
                            onClick={() => handleSend(chip)}
                            disabled={typing || streaming}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {message.card ? (
                      <StrategyCard
                        spec={message.card}
                        copied={copied === message.card.name}
                        busy={typing || streaming || auditing}
                        onUse={handleUse}
                        onCopy={handleCopy}
                        onDownload={handleDownload}
                        onRepair={() => handleRepairAudit(message.card!)}
                        onRetry={() => void runAudit(message.card!, message.id)}
                      />
                    ) : null}
                  </div>
                </div>
              ))}

              {typing ? (
                <div className="y2k-msg y2k-msg--bot">
                  <div className="y2k-avatar" aria-hidden="true">
                    ◕
                  </div>
                  <div className="y2k-bubble y2k-typing" aria-label="strategist is typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              ) : null}
              <div ref={endRef} />
            </div>

            <form className="y2k-composer" onSubmit={onSubmit}>
              <span className="y2k-search-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                ref={inputRef}
                className="y2k-input"
                type="text"
                value={input}
                placeholder="search a strategy… or just tell me the play"
                aria-label="Message the strategy assistant"
                spellCheck={false}
                onChange={(event) => setInput(event.target.value)}
              />
              {typing || streaming ? (
                <button type="button" className="btn y2k-send" onClick={stopLlm}>
                  ■ STOP
                </button>
              ) : (
                <button type="submit" className="btn y2k-send" disabled={!input.trim()}>
                  ▶ SEND
                </button>
              )}
            </form>

            <div className="y2k-statusbar">
              <span className="y2k-player" aria-hidden="true">
                <span>⏮</span>
                <span className="y2k-play">▶</span>
                <span>⏭</span>
              </span>
              <span
                className={`y2k-led${typing || streaming || auditing ? " is-busy" : ""}`}
                aria-hidden="true"
              />
              <span>
                {streaming
                  ? "RECEIVING…"
                  : thinkingTokens > 0
                    ? `THINKING… ${thinkingTokens}t`
                    : typing
                      ? "COMPUTING…"
                      : auditing
                        ? "AUDITING… ETHSKILLS"
                        : llmReady
                          ? "OPENROUTER LINKED"
                          : server.ready
                            ? "TELOS LLM ONLINE"
                            : "LOCAL SIM ONLINE"}
              </span>
              <span className="y2k-statusbar-spacer" />
              <span className="y2k-statusbar-track" aria-hidden="true">
                <i style={{ width: typing || streaming || auditing ? "68%" : "100%" }} />
              </span>
              <span>TESTNET ONLY</span>
              <span className="y2k-blink" aria-hidden="true">
                ▌
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StrategyCard({
  spec,
  copied,
  busy,
  onUse,
  onCopy,
  onDownload,
  onRepair,
  onRetry,
}: {
  spec: StrategySpec;
  copied: boolean;
  busy: boolean;
  onUse: (spec: StrategySpec) => void;
  onCopy: (spec: StrategySpec) => void;
  onDownload: (spec: StrategySpec) => void;
  onRepair: (spec: StrategySpec) => void;
  onRetry: (spec: StrategySpec) => void;
}) {
  const validation = spec.validation;
  const audit = spec.audit;
  const cleared = isAuditCleared(audit);
  const blockers = blockingFindings(audit).length;
  const lineCount = spec.code ? spec.code.split("\n").length : 0;
  const validationOk = !validation || validation.ok;
  const canUse = Boolean(spec.code) && validationOk;
  return (
    <div className="y2k-card">
      <div className="y2k-card-head">
        <div>
          <span className="y2k-card-title">{spec.name}</span>
          <span className="y2k-card-ticker">${spec.ticker}</span>
        </div>
        <span className={`y2k-card-risk y2k-risk--${spec.risk.toLowerCase()}`}>
          {spec.risk} / {spec.fee}% FEE
        </span>
      </div>

      <div className="y2k-card-meta">
        <span>{spec.chain}</span>
        <span>·</span>
        <span>{spec.asset}</span>
        <span>·</span>
        <span>{spec.code ? "SOLIDITY · ISTRATEGY" : "SPEC ONLY · NO SOURCE"}</span>
        {spec.source === "local" ? (
          <>
            <span>·</span>
            <span className="y2k-pending">LOCAL TEMPLATE</span>
          </>
        ) : null}
        {validation ? (
          <>
            <span>·</span>
            <span className={validation.ok ? "y2k-pass" : "y2k-fail"}>
              {validation.ok ? "VALIDATOR ✓" : `VALIDATOR ✗ ${validation.issues.length}`}
            </span>
          </>
        ) : null}
        {audit ? (
          <>
            <span>·</span>
            <span
              className={
                cleared
                  ? "y2k-pass"
                  : audit.status === "failed" || audit.status === "unavailable"
                    ? "y2k-fail"
                    : "y2k-pending"
              }
            >
              AUDIT {auditStatusLabel(audit)}
            </span>
          </>
        ) : null}
      </div>

      <p className="y2k-card-thesis">{spec.thesis}</p>

      {validation && !validation.ok ? (
        <ul className="y2k-issues">
          {validation.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}

      {spec.code ? (
        <details className="y2k-code-wrap">
          <summary>
            <span>VIEW CONTRACT</span>
            <span>
              {lineCount} LINES · {strategyFileName(spec)}
            </span>
          </summary>
          <pre className="y2k-code">
            <code>{spec.code}</code>
          </pre>
        </details>
      ) : null}

      <div className="y2k-alloc">
        {spec.allocations.map((item) => (
          <div className="y2k-alloc-row" key={`${item.label}-${item.pct}`}>
            <div className="y2k-alloc-head">
              <span>{item.label}</span>
              <b>{item.pct}%</b>
            </div>
            <div className="y2k-bar">
              <i style={{ width: `${item.pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      <ul className="y2k-guardrails">
        {spec.guardrails.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>

      {audit ? (
        <div className={`y2k-audit y2k-audit--${audit.status}`}>
          <div className="y2k-audit-head">
            <span>ETHSKILLS AUDIT</span>
            <span
              className={
                cleared
                  ? "y2k-pass"
                  : audit.status === "failed" || audit.status === "unavailable"
                    ? "y2k-fail"
                    : "y2k-pending"
              }
            >
              {auditStatusLabel(audit)}
              {blockers ? ` · ${blockers} BLOCKING` : ""}
            </span>
          </div>
          <p className="y2k-audit-engine">{audit.engine}</p>
          {audit.status === "running" ? (
            <p className="y2k-audit-summary">
              independent reviewer running against the pinned ethskills checklists…
            </p>
          ) : null}
          {audit.summary ? <p className="y2k-audit-summary">{audit.summary}</p> : null}
          {audit.error ? <p className="y2k-audit-summary y2k-fail">{audit.error}</p> : null}
          {audit.findings.length ? (
            <ul className="y2k-audit-findings">
              {audit.findings.map((finding, index) => (
                <li
                  key={`${finding.title}-${index}`}
                  className={`y2k-sev--${finding.severity.toLowerCase()}`}
                >
                  <div className="y2k-finding-head">
                    <b>[{finding.severity}]</b>
                    <span>{finding.title}</span>
                  </div>
                  <span className="y2k-finding-loc">{finding.location}</span>
                  {finding.impact ? <em>{finding.impact}</em> : null}
                  {finding.remediation ? <small>fix: {finding.remediation}</small> : null}
                </li>
              ))}
            </ul>
          ) : null}
          {audit.status === "failed" || audit.status === "unavailable" ? (
            <div className="y2k-audit-actions">
              {audit.status === "failed" ? (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onRepair(spec)}
                  disabled={busy}
                >
                  REPAIR + RE-AUDIT →
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onRetry(spec)}
                  disabled={busy}
                >
                  RETRY AUDIT ↻
                </button>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="y2k-card-actions">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => onUse(spec)}
          disabled={!canUse}
          title={
            !spec.code
              ? "This draft has no contract source"
              : !validationOk
                ? "Fix the validator issues first"
                : cleared
                  ? "Open the verified contract in the create-strategy modal"
                  : "Open the contract in the create-strategy modal as an unverified draft"
          }
        >
          {!spec.code
            ? "NO CONTRACT"
            : !validationOk
              ? "FIX VALIDATOR ISSUES"
              : cleared
                ? "REVIEW IN STRATEGY MODAL →"
                : "REVIEW UNVERIFIED →"}
        </button>
        <button type="button" className="btn btn-plain btn-sm" onClick={() => onCopy(spec)}>
          {copied ? "COPIED ✓" : spec.code ? "COPY CONTRACT" : "COPY SPEC"}
        </button>
        <button
          type="button"
          className="btn btn-plain btn-sm"
          onClick={() => onDownload(spec)}
          disabled={!spec.code}
          title={spec.code ? "Download the .sol file" : "No contract source on this draft"}
        >
          ⤓ .SOL
        </button>
      </div>
      {!cleared ? (
        <p className="y2k-audit-lock">
          {!spec.code
            ? "contract missing — link a model or use the local template, then compile again."
            : !validationOk
              ? "validator failed — repair the source before opening the strategy modal."
              : audit?.status === "running"
                ? "audit still running — you can review the source now, but it will open as unverified."
                : "audit not cleared — the strategy modal will mark this as an unverified draft."}
        </p>
      ) : null}
    </div>
  );
}

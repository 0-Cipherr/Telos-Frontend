import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { getTelosApiKey } from "../api-handler/Telos/telos-session";
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
import { lockBodyScroll } from "../utils/scrollLock";

export type { StrategySpec } from "../strategies/strategy-standard";

type Role = "bot" | "user" | "sys";

type Source = {
  title: string;
  url: string;
};

type Message = {
  id: number;
  role: Role;
  text: string;
  chips?: string[];
  card?: StrategySpec;
  sources?: Source[];
};

type StrategyChatModalProps = {
  open: boolean;
  onClose: () => void;
  onUseStrategy: (spec: StrategySpec) => void;
};

// The chat always goes through the Telos API, which checks the wallet-issued
// Telos key and holds the OpenRouter secret. Users never paste a provider key.
const PROXY_URL = `${(import.meta.env.VITE_TELOS_API_BASE as string | undefined) ?? ""}/api/chat`;
// Free OpenRouter models queue before the first token, so be patient.
const FIRST_TOKEN_TIMEOUT_MS = 90_000;
const HARD_TIMEOUT_MS = 300_000;
// Once tokens are flowing, a long silence almost always means the upstream
// stream died. Abort instead of leaving the bubble stuck on "drafting…".
const STREAM_IDLE_TIMEOUT_MS = 60_000;
const AUDIT_TIMEOUT_MS = 200_000;
const MAX_REPAIRS = 2;
// Free models sometimes echo the request instead of compiling. One strict
// nudge is usually enough to get back on format.
const NO_CONTRACT_PROMPT = `The user asked you to compile a strategy, but your last reply did not contain a Solidity contract. Do not repeat the request or apologize. If a required fact is genuinely missing, ask exactly ONE short question. Otherwise emit the strategy now: one short sentence, then one fenced json block with every field (name, ticker, asset, chain, risk, fee, thesis, allocations, guardrails, contract) where contract is the COMPLETE Solidity file as a JSON string.`;

const WELCOME =
  "hey — i'm strategist, the telos strategy copilot. we can talk through an idea, compare venues, look up current yields, or compile a real IStrategy contract. deposits settle on Robinhood Testnet and a strategy can earn on any supported chain. when a draft is ready, deploy it and it lists on the strategies page.";

const WELCOME_CHIPS = [
  "Compile a low-risk USDC lending strategy on Base",
  "Best stable yields across chains right now",
  "Explain funding carry vs lending",
  "Compare lending vs LP",
];

const NEEDS_WALLET =
  "connect your wallet (top right) to use the strategist. your Telos key is issued on first connect, so there is nothing to paste.";

// The web plugin runs one search per request, so only pay for it when the
// question is about something that can change (or the user explicitly asks).
const WEB_SEARCH_HINTS =
  /\b(search|google|look\s*up|browse|internet|web|price|prices|apy|apr|tvl|market\s*cap|funding\s*rate|gas\s*fees?|news|today|tonight|current(?:ly)?|latest|live|recent(?:ly)?|this\s+(?:week|month|year)|last\s+(?:night|week|month)|who\s+won|right\s+now|as\s+of|yield|yields|market)\b/i;

function needsWebSearch(text: string): boolean {
  return WEB_SEARCH_HINTS.test(text);
}

function formatCount(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
}

function authHeaders(): Record<string, string> {
  const key = getTelosApiKey();
  return {
    "Content-Type": "application/json",
    ...(key ? { Authorization: `Bearer ${key}` } : {}),
  };
}

/** Providers sometimes stream content as parts instead of a plain string. */
function streamText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .map((part) => {
      if (typeof part === "string") return part;
      const text = (part as { text?: unknown } | null)?.text;
      return typeof text === "string" ? text : "";
    })
    .join("");
}

function readSources(value: unknown): Source[] {
  if (!Array.isArray(value)) return [];
  const found: Source[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const citation = (item as { url_citation?: { url?: unknown; title?: unknown } }).url_citation;
    if (!citation || typeof citation.url !== "string") continue;
    found.push({
      url: citation.url,
      title:
        typeof citation.title === "string" && citation.title.trim()
          ? citation.title.trim()
          : citation.url,
    });
  }
  return found;
}

/** Minimal markdown: bold + http(s) links, so citations are clickable. */
function renderRichText(text: string): ReactNode {
  const pattern = /(\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*\n]+)\*\*)/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index !== undefined && match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    if (match[2] && match[3]) {
      nodes.push(
        <a key={`link-${key}`} href={match[3]} target="_blank" rel="noreferrer">
          {match[2]}
        </a>,
      );
    } else if (match[4]) {
      nodes.push(<strong key={`bold-${key}`}>{match[4]}</strong>);
    }
    key += 1;
    last = (match.index ?? 0) + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

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
      ? "wallet session expired — reconnect your wallet"
      : status === 402
        ? "strategist credits exhausted"
        : status === 404
          ? "model id not found"
          : status === 429
            ? dailyLimit
              ? "free-model daily limit reached — try again after the reset"
              : "rate limited — try again in a few seconds"
            : status === 503
              ? "strategist is not configured on the server"
              : status >= 500
                ? "provider hiccup on the strategist side"
                : "request failed";
  const trimmed = extra.replace(/\s+/g, " ").trim().slice(0, 140);
  return `${hint} (${status})${trimmed ? ` — ${trimmed}` : ""}`;
}

export default function StrategyChatModal({ open, onClose, onUseStrategy }: StrategyChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [thinkingTokens, setThinkingTokens] = useState(0);
  const [draftingChars, setDraftingChars] = useState(0);
  const [webActive, setWebActive] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

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

  // Read on every render: the key appears as soon as the wallet connects.
  const hasKey = Boolean(getTelosApiKey());

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

  const pushBot = (text: string, chips?: string[], card?: StrategySpec, sources?: Source[]) =>
    pushMessage({ role: "bot", text, chips, card, sources });

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
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => {
      window.clearTimeout(focusTimer);
      // Closing the lab cancels an in-flight chat or audit instead of spending
      // credits in the background.
      requestRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      setTyping(false);
      setStreaming(false);
      setThinkingTokens(0);
      setDraftingChars(0);
      setWebActive(false);
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

      const response = await fetch(PROXY_URL, {
        method: "POST",
        headers: authHeaders(),
        signal: controller.signal,
        body: JSON.stringify({
          purpose: "audit",
          messages: buildAuditMessages(spec, pack),
          temperature: 0,
          max_tokens: 2200,
          stream: false,
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
          text: "ETHSKILLS AUDIT ✓ — no critical/high findings. ready to deploy.",
        });
      } else if (audit.status === "failed") {
        pushMessage({
          role: "sys",
          text: `ETHSKILLS AUDIT FAILED — ${audit.findings.length} finding${
            audit.findings.length === 1 ? "" : "s"
          }. repair it and re-audit before deploying.`,
        });
      } else {
        pushMessage({
          role: "sys",
          text: `ETHSKILLS AUDIT UNAVAILABLE — ${audit.error ?? "no parsable verdict"}.`,
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
      pushMessage({ role: "sys", text: `ETHSKILLS AUDIT UNAVAILABLE — ${detail}.` });
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
    setDraftingChars(0);

    let streamedId = -1;
    let answer = "";
    let sawFirstToken = false;
    let reasoningChars = 0;
    let shownThinking = 0;
    let repairPrompt = "";
    let lastActivity = Date.now();
    const sources: Source[] = [];
    const compileIntent = isRepair || wantsCompileRequest(text);
    const stale = () => requestRef.current !== requestId;
    // Web results cost extra per request, so only ask for them when the prompt
    // needs fresh facts.
    const webPlugins = !isRepair && needsWebSearch(text) ? [{ id: "web", max_results: 5 }] : [];
    setWebActive(webPlugins.length > 0);

    const firstTokenTimeout = window.setTimeout(() => {
      if (sawFirstToken) return;
      abortReasonRef.current = "timeout";
      controller.abort();
    }, FIRST_TOKEN_TIMEOUT_MS);
    const hardTimeout = window.setTimeout(() => {
      abortReasonRef.current = "timeout";
      controller.abort();
    }, HARD_TIMEOUT_MS);
    const idleTimeout = window.setInterval(() => {
      if (!sawFirstToken) return;
      if (Date.now() - lastActivity < STREAM_IDLE_TIMEOUT_MS) return;
      abortReasonRef.current = "timeout";
      controller.abort();
    }, 5_000);

    try {
      const response = await fetch(PROXY_URL, {
        method: "POST",
        headers: authHeaders(),
        signal: controller.signal,
        body: JSON.stringify({
          // `historyRef` already ends with the current user message.
          messages: [
            { role: "system", content: STRATEGY_SYSTEM_PROMPT },
            ...historyRef.current.slice(-8),
          ],
          temperature: 0.25,
          max_tokens: 4096,
          stream: true,
          ...(webPlugins.length > 0 ? { plugins: webPlugins } : {}),
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
      if (!response.body) throw new Error("strategist returned no stream");

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
        lastActivity = Date.now();
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
            annotations?: unknown;
            choices?: {
              delta?: { content?: unknown; reasoning?: unknown; annotations?: unknown };
              message?: { annotations?: unknown };
            }[];
          };
          try {
            chunk = JSON.parse(payload);
          } catch {
            continue; // partial frame — the rest arrives on the next read
          }
          if (chunk.error) throw new Error(chunk.error.message ?? "provider error");

          // Web citations arrive on the delta (streaming) or the final message.
          const incoming = [
            ...readSources(chunk.choices?.[0]?.delta?.annotations),
            ...readSources(chunk.choices?.[0]?.message?.annotations),
            ...readSources(chunk.annotations),
          ];
          for (const source of incoming) {
            if (!sources.some((entry) => entry.url === source.url)) sources.push(source);
          }

          // Some providers ignore the reasoning flag. Surface their thinking as
          // a live token counter instead of silent dots.
          const reasoningDelta = chunk.choices?.[0]?.delta?.reasoning;
          if (typeof reasoningDelta === "string" && reasoningDelta) {
            reasoningChars += reasoningDelta.length;
            const approx = Math.round(reasoningChars / 4);
            if (approx - shownThinking >= 40) {
              shownThinking = approx;
              setThinkingTokens(approx);
            }
          }

          const delta = streamText(chunk.choices?.[0]?.delta?.content);
          if (!delta) continue;

          answer += delta;
          if (!sawFirstToken) {
            sawFirstToken = true;
            setThinkingTokens(0);
            setTyping(false);
            setStreaming(true);
          }
          setDraftingChars(answer.length);

          const visible = visibleAnswer(answer);
          // The model jumps into JSON after a few words; show a moving character
          // count so a long contract does not look frozen.
          const shown = visible || `drafting contract… ${formatCount(answer.length)} chars`;
          if (streamedId < 0) {
            streamedId = pushBot(shown).id;
          } else {
            updateMessage(streamedId, { text: shown });
          }
        }
      }

      if (stale()) return;
      if (!answer.trim()) throw new Error("the strategist returned an empty reply");

      const parsed = parseStrategyReply(answer, "telos");
      const finalText = parsed.text || (parsed.spec ? "strategy compiled." : "reply complete.");
      const sourceList = sources.length > 0 ? sources : undefined;
      let cardMessageId = streamedId;
      if (streamedId >= 0) {
        updateMessage(streamedId, { text: finalText, card: parsed.spec, sources: sourceList });
      } else {
        cardMessageId = pushBot(finalText, undefined, parsed.spec, sourceList).id;
      }

      historyRef.current.push({ role: "assistant", content: answer.slice(0, 12000) });

      if (parsed.spec) {
        const validation = parsed.spec.validation ?? validateStrategySource(parsed.spec.code);
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
            } — repairing once…\n${validation.issues.map((issue) => `· ${issue}`).join("\n")}`,
          });
        } else {
          pushMessage({
            role: "sys",
            text: `validator still failing — fix these before deploying:\n${validation.issues
              .map((issue) => `· ${issue}`)
              .join("\n")}`,
          });
        }
      } else if (/\bMETA\s*:|"contract"\s*:|pragma\s+solidity/i.test(answer)) {
        pushMessage({
          role: "sys",
          text: 'the strategy JSON came back incomplete or unparseable — send "retry" to recompile it.',
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
        pushMessage({ role: "sys", text: 'no contract in that reply — say "compile it" for another pass.' });
      }
    } catch (error) {
      const live = abortRef.current === controller;
      const reason = live ? abortReasonRef.current : "superseded";
      if (reason === "superseded") return;

      // Never leave a "drafting contract…" placeholder behind after a stop or a
      // timeout. Swap it for whatever prose actually arrived.
      if (streamedId >= 0) {
        const partial = visibleAnswer(answer);
        updateMessage(streamedId, {
          text: partial
            ? `${partial}\n\n— reply stopped before it finished.`
            : "reply stopped before any text arrived.",
        });
      }

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
        pushMessage({
          role: "sys",
          text: isRepair
            ? `STRATEGIST OFFLINE — ${detail}. repair skipped; do not deploy this contract.`
            : streamedId < 0
              ? `STRATEGIST OFFLINE — ${detail}.`
              : `STRATEGIST OFFLINE — ${detail}. that reply got cut short.`,
        });
      }
    } finally {
      window.clearTimeout(firstTokenTimeout);
      window.clearTimeout(hardTimeout);
      window.clearInterval(idleTimeout);
      if (!stale()) {
        if (abortRef.current === controller) abortRef.current = null;
        setTyping(false);
        setStreaming(false);
        setThinkingTokens(0);
        setDraftingChars(0);
        setWebActive(false);
      }
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

    if (/^new chat$/i.test(text)) {
      resetChat();
      return;
    }

    pushMessage({ role: "user", text });
    if (!getTelosApiKey()) {
      pushMessage({ role: "sys", text: NEEDS_WALLET });
      return;
    }

    historyRef.current.push({ role: "user", content: text });
    repairsRef.current = 0;
    window.clearTimeout(repairTimerRef.current);
    repairTimerRef.current = 0;
    void askLlm(text);
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
    historyRef.current = [];
    repairsRef.current = 0;
    setMessages([]);
    idRef.current = 0;
    pushBot(WELCOME, WELCOME_CHIPS);
    inputRef.current?.focus();
  };

  const handleUse = (spec: StrategySpec) => {
    if (!spec.code) {
      pushMessage({ role: "sys", text: "no contract source on this draft — ask me to compile it again." });
      return;
    }
    if (spec.validation && !spec.validation.ok) {
      pushMessage({
        role: "sys",
        text: `contract failed the structural validator — fix these before deploying:\n${spec.validation.issues
          .map((issue) => `· ${issue}`)
          .join("\n")}`,
      });
      return;
    }
    pushMessage({
      role: "sys",
      text: isAuditCleared(spec.audit)
        ? "opening the review dialog — deploy it from there."
        : "opening the review dialog. this contract has not cleared the audit yet.",
    });
    onUseStrategy(spec);
    onClose();
  };

  const handleRepairAudit = (spec: StrategySpec) => {
    if (!spec.audit) return;
    const prompt = buildAuditRepairPrompt(spec.audit);
    pushMessage({ role: "user", text: "fix the ETHSKILLS audit findings and re-emit the full contract." });
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
      pushMessage({ role: "sys", text: "no contract source on this draft — ask me to compile it first." });
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

  if (!open) return null;

  const busy = typing || streaming || auditing;

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
          <span className="y2k-traffic" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="y2k-title" id="y2k-title">
            strategy-studio
          </span>
          <span className="y2k-title-sub">— Telos</span>
          <span className="y2k-title-meta">{hasKey ? "TELOS LINK" : "WALLET REQUIRED"}</span>
          <div className="y2k-winbtns">
            <button type="button" onClick={onClose} aria-label="Close strategy lab">
              ×
            </button>
          </div>
        </div>

        <div className="y2k-body">
          <aside className="y2k-rail" aria-label="Strategy lab controls">
            <div className="y2k-rail-brand">
              <span className="y2k-rail-logo" aria-hidden="true">
                {"{}"}
              </span>
              <span>
                <b>TELOS STUDIO</b>
                <span>STRATEGY EXPLORER</span>
              </span>
            </div>

            <div className="y2k-agent">
              <div className="y2k-agent-face" aria-hidden="true">
                TS
              </div>
              <div>
                <b>TELOS STRATEGIST</b>
                <span className="y2k-agent-status">
                  <i className="y2k-led" aria-hidden="true" />
                  {hasKey ? "LINKED" : "WALLET REQUIRED"}
                </span>
              </div>
            </div>

            <div className="y2k-rail-block">
              <span className="y2k-label">ACTIVE SESSION</span>
              <div className="y2k-nowplaying">
                <span className="y2k-nowplaying-art" aria-hidden="true">
                  TS
                </span>
                <div>
                  <b>strategy.chat</b>
                  <span>{busy ? "live compile" : "ready to chat"}</span>
                </div>
              </div>
            </div>

            <div className="y2k-rail-block">
              <span className="y2k-label">WORKSPACE</span>
              <button type="button" className="btn btn-sm y2k-block" onClick={resetChat}>
                + New session
              </button>
              <dl className="y2k-stats">
                <div>
                  <dt>DEPOSITS</dt>
                  <dd>Robinhood Testnet</dd>
                </div>
                <div>
                  <dt>WEB</dt>
                  <dd>AUTO</dd>
                </div>
              </dl>
            </div>

            <div className="y2k-rail-block y2k-howto">
              <span className="y2k-label">GETTING STARTED</span>
              <p>01. Chat or brainstorm</p>
              <p>02. Ask to compile</p>
              <p>03. Review &amp; audit</p>
              <p>04. Deploy the strategy</p>
              <p>05. Create a vault on it</p>
            </div>
          </aside>

          <div className="y2k-chat">
            <div className="y2k-chat-head">
              <div>
                <span className="y2k-chat-kicker">TELOS / STRATEGIST</span>
                <b>Strategy session</b>
              </div>
              <span className="y2k-onair">
                <i aria-hidden="true" />
                {busy ? "WORKING" : "READY"}
              </span>
            </div>
            <div className="y2k-transcript" aria-live="polite">
              {messages.map((message) => (
                <div className={`y2k-msg y2k-msg--${message.role}`} key={message.id}>
                  <div className="y2k-avatar" aria-hidden="true">
                    {message.role === "user" ? "YOU" : message.role === "sys" ? "SYS" : "TS"}
                  </div>
                  <div className="y2k-bubble">
                    <p>{renderRichText(message.text)}</p>
                    {message.sources && message.sources.length > 0 ? (
                      <div className="y2k-sources">
                        <span className="y2k-label">WEB SOURCES</span>
                        {message.sources.map((source) => (
                          <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                            {source.title}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {message.chips ? (
                      <div className="y2k-chips">
                        {message.chips.map((chip) => (
                          <button
                            type="button"
                            className="y2k-chip"
                            key={chip}
                            onClick={() => handleSend(chip)}
                            disabled={busy || !hasKey}
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
                        busy={busy}
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
                    TS
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
              <span className="y2k-prompt-char" aria-hidden="true">
                &gt;
              </span>
              <input
                ref={inputRef}
                className="y2k-input"
                type="text"
                value={input}
                disabled={!hasKey}
                placeholder={hasKey ? "Ask for a strategy, or ask to compile…" : "Connect your wallet to chat"}
                aria-label="Message the strategy assistant"
                spellCheck={false}
                onChange={(event) => setInput(event.target.value)}
              />
              {typing || streaming ? (
                <button type="button" className="btn y2k-send" onClick={stopLlm}>
                  Stop
                </button>
              ) : (
                <button type="submit" className="btn y2k-send" disabled={!hasKey || !input.trim()}>
                  Send ↵
                </button>
              )}
            </form>
          </div>
        </div>

        <div className="y2k-statusbar">
          <span className="y2k-status-item" aria-hidden="true">
            ⊘ 0
          </span>
          <span className="y2k-status-item" aria-hidden="true">
            △ 0
          </span>
          <span className={`y2k-led${busy ? " is-busy" : ""}`} aria-hidden="true" />
          <span>
            {streaming
              ? draftingChars > 0
                ? `Receiving… ${formatCount(draftingChars)} chars`
                : "Receiving…"
              : thinkingTokens > 0
                ? `Thinking… ${thinkingTokens}t`
                : typing
                  ? webActive
                    ? "Thinking… searching the web…"
                    : "Thinking…"
                  : auditing
                    ? "Auditing with EthSkills…"
                    : hasKey
                      ? "Telos strategist online"
                      : "Wallet required"}
          </span>
          <span className="y2k-statusbar-spacer" />
          <span className="y2k-status-item">Solidity</span>
          <span className="y2k-status-item">UTF-8</span>
          <span className="y2k-status-item">Telos Testnet</span>
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
                cleared ? "y2k-pass" : audit.status === "failed" || audit.status === "unavailable" ? "y2k-fail" : "y2k-pending"
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
            <span>Contract source</span>
            <span>
              {lineCount} lines · {strategyFileName(spec)}
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
                cleared ? "y2k-pass" : audit.status === "failed" || audit.status === "unavailable" ? "y2k-fail" : "y2k-pending"
              }
            >
              {auditStatusLabel(audit)}
              {blockers ? ` · ${blockers} BLOCKING` : ""}
            </span>
          </div>
          <p className="y2k-audit-engine">{audit.engine}</p>
          {audit.status === "running" ? (
            <p className="y2k-audit-summary">independent reviewer running against the pinned ethskills checklists…</p>
          ) : null}
          {audit.summary ? <p className="y2k-audit-summary">{audit.summary}</p> : null}
          {audit.error ? <p className="y2k-audit-summary y2k-fail">{audit.error}</p> : null}
          {audit.findings.length ? (
            <ul className="y2k-audit-findings">
              {audit.findings.map((finding, index) => (
                <li key={`${finding.title}-${index}`} className={`y2k-sev--${finding.severity.toLowerCase()}`}>
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
                <button type="button" className="btn btn-sm y2k-btn-primary" onClick={() => onRepair(spec)} disabled={busy}>
                  Repair &amp; re-audit →
                </button>
              ) : (
                <button type="button" className="btn btn-sm y2k-btn-primary" onClick={() => onRetry(spec)} disabled={busy}>
                  Retry audit ↻
                </button>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="y2k-card-actions">
        <button
          type="button"
          className="btn btn-sm y2k-btn-primary"
          onClick={() => onUse(spec)}
          disabled={!canUse}
          title={
            !spec.code
              ? "This draft has no contract source"
              : !validationOk
                ? "Fix the validator issues first"
                : "Review and deploy this strategy"
          }
        >
          {!spec.code ? "No contract" : !validationOk ? "Fix validator issues" : "Review & deploy →"}
        </button>
        <button type="button" className="btn btn-plain btn-sm" onClick={() => onCopy(spec)}>
          {copied ? "Copied ✓" : spec.code ? "Copy contract" : "Copy spec"}
        </button>
        <button
          type="button"
          className="btn btn-plain btn-sm"
          onClick={() => onDownload(spec)}
          disabled={!spec.code}
          title={spec.code ? "Download the .sol file" : "No contract source on this draft"}
        >
          Download .sol
        </button>
      </div>
      {!cleared ? (
        <p className="y2k-audit-lock">
          {!spec.code
            ? "no contract source — ask me to compile it again."
            : !validationOk
              ? "validator failed — repair the source before deploying."
              : audit?.status === "running"
                ? "audit still running — you can review the source now."
                : "audit not cleared yet — the strategy will deploy as unaudited."}
        </p>
      ) : null}
    </div>
  );
}

export type LLMProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "meta"
  | "nvidia"
  | "cohere"
  | "deepseek"
  | "mistral"
  | "qwen"
  | "telos"
  | "unknown";

export type LLMInfo = {
  /** Raw model id stored on the vault. */
  id: string;
  /** Display name, e.g. "GPT-4o mini". */
  name: string;
  /** Provider family, e.g. "OpenAI". */
  provider: string;
  providerId: LLMProviderId;
  /** True when the id came from OpenRouter's free tier. */
  free: boolean;
};

const PROVIDER_MATCHERS: Array<{
  test: RegExp;
  provider: string;
  providerId: LLMProviderId;
}> = [
  { test: /^openai\//, provider: "OpenAI", providerId: "openai" },
  { test: /^anthropic\//, provider: "Anthropic", providerId: "anthropic" },
  { test: /^google\//, provider: "Google", providerId: "google" },
  { test: /^meta(?:-llama)?\//, provider: "Meta", providerId: "meta" },
  { test: /^nvidia\//, provider: "NVIDIA", providerId: "nvidia" },
  { test: /^cohere\//, provider: "Cohere", providerId: "cohere" },
  { test: /^deepseek\//, provider: "DeepSeek", providerId: "deepseek" },
  { test: /^(?:mistralai|mistral)\//, provider: "Mistral AI", providerId: "mistral" },
  { test: /^(?:qwen|alibaba)\//, provider: "Qwen", providerId: "qwen" },
  { test: /^(?:telos|local-engine|local)\b/, provider: "Telos", providerId: "telos" },
];

/** Known ids get the exact branding the app actually uses. */
const KNOWN_NAMES: Record<string, string> = {
  "openai/gpt-4o": "GPT-4o",
  "openai/gpt-4o-mini": "GPT-4o mini",
  "openai/gpt-4.1": "GPT-4.1",
  "openai/gpt-4.1-mini": "GPT-4.1 mini",
  "anthropic/claude-3.5-haiku": "Claude 3.5 Haiku",
  "anthropic/claude-3.5-sonnet": "Claude 3.5 Sonnet",
  "anthropic/claude-3.7-sonnet": "Claude 3.7 Sonnet",
  "google/gemini-2.5-flash": "Gemini 2.5 Flash",
  "google/gemini-2.5-pro": "Gemini 2.5 Pro",
  "meta-llama/llama-3.3-70b-instruct": "Llama 3.3 70B Instruct",
  "nvidia/nemotron-3-ultra-550b-a55b": "Nemotron 3 Ultra 550B A55B",
  "nvidia/nemotron-3.5-lightning": "Nemotron 3.5 Lightning",
  "cohere/north-mini-code": "North Mini Code",
  "deepseek/deepseek-chat-v3": "DeepSeek Chat V3",
  "mistralai/mistral-large": "Mistral Large",
  "qwen/qwen-2.5-coder-32b-instruct": "Qwen 2.5 Coder 32B Instruct",
  "telos/strategist-7b": "Strategist 7B",
};

const SMALL_WORDS = new Set(["mini", "instruct"]);

function prettyWord(word: string): string {
  if (!word) return "";
  if (SMALL_WORDS.has(word.toLowerCase())) return word.toLowerCase();
  if (/^\d+o$/i.test(word)) return word.toLowerCase();
  if (/^v\d+(?:\.\d+)?$/i.test(word)) return word.toUpperCase();
  if (/^[a-z]?\d+[a-z]$/i.test(word)) return word.toUpperCase();
  if (/^gpt$/i.test(word)) return "GPT";
  if (/^llm$/i.test(word)) return "LLM";
  if (/^ai$/i.test(word)) return "AI";
  if (/^deepseek$/i.test(word)) return "DeepSeek";
  if (/^nemotron$/i.test(word)) return "Nemotron";
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Turn an OpenRouter model slug into a readable model name. */
function prettyModelName(id: string): string {
  const known = KNOWN_NAMES[id.replace(/:.*$/, "")];
  if (known) return known;
  const slug = id.includes("/") ? id.slice(id.indexOf("/") + 1) : id;
  return slug
    .replace(/:.*$/, "")
    .split(/[-_.]/)
    .map(prettyWord)
    .join(" ")
    .trim();
}

function providerFor(id: string): {
  provider: string;
  providerId: LLMProviderId;
} {
  for (const matcher of PROVIDER_MATCHERS) {
    if (matcher.test.test(id)) {
      return { provider: matcher.provider, providerId: matcher.providerId };
    }
  }
  if (/gpt|^o\d/.test(id)) return { provider: "OpenAI", providerId: "openai" };
  if (/claude/.test(id)) return { provider: "Anthropic", providerId: "anthropic" };
  if (/gemini|gemma/.test(id)) return { provider: "Google", providerId: "google" };
  if (/llama/.test(id)) return { provider: "Meta", providerId: "meta" };
  if (/nemotron/.test(id)) return { provider: "NVIDIA", providerId: "nvidia" };
  if (/deepseek/.test(id)) return { provider: "DeepSeek", providerId: "deepseek" };
  if (/mistral|mixtral/.test(id)) return { provider: "Mistral AI", providerId: "mistral" };
  if (/qwen/.test(id)) return { provider: "Qwen", providerId: "qwen" };
  return { provider: "AI model", providerId: "unknown" };
}

/**
 * Resolve a stored model id into everything the UI needs to render its badge.
 * Returns null when the vault has no model recorded for that role.
 */
export function describeLLM(model?: string): LLMInfo | null {
  const raw = model?.trim();
  if (!raw) return null;

  const id = raw.replace(/^openrouter\//, "").toLowerCase();
  if (id === "local-engine" || id === "local" || id === "telos-local") {
    return {
      id: raw,
      name: "Local strategist",
      provider: "Telos",
      providerId: "telos",
      free: true,
    };
  }

  const { provider, providerId } = providerFor(id);
  return {
    id: raw,
    name: prettyModelName(id) || raw,
    provider,
    providerId,
    free: id.includes(":free"),
  };
}

/** Compact "Provider Model" label used in confirmation and text rows. */
export function llmLabel(model?: string): string {
  const info = describeLLM(model);
  return info ? `${info.provider} ${info.name}` : "—";
}

/**
 * Models a creator can pick for a vault's onchain strategy agent.
 *
 * The OpenRouter key itself is provisioned by the Telos backend, so the UI only
 * ever sends a model id. Keep this list in sync with the backend allow-list.
 */
export const MODEL_OPTIONS: LLMInfo[] = [
  "openai/gpt-4o-mini",
  "openai/gpt-4.1-mini",
  "anthropic/claude-3.5-haiku",
  "google/gemini-2.5-flash",
  "meta-llama/llama-3.3-70b-instruct",
  "deepseek/deepseek-chat-v3",
  "qwen/qwen-2.5-coder-32b-instruct",
  "mistralai/mistral-large",
  "cohere/north-mini-code:free",
  "nvidia/nemotron-3.5-lightning:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "telos/strategist-7b",
]
  .map((id) => describeLLM(id))
  .filter((info): info is LLMInfo => Boolean(info));

/** Ready-to-render label for the model picker, e.g. "OpenAI · GPT-4o mini". */
export function modelOptionLabel(info: LLMInfo): string {
  return `${info.provider} · ${info.name}${info.free ? " · free" : ""}`;
}


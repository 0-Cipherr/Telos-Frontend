import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, loadEnv, type Plugin } from "vite";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Free models are the default because the project is meant to run without a
// paid OpenRouter balance. They queue and rate-limit a lot, so every request
// walks a failover chain instead of hard-coding a single upstream.
const DEFAULT_MODELS = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "cohere/north-mini-code:free",
  "nvidia/nemotron-3.5-lightning:free",
];

// A model that rejects `reasoning: {enabled:false}` does so with a 400 whose
// message mentions mandatory reasoning. That is not a real failure: retry the
// same model without the hint.
const REASONING_REQUIRED = /reasoning[^.]*(mandatory|required|cannot be disabled)/i;

// These are safe to retry on another model. A 401 means the key itself is bad,
// so there is no point burning through the chain.
const FAILOVER_STATUSES = new Set([402, 404, 408, 409, 429, 500, 502, 503, 504]);

// Rate limits and upstream hiccups are temporary; wait a moment before trying
// the next model so free queues have a chance to drain.
const RETRY_DELAY_MS = 600;

class BodyTooLargeError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parseModels(value: string | undefined, fallback: string[]): string[] {
  const parsed = (value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
}

// The ETHSKILLS audit sends the methodology plus several pinned checklists, so
// the body is much larger than a normal chat turn (~100 KB). Keep the cap
// generous while still bounding memory use.
function readBody(req: IncomingMessage, limit = 2 * 1024 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    let tooLarge = false;
    req.on("data", (chunk) => {
      if (tooLarge) return;
      body += chunk;
      if (body.length > limit) {
        tooLarge = true;
        body = "";
        reject(new BodyTooLargeError("request body too large"));
      }
    });
    req.on("end", () => {
      if (!tooLarge) resolve(body);
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

/**
 * Keeps the OpenRouter key on the server. The chat client only ever talks to
 * `/api/chat`, so there is no "paste your key to log in" step during dev.
 */
function llmProxy(): Plugin {
  let secret = "";
  let models: string[] = DEFAULT_MODELS;
  let auditModels: string[] = [];

  const handle = async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "GET") {
      sendJson(res, 200, {
        ok: Boolean(secret),
        keyless: true,
        model: models[0] ?? "",
        models,
      });
      return;
    }
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "method not allowed" });
      return;
    }
    // Only accept same-origin calls from the app. The dev server is exposed on
    // the LAN/tunnels, and we don't want strangers spending the API key.
    try {
      const origin = req.headers.origin;
      const host = req.headers.host;
      if (!origin || !host || new URL(origin).host !== host) {
        sendJson(res, 403, { error: "forbidden origin" });
        return;
      }
    } catch {
      sendJson(res, 403, { error: "forbidden origin" });
      return;
    }
    if (!secret) {
      sendJson(res, 503, {
        error:
          "OPEN_ROUTER_SECRET is not set in .env — running the local strategist instead.",
      });
      return;
    }

    let payload: {
      messages?: unknown;
      temperature?: unknown;
      max_tokens?: unknown;
      reasoning?: unknown;
      stream?: unknown;
      purpose?: unknown;
    };
    try {
      payload = JSON.parse(await readBody(req));
    } catch (error) {
      sendJson(res, error instanceof BodyTooLargeError ? 413 : 400, {
        error: error instanceof BodyTooLargeError ? error.message : "invalid json body",
      });
      return;
    }
    if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
      sendJson(res, 400, { error: "messages are required" });
      return;
    }

    // The strategy chat streams tokens; the ETHSKILLS audit asks for one JSON
    // verdict. The client's `stream` flag must be honoured end-to-end.
    const wantsStream = payload.stream !== false;
    // An audit gets its own (ideally stronger) reviewer chain, falling back to
    // the chat chain when OPEN_ROUTER_AUDIT_MODEL(S) is not set.
    const chain =
      payload.purpose === "audit" && auditModels.length > 0 ? auditModels : models;

    const temperature =
      typeof payload.temperature === "number" ? payload.temperature : 0.7;
    const maxTokens =
      typeof payload.max_tokens === "number" ? payload.max_tokens : 4096;

    // Walk the failover chain. Each attempt either returns a usable upstream
    // response or a reason to try the next model.
    let upstream: Response | undefined;
    let lastError = { status: 502, message: "no model available" };
    let servedModel = chain[0] ?? "";

    for (const [index, candidate] of chain.entries()) {
      let reasoningHint = true;
      // At most two attempts per model: once with reasoning disabled, once
      // without the hint if the provider insists reasoning cannot be disabled.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const body: Record<string, unknown> = {
          model: candidate,
          messages: payload.messages,
          temperature,
          max_tokens: maxTokens,
          stream: wantsStream,
        };
        // Big reasoning models (nemotron et al.) spend 5-10s "thinking" before
        // the first visible token. The lab wants answers, not a monologue, so
        // ask OpenRouter to skip it. Providers without reasoning ignore this.
        if (reasoningHint) body.reasoning = { enabled: false };

        let response: Response;
        try {
          response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${secret}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "http://localhost:5173",
              "X-Title": "Telos Strategy Lab",
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(wantsStream ? 120_000 : 240_000),
          });
        } catch (error) {
          lastError = {
            status: 504,
            message: `${candidate}: ${error instanceof Error ? error.message : "upstream timeout"}`,
          };
          break;
        }

        if (response.ok && response.body) {
          upstream = response;
          servedModel = candidate;
          break;
        }

        const detail = await response.text().catch(() => "");

        // Provider refuses the reasoning hint: retry the same model without it.
        if (reasoningHint && response.status === 400 && REASONING_REQUIRED.test(detail)) {
          reasoningHint = false;
          continue;
        }

        lastError = {
          status:
            response.status === 401 || FAILOVER_STATUSES.has(response.status)
              ? response.status
              : 502,
          message: `${candidate}: openrouter ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
        };
        break;
      }

      if (upstream) break;
      // A bad key will fail for every model; stop early and surface it.
      if (lastError.status === 401) break;
      if (index < chain.length - 1) await sleep(RETRY_DELAY_MS);
    }

    if (!upstream || !upstream.body) {
      // Preserve auth/credit/rate-limit statuses so the chat can tell the user
      // "credits exhausted" instead of a generic provider hiccup.
      sendJson(res, lastError.status, { error: lastError.message });
      return;
    }

    if (!wantsStream) {
      // Audits are single JSON responses; piping SSE into response.json()
      // would fail with a parse error.
      const body = await upstream.text();
      res.statusCode = upstream.status;
      res.setHeader(
        "Content-Type",
        upstream.headers.get("content-type") ?? "application/json",
      );
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Telos-Model", servedModel);
      res.end(body);
      return;
    }

    const stream = upstream.body;

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "X-Telos-Model": servedModel,
    });
    // Stop pumping if the browser goes away (modal closed, chat reset, etc.).
    res.on("close", () => {
      void stream.cancel().catch(() => undefined);
    });
    Readable.fromWeb(stream as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
  };

  return {
    name: "telos-llm-proxy",
    configResolved(config) {
      const env = loadEnv(config.mode, config.envDir || process.cwd(), "");
      secret = (env.OPEN_ROUTER_SECRET || "").trim();
      // Both a comma-separated chain and the legacy single model are accepted.
      models = parseModels(
        env.OPEN_ROUTER_MODELS || env.OPEN_ROUTER_MODEL,
        DEFAULT_MODELS,
      );
      auditModels = parseModels(
        env.OPEN_ROUTER_AUDIT_MODELS || env.OPEN_ROUTER_AUDIT_MODEL,
        [],
      );
    },
    configureServer(server) {
      server.middlewares.use("/api/chat", (req, res) => {
        handle(req, res).catch((error: unknown) => {
          if (!res.headersSent) {
            sendJson(res, 500, {
              error: error instanceof Error ? error.message : "proxy failure",
            });
          } else {
            res.end();
          }
        });
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/chat", (req, res) => {
        handle(req, res).catch((error: unknown) => {
          if (!res.headersSent) {
            sendJson(res, 500, {
              error: error instanceof Error ? error.message : "proxy failure",
            });
          } else {
            res.end();
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), llmProxy()],
  optimizeDeps: {
    // Privy pulls in a lot of lazily imported code (the wallet list, embedded
    // wallet UI, etc.). Without pre-bundling it up front Vite discovers those
    // deps on the fly, re-optimizes, and the already-loaded app starts hitting
    // old chunk URLs ("504 Outdated Optimize Dep"). That leaves the Privy
    // connect modal rendered but empty, so the Connect Wallet button looks
    // broken. Listing it here keeps the pre-bundle stable from startup.
    include: ["@privy-io/react-auth"],
  },
  server: {
    host: true, // expose on the LAN so phones can connect
    port: 5173,
    // allow HTTPS dev tunnels (cloudflared/ngrok) so the phone gets a secure context
    allowedHosts: [".trycloudflare.com", ".ngrok-free.app", ".ngrok-free.dev"],
    proxy: {
      "/api": {
        target: "http://localhost:5000", // Change this to your Express port
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

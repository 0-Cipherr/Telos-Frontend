// Telos API session. The key is issued by the backend on first wallet connect
// and stored locally, so users never copy or paste it.
const KEY_STORAGE = "telos.apiKey";

const API_BASE = (import.meta.env.VITE_TELOS_API_BASE as string | undefined) ?? "";

export function getTelosApiKey(): string | null {
  return localStorage.getItem(KEY_STORAGE);
}

export async function connectTelosCreator(walletAddress: string, privyAccessToken: string): Promise<string> {
  const response = await fetch(`${API_BASE}/creator/connect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${privyAccessToken}`,
    },
    body: JSON.stringify({ walletAddress }),
  });
  const json = (await response.json().catch(() => ({}))) as { apiKey?: string; error?: string };
  if (!response.ok || !json.apiKey) {
    throw new Error(json.error ?? `Telos connect failed (${response.status})`);
  }
  localStorage.setItem(KEY_STORAGE, json.apiKey);
  return json.apiKey;
}

export async function telosFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const key = getTelosApiKey();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const json = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(json.error ?? `Telos API ${response.status}`);
  }
  return json;
}

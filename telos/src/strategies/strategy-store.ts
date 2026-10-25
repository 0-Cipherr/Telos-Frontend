import type { StrategySpec } from "./strategy-standard";

const STORAGE_KEY = "telos.strategies";

/** Strategies saved from the lab / create-strategy modal, newest first. */
export function loadSavedStrategies(): StrategySpec[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StrategySpec[]) : [];
  } catch {
    return [];
  }
}

export function saveStrategy(spec: StrategySpec): StrategySpec[] {
  const saved = loadSavedStrategies().filter((item) => item.name !== spec.name);
  saved.unshift(spec);
  const trimmed = saved.slice(0, 12);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* localStorage can be unavailable; the session still keeps its state. */
  }
  return trimmed;
}

export function removeSavedStrategy(name: string): StrategySpec[] {
  const saved = loadSavedStrategies().filter((item) => item.name !== name);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    /* ignore quota / privacy-mode failures */
  }
  return saved;
}

/* oxlint-disable react/only-export-components -- context, provider and hook share one module; Fast Refresh just reloads these files fully. */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { VAULTS, type Vault } from "../vaults";

const STORAGE_KEY = "telos.created-vaults.v1";

function loadCreatedVaults(): Vault[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Vault[]) : [];
  } catch {
    return [];
  }
}

function persist(vaults: Vault[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vaults.slice(0, 40)));
  } catch {
    /* localStorage can be unavailable in private mode; keep the in-memory copy. */
  }
}

type CreatedVaultsContextValue = {
  createdVaults: Vault[];
  addVault: (vault: Vault) => void;
  resetCreatedVaults: () => void;
  allVaults: Vault[];
};

const CreatedVaultsContext = createContext<CreatedVaultsContextValue | null>(
  null,
);

/**
 * Keeps user-created vaults in sync with localStorage so the vault index and
 * detail pages can show the result of the create flow without a backend.
 */
export function CreatedVaultsProvider({ children }: { children: ReactNode }) {
  // Read once during the first render so the index/detail pages never flash an
  // empty registry before localStorage is applied.
  const [createdVaults, setCreatedVaults] = useState<Vault[]>(loadCreatedVaults);

  const addVault = useCallback((vault: Vault) => {
    setCreatedVaults((current) => {
      const next = [vault, ...current.filter((item) => item.id !== vault.id)];
      persist(next);
      return next;
    });
  }, []);

  const resetCreatedVaults = useCallback(() => {
    setCreatedVaults([]);
    persist([]);
  }, []);

  const allVaults = useMemo(
    () => [...createdVaults, ...VAULTS],
    [createdVaults],
  );

  const value = useMemo(
    () => ({ createdVaults, addVault, resetCreatedVaults, allVaults }),
    [addVault, allVaults, createdVaults, resetCreatedVaults],
  );

  return (
    <CreatedVaultsContext.Provider value={value}>
      {children}
    </CreatedVaultsContext.Provider>
  );
}

export function useCreatedVaults() {
  const context = useContext(CreatedVaultsContext);
  if (!context) {
    throw new Error(
      "useCreatedVaults must be used within a CreatedVaultsProvider",
    );
  }
  return context;
}

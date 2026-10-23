import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import TxConfirmer from "../components/TxConfirmer";

export type TxRequest = {
  kind: "deploy" | "deposit";
  /** First entry is treated as the native deployment, the rest as cross-chain. */
  chains: string[];
  rows?: Array<{ label: string; value: string }>;
  deposit?: {
    vaultName: string;
    token: string;
    apy: number;
    fee: number;
  };
  note?: string;
};

type TxConfirmerContextValue = {
  /** Opens the confirmer and resolves `true` only when the tx succeeds. */
  confirmTx: (request: TxRequest) => Promise<boolean>;
};

const TxConfirmerContext = createContext<TxConfirmerContextValue | null>(null);

export function TxConfirmerProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<TxRequest | null>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);

  const confirmTx = useCallback((next: TxRequest) => {
    resolver.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setRequest(next);
    });
  }, []);

  const settle = useCallback((confirmed: boolean) => {
    resolver.current?.(confirmed);
    resolver.current = null;
    setRequest(null);
  }, []);

  const value = useMemo(() => ({ confirmTx }), [confirmTx]);

  return (
    <TxConfirmerContext.Provider value={value}>
      {children}
      {request ? <TxConfirmer request={request} onDone={settle} /> : null}
    </TxConfirmerContext.Provider>
  );
}

export function useTxConfirmer() {
  const context = useContext(TxConfirmerContext);
  if (!context) {
    throw new Error("useTxConfirmer must be used within a TxConfirmerProvider");
  }
  return context;
}

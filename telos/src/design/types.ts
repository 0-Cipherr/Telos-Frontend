export type VaultKind = "ready" | "custom";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type Chain = "Base" | "Arbitrum";

export type Vault = {
  /** Registry identifier shown on the card. */
  id: string;
  name: string;
  /** Short ticker used by the vault glyph. */
  asset: string;
  chain: Chain;
  kind: VaultKind;
  proto?: string;
  strategy: string;
  risk: RiskLevel;
  /** Percentage points. */
  apy: number;
  /** USD value. */
  tvl: number;
  /** Creator fee in percentage points. */
  fee: number;
  creator: string;
  history: number[];
  summary: string;
};

export type Thesis = {
  id: string;
  name: string;
  summary: string;
  body: string;
  assets: string[];
  networks: Chain[];
  risk: RiskLevel;
};

/** Mirrors the props Home.tsx receives from App.tsx / main.tsx. */
export type TemplateProps = {
  ready: boolean;
  authenticated: boolean;
  login: () => void;
  logout: () => void;
  address?: string;
  preview?: boolean;
};

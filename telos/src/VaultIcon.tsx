import { TokenIcon } from '@web3icons/react/dynamic';

type V = { kind: 'ready' | 'custom'; proto?: string; asset: string; color: string };

// protocol -> token symbol used by the icon library
const SYMBOL: Record<string, string> = {
  Aerodrome: 'AERO',
  Pendle: 'PENDLE',
  Morpho: 'MORPHO',
  Aave: 'AAVE',
  GMX: 'GMX',
  Camelot: 'GRAIL',
};

export function CustomMark({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-label="Custom vault" style={{ flex: 'none' }}>
      <defs>
        <linearGradient id="cvg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6a88f" />
          <stop offset="1" stopColor="#ec6a4c" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#cvg)" />
      <circle cx="20" cy="20" r="11" fill="none" stroke="#0c0d10" strokeWidth="2.5" />
      <path d="M20 6v3M20 31v3M6 20h3M31 20h3" stroke="#0c0d10" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="20" cy="20" r="3.5" fill="#0c0d10" />
    </svg>
  );
}

export default function VaultIcon({ v }: { v: V }) {
  if (v.kind === 'custom') return <CustomMark />;
  const symbol = SYMBOL[v.proto || ''];
  const mono = <span className="ico" style={{ background: v.color }}>{v.asset}</span>;
  if (!symbol) return mono;
  return (
    <span className="ico logo">
      <TokenIcon symbol={symbol} variant="branded" size={26} fallback={mono} />
    </span>
  );
}

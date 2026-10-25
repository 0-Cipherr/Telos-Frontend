import { findChain } from "../chains";

type ChainIconProps = {
  name?: string;
  size?: number;
  className?: string;
};

export function ChainIcon({ name, size = 14, className }: ChainIconProps) {
  const chain = findChain(name);
  if (!chain) {
    return (
      <span
        className={`chain-icon-fallback${className ? ` ${className}` : ""}`}
        aria-hidden="true"
      >
        ?
      </span>
    );
  }
  const Icon = chain.Icon;
  return (
    <Icon
      variant="branded"
      size={size}
      className={className}
      aria-hidden="true"
    />
  );
}

export function ChainChip({ name }: { name: string }) {
  return (
    <span className="chain-chip" title={name}>
      <ChainIcon name={name} size={13} />
      <span>{name}</span>
    </span>
  );
}

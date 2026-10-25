import { useId } from "react";

type Props = {
  address: string;
  size?: number;
  className?: string;
};

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Deterministic pixel avatar generated from a creator address. The same
 * address always produces the same colors and pattern, with no image assets.
 */
export default function CreatorAvatar({
  address,
  size = 32,
  className,
}: Props) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const seed = address.trim().toLowerCase() || "telos";
  const hash = hashString(seed);
  const hue = hash % 360;
  const hue2 = (hue + 47 + ((hash >>> 7) % 90)) % 360;

  const cells: Array<{ x: number; y: number; alpha: number }> = [];
  for (let y = 0; y < 5; y += 1) {
    for (let x = 0; x < 3; x += 1) {
      const bit = (hash >>> ((y * 3 + x) % 29)) & 1;
      if (!bit) continue;
      const alpha = 0.55 + (((hash >>> (y + x)) & 3) * 0.15);
      cells.push({ x, y, alpha });
      if (x < 2) cells.push({ x: 4 - x, y, alpha });
    }
  }
  if (cells.length === 0) {
    cells.push({ x: 1, y: 2, alpha: 0.9 }, { x: 2, y: 2, alpha: 0.9 }, { x: 3, y: 2, alpha: 0.9 });
  }

  return (
    <svg
      className={`creator-avatar${className ? ` ${className}` : ""}`}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label={`Avatar for ${address}`}
    >
      <defs>
        <linearGradient id={`creator-bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`hsl(${hue} 58% 18%)`} />
          <stop offset="100%" stopColor={`hsl(${hue2} 72% 46%)`} />
        </linearGradient>
        <clipPath id={`creator-clip-${uid}`}>
          <circle cx="20" cy="20" r="20" />
        </clipPath>
      </defs>
      <g clipPath={`url(#creator-clip-${uid})`}>
        <rect width="40" height="40" fill={`url(#creator-bg-${uid})`} />
        {cells.map((cell, index) => (
          <rect
            key={`${cell.x}-${cell.y}-${index}`}
            x={5 + cell.x * 6}
            y={5 + cell.y * 6}
            width="6"
            height="6"
            rx="1.2"
            fill={`hsl(${hue2} 86% 70%)`}
            opacity={cell.alpha}
          />
        ))}
        <circle
          cx="20"
          cy="20"
          r="19"
          fill="none"
          stroke={`hsl(${hue2} 90% 82%)`}
          strokeOpacity="0.45"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}

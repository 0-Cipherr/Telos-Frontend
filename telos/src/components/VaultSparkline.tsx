import { useId } from "react";

type Props = {
  data: number[];
  label: string;
  height?: number;
};

/**
 * Compact APY trend used by the vault index and detail pages.
 * Keeps the retro terminal look but uses the site's live theme variables.
 */
export default function VaultSparkline({ data, label, height = 44 }: Props) {
  const rawId = useId();
  const gradientId = `vault-spark-${rawId.replace(/[^a-zA-Z0-9-]/g, "")}`;
  if (!data.length) return null;

  const width = 260;
  const pad = 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const step = data.length > 1 ? (width - pad * 2) / (data.length - 1) : 0;

  const points = data.map((value, index) => {
    const x = pad + index * step;
    const y = height - pad - ((value - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });

  const line = points
    .map(
      ([x, y], index) =>
        `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`,
    )
    .join(" ");
  const area = `${line} L${(width - pad).toFixed(1)} ${height} L${pad} ${height} Z`;
  const [lastX, lastY] = points[points.length - 1] ?? [0, 0];

  return (
    <svg
      className="vault-spark"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--lime-bright)" stopOpacity="0.24" />
          <stop offset="1" stopColor="var(--lime-bright)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line
        x1="0"
        y1={height - 0.5}
        x2={width}
        y2={height - 0.5}
        stroke="var(--border)"
        strokeDasharray="2 3"
      />
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke="var(--lime-bright)"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <rect
        x={lastX - 2}
        y={lastY - 2}
        width="4"
        height="4"
        fill="var(--lime-bright)"
      />
    </svg>
  );
}

import { useId } from "react";

type Props = {
  data: number[];
  width?: number;
  height?: number;
  label: string;
};

/**
 * Deliberately small: no axes, no interaction. The terminal has its own chart.
 * `width` is the viewBox width, so the SVG can scale to its container.
 */
export default function Sparkline({
  data,
  width = 132,
  height = 42,
  label,
}: Props) {
  const rawId = useId();
  const gradientId = `tl-spark-${rawId.replace(/[^a-zA-Z0-9-]/g, "")}`;
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
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${(width - pad).toFixed(1)} ${height} L${pad} ${height} Z`;
  const [lastX, lastY] = points[points.length - 1] ?? [0, 0];

  return (
    <svg
      className="tl-spark"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B9FF59" stopOpacity="0.22" />
          <stop offset="1" stopColor="#B9FF59" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line
        x1="0"
        y1={height - 0.5}
        x2={width}
        y2={height - 0.5}
        stroke="#393D32"
        strokeDasharray="2 3"
      />
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke="#B9FF59"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <rect
        x={lastX - 2}
        y={lastY - 2}
        width="4"
        height="4"
        fill="#B9FF59"
      />
    </svg>
  );
}

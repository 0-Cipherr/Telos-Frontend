export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <span
      className="logo-emoji"
      style={{ fontSize: `${size}px`, lineHeight: 1 }}
      role="img"
      aria-label="Telos"
    >
      🏴‍☠️
    </span>
  );
}

export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-label="Telos">
      <rect x="53" y="60" width="100" height="26" rx="13" fill="#f3efe6" />
      <rect x="93" y="60" width="26" height="62" rx="13" fill="#f3efe6" />
      <circle cx="106" cy="145" r="14" fill="#ec6a4c" />
    </svg>
  );
}

type Props = {
  size?: number;
  className?: string;
};

/** Vintage skeleton key used on deed certificates and the trade dialogs. */
export default function DeedKeyIcon({ size = 32, className }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="18"
        cy="32"
        r="11"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <circle cx="18" cy="32" r="3.5" fill="currentColor" />
      <path
        d="M29 32h25"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M44 32v9"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="square"
      />
      <path
        d="M51 32v6"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="square"
      />
    </svg>
  );
}

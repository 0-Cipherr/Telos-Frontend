import type { MouseEventHandler } from "react";

type Props = {
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit";
  className?: string;
};

/** Apple Pay button styled like the app's primary confirm action. */
export default function ApplePayButton({
  disabled = false,
  onClick,
  type = "button",
  className,
}: Props) {
  return (
    <button
      type={type}
      className={`btn apple-pay-btn${className ? ` ${className}` : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label="Pay with Apple Pay"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M16.365 1.43c0 1.14-.42 2.2-1.26 3.06-.99 1.02-2.16 1.61-3.42 1.51-.15-1.13.42-2.3 1.2-3.06.87-.85 2.25-1.47 3.48-1.51zM20.94 17.1c-.6 1.38-.9 2-1.68 3.2-1.08 1.66-2.61 3.73-4.5 3.74-1.68.02-2.11-1.1-4.4-1.08-2.29.01-2.76 1.1-4.44 1.08-1.89-.02-3.33-1.88-4.41-3.54-3.03-4.66-3.35-10.13-1.48-13.03 1.33-2.06 3.42-3.27 5.39-3.27 2.01 0 3.27 1.1 4.93 1.1 1.61 0 2.59-1.1 4.91-1.1 1.76 0 3.62.96 4.95 2.62-4.35 2.38-3.65 8.58.73 10.28z"
        />
      </svg>
      <span>Pay</span>
    </button>
  );
}

import type { ReactNode } from "react";
import type { LLMProviderId } from "../llm-models";

type Props = {
  provider: LLMProviderId;
  size?: number;
  title?: string;
  className?: string;
};

const BRAND: Record<
  LLMProviderId,
  { background: string; color: string; mark: ReactNode }
> = {
  openai: {
    background: "#0d0d0d",
    color: "#ffffff",
    mark: (
      <>
        <path
          d="M12 2.6 20 7v10l-8 4.4L4 17V7l8-4.4Z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="M12 7.1 16.4 9.6v4.8L12 16.9l-4.4-2.5V9.6L12 7.1Z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </>
    ),
  },
  anthropic: {
    background: "#d97757",
    color: "#ffffff",
    mark: (
      <path
        d="M5.2 19 11 5h2l5.8 14h-2.7l-1.3-3.3H9.2L7.9 19H5.2Zm4.8-5.5h4L12 8.2l-2 5.3Z"
        fill="currentColor"
      />
    ),
  },
  google: {
    background: "#1a73e8",
    color: "#ffffff",
    mark: (
      <path
        d="M12 2.2c.6 5.4 4.4 9.2 9.8 9.8-5.4.6-9.2 4.4-9.8 9.8-.6-5.4-4.4-9.2-9.8-9.8 5.4-.6 9.2-4.4 9.8-9.8Z"
        fill="currentColor"
      />
    ),
  },
  meta: {
    background: "#0866ff",
    color: "#ffffff",
    mark: (
      <path
        d="M12 12c-1.5-2.2-3-3.6-4.7-3.6C4.8 8.4 3.2 10.8 3.2 13.6c0 2 1.1 3.3 2.7 3.3 1.8 0 3.1-1.8 4.4-3.5l.8-1 1.2 1.6c1.3 1.8 2.4 2.9 4.1 2.9 1.6 0 2.7-1.3 2.7-3.3 0-2.8-1.6-5.2-4.1-5.2-1.7 0-3.2 1.4-4.7 3.6l-.6.9-.7-.9Zm-1.1 1.7c-1.2 1.6-2.1 2.7-3 2.7-.7 0-1.1-.5-1.1-1.4 0-1.5.8-2.7 2.2-2.7 1 0 2 .7 3.1 2l-.6.7-.6-.6Zm2.2 0 .6.6.6-.7c1.1-1.3 2.1-2 3.1-2 1.4 0 2.2 1.2 2.2 2.7 0 .9-.4 1.4-1.1 1.4-.9 0-1.8-1.1-3-2.7l-.7-.9-.6.8Z"
        fill="currentColor"
      />
    ),
  },
  nvidia: {
    background: "#76b900",
    color: "#0b1100",
    mark: (
      <>
        <path
          d="M2.5 12c2.4-3.8 5.6-5.7 9.5-5.7 4.4 0 8.1 2.4 9.5 5.7-1.4 3.3-5.1 5.7-9.5 5.7-3.9 0-7.1-1.9-9.5-5.7Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <circle cx="12" cy="12" r="3.1" fill="currentColor" />
      </>
    ),
  },
  cohere: {
    background: "#39594d",
    color: "#f5f2ee",
    mark: (
      <path
        d="M16.6 5.7a7 7 0 1 0 0 12.6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.6"
      />
    ),
  },
  deepseek: {
    background: "#4d6bfe",
    color: "#ffffff",
    mark: (
      <path
        d="M4 8.5h7.2c4.4 0 7 1.3 7 3.5s-2.6 3.5-7 3.5H4v-7Zm2.7 2.1v2.8h4.2c2.4 0 3.6-.4 3.6-1.4s-1.2-1.4-3.6-1.4H6.7Z"
        fill="currentColor"
      />
    ),
  },
  mistral: {
    background: "#fa520f",
    color: "#ffffff",
    mark: (
      <path
        d="M3 19V5h3.2v5.1h2.6V5h3.2v5.1h2.6V5h3.2v5.1H21V19h-3.2v-5.1h-2.6V19h-3.2v-5.1H9.4V19H3Z"
        fill="currentColor"
      />
    ),
  },
  qwen: {
    background: "#615ced",
    color: "#ffffff",
    mark: (
      <>
        <circle
          cx="11"
          cy="11"
          r="6.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
        />
        <path
          d="m15.6 15.6 4.4 4.4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
      </>
    ),
  },
  telos: {
    background: "#8fd400",
    color: "#0c0d10",
    mark: (
      <path d="M4 5h16v2.9h-6.4V19h-3.2V7.9H4V5Z" fill="currentColor" />
    ),
  },
  unknown: {
    background: "#26282d",
    color: "#c8c8c8",
    mark: (
      <path
        d="M12 4.5 19 8.5v7L12 19.5 5 15.5v-7l7-4Zm0 2.3L7 9.5v5l5 2.8 5-2.8v-5l-5-2.7Z"
        fill="currentColor"
      />
    ),
  },
};

/** Small brand-coloured badge for the model that authored or runs a vault. */
export default function LLMLogo({
  provider,
  size = 24,
  title,
  className,
}: Props) {
  const brand = BRAND[provider];
  return (
    <span
      className={`llm-logo${className ? ` ${className}` : ""}`}
      style={{
        width: size,
        height: size,
        background: brand.background,
        color: brand.color,
      }}
      title={title}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      <svg viewBox="0 0 24 24" width={size * 0.64} height={size * 0.64}>
        {brand.mark}
      </svg>
    </span>
  );
}

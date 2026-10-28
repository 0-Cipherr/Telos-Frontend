type Props = {
  size?: number;
};

/**
 * Same T-mark silhouette as src/Logo.tsx, repainted for the template palette.
 * The existing Logo component is not modified or replaced.
 */
export default function TemplateMark({ size = 30 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="53" y="60" width="100" height="26" rx="13" fill="#E9EADF" />
      <rect x="93" y="60" width="26" height="62" rx="13" fill="#E9EADF" />
      <circle cx="106" cy="145" r="14" fill="#B9FF59" />
    </svg>
  );
}

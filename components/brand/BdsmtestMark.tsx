interface Props {
  className?: string;
}

export default function BdsmtestMark({ className = "h-4 w-4" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#fff" opacity="0.16" />
      <path
        d="M8.2 6.2h4.65c2.45 0 3.95 1.08 3.95 2.95 0 1.18-.62 2.05-1.7 2.52 1.42.4 2.2 1.42 2.2 2.85 0 2.14-1.7 3.28-4.55 3.28H8.2V6.2Zm4.32 4.42c1.15 0 1.78-.42 1.78-1.22 0-.78-.6-1.18-1.78-1.18h-1.86v2.4h1.86Zm.23 5.16c1.3 0 2-.48 2-1.4 0-.9-.7-1.36-2.04-1.36h-2.05v2.76h2.09Z"
        fill="#fff"
      />
    </svg>
  );
}

import type { ReactNode } from "react";

type HeadingLevel = 1 | 2 | 3;
type HeadingSize = "hero" | "section";

interface EditorialHeadingProps {
  eyebrow: ReactNode;
  title: ReactNode;
  level?: HeadingLevel;
  size?: HeadingSize;
  id?: string;
  icon?: ReactNode;
  description?: ReactNode;
  testId?: string;
  titleAriaLabel?: string;
}

const TITLE_GAP = "clamp(0.875rem, 2.2dvh, 1.25rem)";

/**
 * Shared editorial heading rhythm for KinkSync's long-form and onboarding-like
 * surfaces. Spacing belongs to the structure around the serif title, not to the
 * title itself, so `.serif-safe` can never collapse the eyebrow relationship.
 */
export default function EditorialHeading({
  eyebrow,
  title,
  level = 2,
  size = "section",
  id,
  icon,
  description,
  testId,
  titleAriaLabel,
}: EditorialHeadingProps) {
  const Heading = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
  const titleClassName = size === "hero"
    ? "max-w-2xl text-4xl leading-[1.02] sm:text-5xl"
    : "text-3xl leading-tight";

  return (
    <div className="max-w-2xl">
      <div className="grid" style={{ rowGap: TITLE_GAP }}>
        <p
          data-testid={testId}
          className="flex min-h-5 w-fit items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]"
          style={{ color: "var(--accent)" }}
        >
          {icon}
          <span>{eyebrow}</span>
        </p>
        <Heading
          id={id}
          aria-label={titleAriaLabel}
          className={`serif-safe ${titleClassName}`}
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontWeight: 500,
          }}
        >
          {title}
        </Heading>
      </div>
      {description && (
        <p className="mt-4 text-base leading-7" style={{ color: "var(--text2)" }}>
          {description}
        </p>
      )}
    </div>
  );
}

import type { ReactNode } from "react";
import { ShieldCheck } from "@phosphor-icons/react";

/** Reading rhythm shared by explanations; the caller keeps its own facts and state. */
export function ExplanationContent({ children }: { children: ReactNode }) {
  return <div className="grid min-w-0 gap-6 px-1 [overflow-wrap:anywhere]" style={{ color: "var(--text)" }}>{children}</div>;
}

export function ExplanationProse({ children, secondary = false, testId }: {
  children: ReactNode;
  secondary?: boolean;
  testId?: string;
}) {
  return <p data-testid={testId} className="min-w-0 text-base leading-7" style={{ color: secondary ? "var(--text2)" : "var(--text)" }}>{children}</p>;
}

export function ExplanationSection({ title, children, emphasis = false }: {
  title: string;
  children: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <section className={`grid min-w-0 gap-2 ${emphasis ? "p-[16px]" : ""}`} style={emphasis ? { background: "var(--surface2)" } : undefined}>
      <h4 className="text-sm font-semibold leading-5" style={{ color: "var(--text2)" }}>{title}</h4>
      {children}
    </section>
  );
}

export function ExplanationSafety({ children }: { children: ReactNode }) {
  return (
    <section className="grid min-w-0 gap-2 border-t pt-4" style={{ borderColor: "var(--border)" }} aria-label="Veiligheid">
      <h4 className="flex items-center gap-[8px] text-sm font-semibold leading-5">
        <ShieldCheck size={18} weight="duotone" className="flex-none" style={{ color: "var(--accent)" }} aria-hidden="true" />
        Veiligheid
      </h4>
      <ExplanationProse secondary>{children}</ExplanationProse>
    </section>
  );
}

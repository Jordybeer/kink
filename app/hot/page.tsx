import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import PageShell from "@/components/PageShell";
import EditorialHeading from "@/components/ui/EditorialHeading";

const studies = [
  { href: "folio", name: "Van start naar profiel", detail: "Kies een profiel, bewerk een antwoord en ga terug." },
  { href: "profile-study", name: "Profiel & privéantwoorden", detail: "Zoek in de catalogus of open een privéantwoord." },
  { href: "questions", name: "Vragenlijst", detail: "Beantwoord een vraag of bewaar die voor later." },
  { href: "overlays", name: "Instellingen & agenda", detail: "Bekijk een dag, plan een moment of pas het uiterlijk aan." },
  { href: "scenes", name: "Scènes", detail: "Wissel van sfeer tijdens het samenstellen." },
  { href: "onboarding", name: "Eerste kennismaking", detail: "Ontdek met één oefenvraag hoe je jouw voorkeuren vastlegt." },
] as const;

export default function StudioIndex() {
  return (
    <PageShell width="lg">
      <EditorialHeading title="Bewegingsstudio" size="hero" level={1}
        description="Probeer de interacties met voorbeeldgegevens. Je eigen profiel blijft privé." />
      <nav aria-label="Interactiestudies" className="mt-8 divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {studies.map(study => (
          <Link key={study.href} href={`/hot/${study.href}`} className="focus-ring ks-motion-choice flex min-h-16 items-center justify-between gap-4 py-4">
            <span>
              <span className="block text-lg font-semibold">{study.name}</span>
              <span className="mt-1 block text-sm text-[var(--text2)]">{study.detail}</span>
            </span>
            <ArrowUpRight size={18} aria-hidden="true" className="shrink-0 text-[var(--accent)]" />
          </Link>
        ))}
      </nav>
    </PageShell>
  );
}

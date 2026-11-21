import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import PageShell from "@/components/PageShell";
import EditorialHeading from "@/components/ui/EditorialHeading";

const studies = [
  { href: "folio", name: "Van start naar profiel", detail: "Open een profiel en keer halverwege terug." },
  { href: "profile-study", name: "Profiel & privéantwoorden", detail: "Zoek een interesse, wijzig een antwoord of licht de sluier op." },
  { href: "questions", name: "Vragenlijst", detail: "Probeer de duimbediening en vergelijk met het origineel." },
  { href: "overlays", name: "Instellingen & agenda", detail: "Kies een thema, lees een toelichting of plan een moment." },
  { href: "scenes", name: "Scènes", detail: "Wissel van sfeer tijdens het samenstellen." },
  { href: "onboarding", name: "Eerste kennismaking", detail: "Doorloop de introductie en open de kluis." },
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

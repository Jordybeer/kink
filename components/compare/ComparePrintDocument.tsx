import type { CompareFactKind, CompareModel, ComparisonFact } from "@/lib/compareV2";
import {
  COMPARE_FACT_LABEL,
  compactComparisonName,
  comparisonDirectionNote,
} from "@/lib/comparePresentation";
import { STATUS_LABEL } from "@/lib/statusLabels";
import type { Profile } from "@/types";

interface Props {
  profileA: Profile;
  profileB: Profile;
  model: CompareModel;
}

interface PrintSection {
  id: string;
  title: string;
  description: string;
  kinds: CompareFactKind[];
  tone: "boundary" | "discuss" | "difference" | "overlap";
}

const PRINT_SECTIONS: PrintSection[] = [
  {
    id: "boundaries",
    title: "Harde grenzen",
    description: "Niet onderhandelen of als uitnodiging lezen. Stem iedere concrete handeling opnieuw af.",
    kinds: ["conflict", "limit"],
    tone: "boundary",
  },
  {
    id: "discuss",
    title: "Te bespreken",
    description: "Verschillende of onzekere antwoorden die baat hebben bij context.",
    kinds: ["discuss"],
    tone: "discuss",
  },
  {
    id: "differences",
    title: "Verschillen",
    description: "Verschil in enthousiasme; geen impliciete verwachting voor een van beide profielen.",
    kinds: ["soft"],
    tone: "difference",
  },
  {
    id: "overlap",
    title: "Overlap",
    description: "Gedeelde of complementaire interesse. Overlap is geen toestemming.",
    kinds: ["shared", "complementary"],
    tone: "overlap",
  },
];

function boundaryOwner(fact: ComparisonFact, profileA: Profile, profileB: Profile): string | null {
  const owners = [
    fact.statusA === "hard_no" ? profileA.name : null,
    fact.statusB === "hard_no" ? profileB.name : null,
  ].filter((name): name is string => Boolean(name));
  return owners.length > 0 ? `Harde grens bij ${owners.join(" en ")}` : null;
}

function PrintRow({ fact, profileA, profileB }: { fact: ComparisonFact; profileA: Profile; profileB: Profile }) {
  const entryA = profileA.entries[fact.kinkAId];
  const entryB = profileB.entries[fact.kinkBId];
  const direction = comparisonDirectionNote(fact, profileA, profileB);
  const boundary = boundaryOwner(fact, profileA, profileB);
  const notes = [
    entryA?.comment ? `${profileA.name}: ${entryA.comment}` : null,
    entryB?.comment ? `${profileB.name}: ${entryB.comment}` : null,
  ].filter((note): note is string => Boolean(note));

  return (
    <tr className="compare-print-row" data-fact-kind={fact.kind}>
      <th scope="row">
        <span className="compare-print-kink">{compactComparisonName(fact.label)}</span>
        <span className="compare-print-classification">{boundary ?? COMPARE_FACT_LABEL[fact.kind]}</span>
        {direction && <span className="compare-print-direction">{direction}</span>}
      </th>
      <td><span className="compare-print-status" data-status={fact.statusA}>{STATUS_LABEL[fact.statusA]}</span></td>
      <td><span className="compare-print-status" data-status={fact.statusB}>{STATUS_LABEL[fact.statusB]}</span></td>
      <td>{notes.length > 0 ? notes.map((note) => <span key={note}>{note}</span>) : <span aria-label="Geen notitie">—</span>}</td>
    </tr>
  );
}

export default function ComparePrintDocument({ profileA, profileB, model }: Props) {
  const summary = model.summary;
  const stats = [
    ["Overlap", summary.shared + summary.complementary],
    ["Te bespreken", summary.discuss],
    ["Verschillen", summary.soft],
    ["Harde grenzen", summary.conflict + summary.limit],
  ] as const;

  return (
    <article className="compare-print-document" data-testid="compare-print-document">
      <header className="compare-print-header">
        <p className="compare-print-eyebrow">KinkSync · vergelijking</p>
        <h1>{profileA.name} en {profileB.name}</h1>
        <div className="compare-print-identities">
          <div>
            <strong>{profileA.name}</strong>
            <span>{[profileA.role, profileA.experienceLevel].filter(Boolean).join(" · ")}</span>
          </div>
          <div>
            <strong>{profileB.name}</strong>
            <span>{[profileB.role, profileB.experienceLevel].filter(Boolean).join(" · ")}</span>
          </div>
        </div>
        <p className="compare-print-consent">
          Overlap is geen toestemming. Deze vergelijking ondersteunt een gesprek; iedere concrete handeling vraagt actuele, vrijwillige toestemming.
        </p>
        <div className="compare-print-stats" aria-label="Vergelijkingssamenvatting">
          {stats.map(([label, count]) => (
            <div key={label}><strong>{count}</strong><span>{label}</span></div>
          ))}
        </div>
        <p className="compare-print-meta">
          {summary.jointlyAssessed} onderwerpen door beiden zichtbaar beoordeeld · {summary.unpairedVisible} alleen aan één kant · <time suppressHydrationWarning>{new Date().toLocaleDateString("nl-BE")}</time>
        </p>
      </header>

      {PRINT_SECTIONS.map((section) => {
        const facts = model.facts.filter((fact) => section.kinds.includes(fact.kind));
        if (facts.length === 0) return null;
        return (
          <section key={section.id} className="compare-print-section" data-tone={section.tone} aria-labelledby={`compare-print-${section.id}`}>
            <div className="compare-print-section-heading">
              <h2 id={`compare-print-${section.id}`}>{section.title} <span>{facts.length}</span></h2>
              <p>{section.description}</p>
            </div>
            <table>
              <colgroup>
                <col className="compare-print-col-kink" />
                <col className="compare-print-col-status" />
                <col className="compare-print-col-status" />
                <col className="compare-print-col-notes" />
              </colgroup>
              <thead>
                <tr><th>Onderwerp</th><th>{profileA.name}</th><th>{profileB.name}</th><th>Context</th></tr>
              </thead>
              <tbody>{facts.map((fact) => <PrintRow key={fact.id} fact={fact} profileA={profileA} profileB={profileB} />)}</tbody>
            </table>
          </section>
        );
      })}

      <footer className="compare-print-footer">
        <span>Privé · lokaal gegenereerd</span>
        <span>KinkSync · voorkeur is geen toestemming</span>
      </footer>
    </article>
  );
}

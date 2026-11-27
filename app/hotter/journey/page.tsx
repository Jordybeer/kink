import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

const chapters = [
  { path: "self/conversation", name: "Ontdek jezelf", description: "Geef woorden aan wat voor jou betekenis heeft.", tone: "self" },
  { path: "connection", name: "Ontdek elkaar", description: "Lees twee perspectieven naast elkaar, zonder oordeel.", tone: "connection" },
  { path: "together", name: "Creëer samen", description: "Maak ruimte voor wat komt en wat jullie willen bewaren.", tone: "together" },
] as const;

export default function JourneyIndex() {
  return <section className="journey-index">
    <div className="journey-index-intro">
      <h1>Nieuwsgierigheid<br/><em>begint bij jou.</em></h1>
      <p>Drie manieren om te ontdekken. Begin waar jij wilt.</p>
    </div>
    <div className="journey-chapters">
      {chapters.map(chapter => <Link key={chapter.path} href={"/hotter/journey/" + chapter.path} data-chapter={chapter.tone}>
        <div><h2>{chapter.name}</h2><p>{chapter.description}</p></div>
        <ArrowRight size={20} aria-hidden="true" />
      </Link>)}
    </div>
  </section>;
}

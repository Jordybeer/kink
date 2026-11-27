"use client";

import { createContext, useContext, useState, useRef, type ReactNode, type Dispatch, type SetStateAction, type RefObject } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowsClockwise, SlidersHorizontal, CaretDown } from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import { useTopNavActions, type TopNavAction } from "@/components/nav/TopNavContext";
import type { QuestionId, Status } from "./fixtures";
import type { ConversationSession } from "./conversationSession";
import { initialRelationship, type RelationshipSession } from "./relationshipSession";
import type { IdentityOrigin } from "./RelationshipStudy";

type World = "control" | "botanical" | "velvet";
type Theme = "light" | "dark";
type Material = "recessed" | "raised" | "dynamic";
type Answer = { status: Status | null; private: boolean; curious: boolean };
const EMPTY: Answer = { status: null, private: false, curious: false };
type JourneyContext = {
  world: World; theme: Theme; material: Material;
  index: number; setIndex: (i: number) => void;
  answers: Partial<Record<QuestionId, Answer>>;
  updateAnswer: (id: QuestionId, patch: Partial<Answer>) => void;
  discussed: boolean; setDiscussed: (v: boolean) => void;
  note: string; setNote: (v: string) => void;
  remembered: boolean; setRemembered: (v: boolean) => void;
  resetVersion: number;
  relationship: RelationshipSession;
  setRelationship: Dispatch<SetStateAction<RelationshipSession>>;
  identityOrigin: RefObject<IdentityOrigin | null>;
  conversation: ConversationSession | null;
  setConversation: Dispatch<SetStateAction<ConversationSession | null>>;
};
const Context = createContext<JourneyContext | null>(null);
export function useJourney() {
  const value = useContext(Context);
  if (!value) throw new Error("Journey provider ontbreekt");
  return value;
}
const ROUTES = [
  { path: "/hotter/journey/self/conversation", label: "Jezelf" },
  { path: "/hotter/journey/connection/people", label: "Elkaar" },
  { path: "/hotter/journey/together", label: "Samen" },
] as const;
const NO_ACTIONS: TopNavAction[] = [];

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (v: T) => void }) {
  return <div className="journey-choice" role="group" aria-label={label}>
    {options.map(option => <button key={option.value} type="button" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div>;
}

export default function JourneyProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [world, setWorld] = useState<World>("botanical");
  const [theme, setTheme] = useState<Theme>("light");
  const [material, setMaterial] = useState<Material>("dynamic");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<QuestionId, Answer>>>({});
  const [discussed, setDiscussed] = useState(true);
  const [note, setNote] = useState("");
  const [remembered, setRemembered] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const [conversation, setConversation] = useState<ConversationSession | null>(null);
  const [relationship, setRelationship] = useState(initialRelationship);
  const identityOrigin = useRef<IdentityOrigin | null>(null);
  const onSelf = pathname === "/hotter/journey/self" || pathname === ROUTES[0].path;
  useTopNavActions(NO_ACTIONS, "Ontdekkingsstudio", "/hotter");

  function updateAnswer(id: QuestionId, patch: Partial<Answer>) {
    setAnswers(prev => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY), ...patch } }));
  }
  function reset() {
    setIndex(0); setAnswers({}); setDiscussed(true); setNote(""); setRemembered(false); setConversation(null); setRelationship(initialRelationship()); identityOrigin.current = null;
    setResetVersion(v => v + 1);
  }
  return <Context.Provider value={{ world, theme, material, index, setIndex, answers, updateAnswer, discussed, setDiscussed, note, setNote, remembered, setRemembered, resetVersion, conversation, setConversation, relationship, setRelationship, identityOrigin }}>
    <PageShell width="5xl">
      <div className="journey-world" data-preview-theme={theme} data-world={world} data-material={material}>
        <header className="journey-lab">
          <div className="journey-labline">
            <Link href="/hotter/journey" className="journey-wordmark">KinkSync <span>studio</span></Link>
            <span className="journey-sample">Fictieve gegevens</span>
          </div>
          <details className="journey-labdetails">
            <summary><SlidersHorizontal size={17} aria-hidden="true" /> <span>Proefinstellingen <small>{world === "control" ? "Huidig" : world === "botanical" ? "Botanisch" : "Velvet"} · {theme === "light" ? "Licht" : "Donker"}</small></span> <CaretDown size={15} aria-hidden="true" /></summary>
            <div className="journey-labsettings">
              <Choice<World> label="Kleurwereld" value={world} onChange={setWorld} options={[{value:"control",label:"Huidig"},{value:"botanical",label:"Botanisch"},{value:"velvet",label:"Velvet"}]} />
              <Choice<Theme> label="Thema" value={theme} onChange={setTheme} options={[{value:"light",label:"Licht"},{value:"dark",label:"Donker"}]} />
              {onSelf && <Choice<Material> label="Materiaal" value={material} onChange={setMaterial} options={[{value:"recessed",label:"Ingedrukt"},{value:"raised",label:"Verheven"},{value:"dynamic",label:"Dynamisch"}]} />}
            </div>
          </details>
          <nav className="journey-nav" aria-label="Ervaringen">
            {ROUTES.map(route => <Link key={route.path} href={route.path} aria-current={pathname === route.path || (route.label === "Jezelf" && onSelf) || (route.label === "Elkaar" && pathname.startsWith("/hotter/journey/connection")) ? "page" : undefined}>{route.label}</Link>)}
          </nav>
        </header>
        <div key={resetVersion} className="journey-content">{children}</div>
        <footer className="journey-footer">
          <p>Een ontwerpstudie. Keuzes blijven in dit bezoek; voorbeeldprofielen staan los van je eigen gegevens.</p>
          <div><button type="button" onClick={reset}><ArrowsClockwise size={16} aria-hidden="true" /> Opnieuw proberen</button><Link href="/hotter">Materialenstudio</Link><Link href="/hot">Bewegingsstudio</Link></div>
        </footer>
      </div>
    </PageShell>
  </Context.Provider>;
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ArrowsClockwise } from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import { useTopNavActions, type TopNavAction } from "@/components/nav/TopNavContext";
import { STATUS_ORDER, STATUS_LABEL, STATUS_HINT } from "@/lib/statusLabels";
import type { KinkStatus } from "@/types";

type Material = "velvet" | "porcelain" | "dynamic";
type Palette = "jewels" | "current";
type Tone = "light" | "dark";
const NO_ACTIONS: TopNavAction[] = [];
const MATERIALS: { value: Material; label: string; detail: string }[] = [
  { value: "velvet", label: "Velvet", detail: "Een zachte, blijvende indruk. De keuze rust in het materiaal." },
  { value: "porcelain", label: "Porselein", detail: "Een helder, licht verheven oppervlak. De keuze krijgt gewicht." },
  { value: "dynamic", label: "Dynamisch", detail: "Een zachte druk, een korte ontspanning en een rustige, verzonken keuze." },
];
const QUESTIONS = [
  { category: "Dynamiek", title: "Leiding nemen of geven", prompt: "Hoe sta je tegenover een afgesproken verdeling van leiding binnen jullie dynamiek?" },
  { category: "Rituelen", title: "Aanspreektitels", prompt: "Hoe sta je tegenover afgesproken titels, zoals Sir of Meesteres?" },
  { category: "Nazorg", title: "Samen tot rust komen", prompt: "Hoe sta je tegenover bewust tijd maken om samen tot rust te komen na een intens moment?" },
] as const;

function Selector<T extends string>({ label, options, value, onChange }: {
  label: string; options: readonly { value: T; label: string }[];
  value: T; onChange: (next: T) => void;
}) {
  return <div className="ht-selector" role="group" aria-label={label}>
    {options.map(option => <button key={option.value} type="button" aria-pressed={value === option.value}
      onClick={() => onChange(option.value)} className="ht-segment">{option.label}</button>)}
  </div>;
}

export default function MaterialStudio() {
  const [material, setMaterial] = useState<Material>("dynamic");
  const [palette, setPalette] = useState<Palette>("jewels");
  const [tone, setTone] = useState<Tone>("light");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, KinkStatus>>({});
  const current = answers[index] ?? null;
  const question = QUESTIONS[index];
  useTopNavActions(NO_ACTIONS, "Materialenstudio", "/hot");

  function select(status: KinkStatus) {
    setAnswers(previous => ({ ...previous, [index]: previous[index] === status ? null : status }));
  }
  function reset() { setAnswers({}); setIndex(0); }

  return <PageShell width="3xl">
    <div className="ht-world" data-preview-theme={tone} data-material={material} data-palette={palette}>
      <header className="ht-intro">
        <h1>Voel het verschil.</h1>
        <p>Drie materialen, dezelfde keuze. Probeer ze op je eigen tempo.</p>
        <Selector label="Materiaal" options={MATERIALS} value={material} onChange={setMaterial} />
        <p className="ht-material-note" aria-live="polite">{MATERIALS.find(item => item.value === material)?.detail}</p>
      </header>

      <section className="ht-question" aria-label="Oefenvragen">
        <div className="ht-meta">
          <span>{question.category}</span>
          <span>{index + 1} / {QUESTIONS.length}</span>
        </div>
        <progress aria-label="Voortgang oefenvragen" value={index + 1} max={QUESTIONS.length} />
        <div className="ht-prompt" aria-live="polite">
          <h2>{question.title}</h2>
          <p>{question.prompt}</p>
        </div>
        <div className="ht-answers" role="group" aria-label="Status kiezen">
          {STATUS_ORDER.map(status => {
            const active = current === status;
            return <button key={status} type="button" className="ht-answer"
              data-status={status} aria-pressed={active} onClick={() => select(status)}>
              <span className="ht-mark" aria-hidden="true">
                <span className="ht-dot" />
                <Check className="ht-check" size={13} weight="bold" aria-hidden="true" />
              </span>
              <span className="ht-answer-copy">
                <span className="ht-answer-label">{STATUS_LABEL[status]}</span>
                <span className="ht-answer-hint">{STATUS_HINT[status]}</span>
              </span>
            </button>;
          })}
        </div>
        <div className="ht-navigation">
          <button type="button" disabled={index === 0} onClick={() => setIndex(i => Math.max(0, i - 1))}>
            <ArrowLeft size={17} aria-hidden="true" /> Vorige
          </button>
          <button type="button" className="ht-next" disabled={index === QUESTIONS.length - 1} onClick={() => setIndex(i => Math.min(QUESTIONS.length - 1, i + 1))}>
            Volgende <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="ht-controls" aria-labelledby="ht-appearance">
        <h2 id="ht-appearance">Kleur &amp; licht</h2>
        <div className="ht-control-line">
          <span>Palet</span>
          <Selector<Palette> label="Kleurenpalet" options={[{value:"jewels", label:"Juweeltonen"},{value:"current",label:"Huidig"}]} value={palette} onChange={setPalette} />
        </div>
        <div className="ht-control-line">
          <span>Uiterlijk</span>
          <Selector<Tone> label="Voorbeeldthema" options={[{value:"light",label:"Licht"},{value:"dark",label:"Donker"}]} value={tone} onChange={setTone} />
        </div>
        <div className="ht-swatches" aria-label="Vijf statuskleuren">
          {STATUS_ORDER.map(status => <span key={status} data-status={status} title={STATUS_LABEL[status]} aria-label={STATUS_LABEL[status]} />)}
        </div>
        <p className="ht-disclaimer">Dit is een proef met voorbeeldvragen. Je antwoorden en keuzes worden nergens opgeslagen.</p>
        <div className="ht-bottom">
          <button type="button" onClick={reset}><ArrowsClockwise size={16} aria-hidden="true" /> Opnieuw proberen</button>
          <Link href="/hot">Bewegingsstudio <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
  </PageShell>;
}

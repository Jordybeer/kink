"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Check, SlidersHorizontal } from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import SafewordRibbon from "@/components/SafewordRibbon";
import { SceneArcBar, SceneIntensityOptions } from "@/components/scenes/SceneIntensity";
import { useTopNavActions } from "@/components/nav/TopNavContext";
import type { SceneItem } from "@/types";
import styles from "./scene.module.css";

interface SceneCue extends SceneItem {
  tone: string;
}

const rehearsal: SceneCue[] = [
  { id: "arrival", name: "Aankomen", tone: "var(--category-rituals)", intensity: "zacht",
    duration: "5 min", note: "Even landen en afstemmen op elkaar.", fromKink: false },
  { id: "attention", name: "Spelen met aandacht", tone: "var(--category-sensation)", intensity: "midden",
    duration: "15 min", note: "Spreek samen het tempo af. Er is ruimte om te pauzeren.", fromKink: false },
  { id: "aftercare", name: "Samen afronden", tone: "var(--category-aftercare)", intensity: "zacht",
    duration: "10 min", note: "Water klaarzetten en even bij elkaar blijven.", fromKink: false },
];

export default function SceneStudy() {
  const [items, setItems] = useState(rehearsal);
  const [selected, select] = useState(0);
  const [blend, setBlend] = useState(true);
  const cue = items[selected];
  const actions = useMemo(() => [{
    id: "scene-atmosphere",
    label: blend ? "Vergelijk met directe overgang" : "Gebruik geleidelijke overgang",
    icon: <SlidersHorizontal size={19} aria-hidden="true" />,
    onClick: () => setBlend(value => !value),
    placement: "overflow" as const,
  }], [blend]);
  useTopNavActions(actions, "Scène · Setlist", "/hot");

  const atmosphere = {
    "--cue-tone": cue.tone,
    "--cue-position": `${(selected / Math.max(1, items.length - 1)) * 45}%`,
  } as CSSProperties;

  function update(patch: Partial<Pick<SceneItem, "intensity" | "note">>) {
    setItems(previous => previous.map(item => item.id === cue.id ? { ...item, ...patch } : item));
  }

  return (
    <PageShell width="lg" className={styles.study}>
      <div style={atmosphere} data-blend={blend}>
        <header className={styles.header}>
          <div className={styles.field} aria-hidden="true" />
          <p className={styles.meta}>Alex &amp; Sam</p>
          <h1 className={styles.title}>Onze avond</h1>
          <SceneArcBar items={items} />
        </header>
        <SafewordRibbon safeword="Rood" />

        <h2 className={styles.section}>Setlist</h2>
        <ol className={styles.setlist}>
          {items.map((item, index) => (
            <li key={item.id}>
              <button type="button" onClick={() => select(index)} aria-pressed={selected === index}
                className={`focus-ring ${styles.track}`} aria-controls="scene-cue">
                <span className={styles.sequence} aria-hidden="true">
                  {selected === index ? <Check size={17} weight="bold" /> : index + 1}
                </span>
                <span>{item.name}</span>
                <span className={styles.duration}>{item.duration}</span>
              </button>
            </li>
          ))}
        </ol>
        <section id="scene-cue" aria-labelledby="cue-heading" className={styles.context}>
          <h2 id="cue-heading" className={styles.section}>{cue.name}</h2>
          <fieldset className="my-3 flex flex-wrap gap-2">
            <legend className="mb-2 text-sm font-medium">Intensiteit</legend>
            <SceneIntensityOptions value={cue.intensity} onChange={intensity => update({ intensity })} />
          </fieldset>
          <label className="grid gap-2 text-sm" htmlFor="cue-note">Notitie</label>
          <textarea id="cue-note" className={`focus-ring ${styles.note}`}
            value={cue.note} rows={2} onChange={event => update({ note: event.target.value })} />
        </section>
      </div>
    </PageShell>
  );
}

"use client";

import { useId, useRef } from "react";
import type { Kink, KinkEntry } from "@/types";
import KinkListRow from "@/components/KinkListRow";
import StatusOptionRows from "@/components/StatusOptionRows";
import Accordion from "@/components/ui/Accordion";
import DisclosureBody from "@/components/ui/DisclosureBody";
import TopicDetailsFields from "./TopicDetailsFields";

interface Props {
  kink: Kink;
  entry: KinkEntry;
  editable: boolean;
  selected: boolean;
  open: boolean;
  concealed: boolean;
  onToggle: () => void;
  onReveal: () => void;
  onConceal: () => void;
  onChange: (partial: Partial<KinkEntry>) => void;
}

export default function ProfileTopicRow({ kink, entry, editable, selected, open, concealed, onToggle, onReveal, onConceal, onChange }: Props) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const visible = !entry.privateResponse || !concealed;
  function close() {
    trigger.current?.focus({ preventScroll: true });
    onToggle();
  }
  return (
    <div data-testid="profile-topic-row" data-kink-id={kink.id} className="min-w-0">
      <KinkListRow kink={kink} entry={entry} editable={editable && visible} concealed={!visible}
        onOpen={() => { trigger.current?.focus({ preventScroll: true }); onToggle(); }} triggerRef={trigger} expanded={open} controls={id} />
      {editable && entry.privateResponse && (
        <button type="button" onClick={visible ? onConceal : onReveal}
          aria-label={`Privéantwoord voor ${kink.name} ${visible ? "opnieuw verbergen" : "tonen"}`}
          className="focus-ring ks-motion-choice min-h-11 text-sm font-medium" style={{ color: "var(--text2)" }}>
          {visible ? "Opnieuw verbergen" : "Privéantwoord tonen"}
        </button>
      )}
      {visible && editable && (
        <DisclosureBody open={selected && open} id={id} data-testid="profile-inline-editor" contentClassName="pb-5 pt-3 [overflow-wrap:anywhere]">
          {selected && (
            <>
              {kink.description && (
                <p className="mb-3 text-base leading-7" style={{ color: "var(--text2)" }}>{kink.description}</p>
              )}
              {kink.safetyNote && (
                <section className="mb-4" aria-label="Veiligheid">
                  <h4 className="text-sm font-semibold">Veiligheid</h4>
                  <p className="mt-1 text-base leading-7" style={{ color: "var(--text2)" }}>{kink.safetyNote}</p>
                </section>
              )}
              <h4 className="mb-2 text-sm font-semibold">Mijn antwoord</h4>
              <StatusOptionRows current={entry.status} presentation="list" onSelect={(status) => onChange({ status, desire: null })} />
              <Accordion trigger="Details" className="mt-3" contentClassName="pb-2 pt-2">
                <TopicDetailsFields entry={entry} onChange={onChange} />
              </Accordion>
              <button type="button" onClick={close}
                className="focus-ring ks-motion-choice mt-3 min-h-11 px-1 text-sm font-semibold"
                style={{ color: "var(--accent-text)" }}>
                Klaar
              </button>
            </>
          )}
        </DisclosureBody>
      )}
    </div>
  );
}

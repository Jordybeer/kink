import { Eye, EyeSlash, Star } from "@phosphor-icons/react";

interface Props {
  labelled: boolean;
  curious: boolean;
  concealed: boolean;
  onCurious: () => void;
  onPrivacy: () => void;
}

export default function QuestionMarkers({ labelled, curious, concealed, onCurious, onPrivacy }: Props) {
  const privacy = {
    id: "private", label: "Privé", name: concealed ? "Antwoord niet langer privé maken" : "Antwoord privé maken",
    active: concealed, icon: concealed ? EyeSlash : Eye, tone: "var(--accent)", toggle: onPrivacy,
    title: concealed ? "Privé antwoord" : "Antwoord privé maken",
  };
  const curiosity = {
    id: "curious", label: "Nieuwsgierig", name: curious ? "Verwijder nieuwsgierig markering" : "Markeer als nieuwsgierig",
    active: curious, icon: Star, tone: "var(--curious)", toggle: onCurious,
    title: curious ? "Niet meer nieuwsgierig" : "Nieuwsgierig",
  };
  return (
    <div data-testid="question-utilities" role="group" aria-label="Markeringen" className="flex flex-none items-center gap-2">
      {(labelled ? [privacy, curiosity] : [curiosity, privacy]).map(marker => (
        <button key={marker.id} type="button" data-testid={`question-${marker.id}`} data-tour={marker.id}
          aria-pressed={marker.active} aria-label={labelled ? marker.label : marker.name}
          title={marker.title} onClick={marker.toggle}
          className="focus-ring ks-motion-choice inline-flex h-11 w-11 flex-none touch-manipulation items-center justify-center rounded-full">
          <span aria-hidden="true" className="ks-motion-state inline-flex h-9 w-9 items-center justify-center rounded-full border"
            style={{
              color: marker.active ? marker.tone : "var(--text2)",
              borderColor: marker.active ? `color-mix(in srgb, ${marker.tone} 34%, var(--border))` : "color-mix(in srgb, var(--border) 76%, transparent)",
              background: marker.active ? `color-mix(in srgb, ${marker.tone} 12%, var(--surface2))` : "color-mix(in srgb, var(--surface2) 48%, transparent)",
            }}>
            <marker.icon size={17} weight={marker.active ? "fill" : "regular"} />
          </span>
          {labelled && <span>{marker.label}</span>}
        </button>
      ))}
    </div>
  );
}

import { Eye, EyeSlash, Star } from "@phosphor-icons/react";

interface Props {
  curious: boolean;
  concealed: boolean;
  onCurious: () => void;
  onPrivacy: () => void;
}

export default function QuestionMarkers({ curious, concealed, onCurious, onPrivacy }: Props) {
  const markers = [
    { id: "private", label: "Privé", active: concealed, Icon: concealed ? EyeSlash : Eye, tone: "var(--accent)", toggle: onPrivacy },
    { id: "curious", label: "Nieuwsgierig", active: curious, Icon: Star, tone: "var(--curious)", toggle: onCurious },
  ];

  return (
    <div data-testid="question-utilities" role="group" aria-label="Markeringen" className="question-markers">
      {markers.map(({ id, label, active, Icon, tone, toggle }) => (
        <button key={id} type="button" data-testid={`question-${id}`} data-tour={id}
          onClick={toggle} aria-pressed={active} className="focus-ring ks-motion-choice">
          <Icon size={18} color={active ? tone : undefined} weight={active ? "fill" : "regular"} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}

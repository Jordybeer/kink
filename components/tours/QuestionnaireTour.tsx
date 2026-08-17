"use client";

import SpotlightTour, {
  type SpotlightStep,
  type SpotlightTourExitReason,
} from "@/components/tours/SpotlightTour";

const QUESTIONNAIRE_STEPS: readonly SpotlightStep[] = [
  {
    selector: '[data-tour="kink-card"]',
    scrollSelector: '[data-tour="kink-card"]',
    title: "Beoordeel de volledige kink",
    body: "De hele kaart hoort bij één onderwerp. Kies hoe het voor jou voelt, van Heel graag tot Harde grens.",
    pad: 6,
    scrollBlock: "start",
    offsetBelowNav: true,
  },
  {
    selector: '[data-tour="questionnaire-info"]',
    title: "Wat betekenen de antwoorden?",
    body: "Tik op info wanneer je de antwoordkeuzes nog eens naast elkaar wilt zien.",
    pad: 6,
  },
  {
    selector: '[data-tour="questionnaire-menu"]',
    title: "Meer manieren om te verkennen",
    body: "Hier wissel je tussen Dynamic, Discover en Deep Dive zonder extra ruimte op je vragenkaart te verliezen.",
    pad: 6,
  },
  {
    selector: '[data-tour="agreement-ask-first"]',
    scrollSelector: '[data-tour="kink-card"]',
    title: "Eerst vragen",
    body: "Gebruik dit wanneer je dit onderwerp wel wilt aangeven, maar er eerst expliciet over wilt praten.",
    pad: 6,
    scrollBlock: "start",
    offsetBelowNav: true,
  },
  {
    selector: '[data-tour="agreement-first-time"]',
    scrollSelector: '[data-tour="kink-card"]',
    title: "Eerste keer",
    body: "Markeer hiermee dat dit nieuw terrein voor je is. Het verandert je antwoord zelf niet.",
    pad: 6,
    scrollBlock: "start",
    offsetBelowNav: true,
  },
  {
    selector: '[data-tour="curious"]',
    scrollSelector: '[data-tour="kink-card"]',
    title: "Nieuwsgierig?",
    body: "Markeer met de ster wat je wilt verkennen. Nieuwsgierig zijn verandert je antwoord niet en is geen toestemming.",
    pad: 6,
  },
  {
    selector: '[data-tour="private"]',
    scrollSelector: '[data-tour="kink-card"]',
    title: "Verberg een antwoord",
    body: "Je kunt een antwoord verbergen voor gedeelde weergaven. Alleen de kinknaam blijft zichtbaar tot jij het bewust onthult.",
    pad: 6,
  },
];

interface QuestionnaireTourProps {
  onComplete: (reason: SpotlightTourExitReason) => void;
}

export default function QuestionnaireTour({ onComplete }: QuestionnaireTourProps) {
  return (
    <SpotlightTour
      steps={QUESTIONNAIRE_STEPS}
      onComplete={onComplete}
      ariaIdPrefix="questionnaire-tour"
    />
  );
}

"use client";

import SpotlightTour, { type SpotlightStep } from "@/components/tours/SpotlightTour";

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
  onComplete: () => void;
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

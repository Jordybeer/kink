"use client";

import SpotlightTour, {
  type SpotlightStep,
  type SpotlightTourExitReason,
} from "@/components/tours/SpotlightTour";

const PROFILE_STEPS: readonly SpotlightStep[] = [
  {
    selector: '[data-tour="avatar"]',
    title: "Maak het profiel herkenbaar",
    body: "Via Bewerk kun je een profielfoto, naam en perspectief instellen.",
    pad: 8,
  },
  {
    selector: '[data-tour="profile-enrichment"]',
    title: "Beheer je profielinfo",
    body: "BDSMTest en FetLife zitten voortaan samen onder Bewerken, naast je andere profielgegevens.",
    pad: 8,
  },
];

interface ProfileIntroTourProps {
  onComplete: (reason: SpotlightTourExitReason) => void;
}

export default function ProfileIntroTour({ onComplete }: ProfileIntroTourProps) {
  return (
    <SpotlightTour
      steps={PROFILE_STEPS}
      onComplete={onComplete}
      finalLabel="Begrepen"
      ariaIdPrefix="profile-intro-tour"
    />
  );
}

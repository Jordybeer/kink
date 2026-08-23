"use client";

import SpotlightTour, {
  type SpotlightStep,
  type SpotlightTourExitReason,
} from "@/components/tours/SpotlightTour";

const PROFILE_STEPS: readonly SpotlightStep[] = [
  {
    selector: '[data-tour="avatar"]',
    title: "Maak het profiel herkenbaar",
    body: "Tik de avatar om een foto toe te voegen.",
    pad: 8,
  },
  {
    selector: '[data-tour="profile-enrichment"]',
    title: "Maak je profiel wat completer",
    body: "Gebruik je BDSMTest of FetLife? Via Profiel aanvullen kun je ze hier toevoegen.",
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

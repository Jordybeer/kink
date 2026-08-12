"use client";

import SpotlightTour, { type SpotlightStep } from "@/components/tours/SpotlightTour";

const PROFILE_STEPS: readonly SpotlightStep[] = [
  {
    selector: '[data-tour="avatar"]',
    title: "Maak het profiel herkenbaar",
    body: "Tik de avatar om een foto toe te voegen. De afbeelding wordt lokaal opgeslagen en blijft onder jouw controle.",
    pad: 8,
  },
];

interface ProfileIntroTourProps {
  onComplete: () => void;
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

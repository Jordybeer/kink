'use client';

import { ArrowRight } from '@phosphor-icons/react';

interface TurnDialProps {
  onComplete: () => void;
}

export default function TurnDial({ onComplete }: TurnDialProps) {
  return (
    <button
      type="button"
      onClick={onComplete}
      className="focus-ring flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-full border px-5 text-base font-semibold"
      style={{
        background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
        borderColor: 'transparent',
        color: 'var(--on-accent)',
      }}
    >
      Naar KinkSync
      <ArrowRight size={17} aria-hidden="true" />
    </button>
  );
}

'use client';

import type { ComponentProps } from 'react';
import { MotionConfig } from 'framer-motion';
import OnboardingFlow from './onboarding/Onboarding';
import styles from './onboarding/OnboardingShell.module.css';

export default function Onboarding(props: ComponentProps<typeof OnboardingFlow>) {
  return (
    <MotionConfig reducedMotion="user">
      <div className={styles.root}>
        <OnboardingFlow {...props} />
      </div>
    </MotionConfig>
  );
}

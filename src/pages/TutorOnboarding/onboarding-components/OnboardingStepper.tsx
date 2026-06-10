import React from 'react';
import styles from '../styles.module.css';
import type { OnboardingStep } from './types';

const STEPS: { step: OnboardingStep; label: string }[] = [
  { step: 1, label: 'Lịch rảnh' },
  { step: 2, label: 'Môn & giá' },
  { step: 3, label: 'Gói lịch học' },
];

interface OnboardingStepperProps {
  currentStep: OnboardingStep;
  onStepClick: (step: OnboardingStep) => void;
  isStepEnabled: (step: OnboardingStep) => boolean;
}

const OnboardingStepper: React.FC<OnboardingStepperProps> = ({ currentStep, onStepClick, isStepEnabled }) => {
  return (
    <div className={styles.stepper}>
      {STEPS.map((item, index) => {
        const isActive = item.step === currentStep;
        const isDone = item.step < currentStep;
        const enabled = isStepEnabled(item.step);
        return (
          <React.Fragment key={item.step}>
            <button
              type="button"
              className={`${styles.stepItem} ${isActive ? styles.active : ''} ${isDone ? styles.done : ''}`}
              onClick={() => enabled && onStepClick(item.step)}
              disabled={!enabled}
            >
              <span className={styles.stepBubble}>{isDone ? '✓' : item.step}</span>
              <span className={styles.stepLabel}>{item.label}</span>
            </button>
            {index < STEPS.length - 1 && (
              <div className={`${styles.stepConnector} ${item.step < currentStep ? styles.filled : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default OnboardingStepper;

import React from 'react';
import { CalendarOutlined, DollarCircleOutlined, ScheduleOutlined } from '@ant-design/icons';
import styles from '../styles.module.css';
import type { OnboardingStep } from './types';

const SECTIONS: { step: OnboardingStep; label: string; description: string; icon: React.ReactNode }[] = [
  {
    step: 1,
    label: 'Lịch rảnh',
    description: 'Cập nhật khung giờ nhận booking',
    icon: <CalendarOutlined />,
  },
  {
    step: 2,
    label: 'Môn & giá',
    description: 'Quản lý môn, khối lớp và học phí',
    icon: <DollarCircleOutlined />,
  },
  {
    step: 3,
    label: 'Gói lịch học',
    description: 'Tạo lịch học gợi ý cho phụ huynh',
    icon: <ScheduleOutlined />,
  },
];

interface OnboardingStepperProps {
  currentStep: OnboardingStep;
  onStepClick: (step: OnboardingStep) => void;
  isStepEnabled: (step: OnboardingStep) => boolean;
  sectionStatuses?: Partial<Record<OnboardingStep, string>>;
}

const OnboardingStepper: React.FC<OnboardingStepperProps> = ({
  currentStep,
  onStepClick,
  isStepEnabled,
  sectionStatuses,
}) => {
  return (
    <div className={styles.sectionNav} aria-label="Các mục thiết lập giảng dạy">
      {SECTIONS.map((item) => {
        const isActive = item.step === currentStep;
        const enabled = isStepEnabled(item.step);
        const handleActivate = () => {
          if (enabled) onStepClick(item.step);
        };
        return (
          <button
            key={item.step}
            type="button"
            className={`${styles.sectionNavItem} ${isActive ? styles.sectionNavItemActive : ''} ${!enabled ? styles.sectionNavItemLocked : ''}`}
            onMouseDown={handleActivate}
            onClick={handleActivate}
            disabled={!enabled}
            aria-current={isActive ? 'page' : undefined}
            aria-pressed={isActive}
          >
            <span className={styles.sectionNavIcon}>{item.icon}</span>
            <span className={styles.sectionNavContent}>
              <span className={styles.sectionNavTop}>
                <span className={styles.sectionNavTitle}>{item.label}</span>
                <span className={styles.sectionNavStatus}>{sectionStatuses?.[item.step]}</span>
              </span>
              <span className={styles.sectionNavDesc}>{item.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default OnboardingStepper;

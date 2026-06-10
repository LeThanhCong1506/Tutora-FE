import React from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import styles from '../styles.module.css';
import ComboManager from './ComboManager';
import type { UseOnboardingState } from './hooks/useOnboardingState';
import type { FixedCombo } from './types';

interface StepCombosProps {
  onboarding: UseOnboardingState;
  onCreatePackage?: (combo: FixedCombo) => Promise<FixedCombo | null>;
  onDeactivatePackage?: (comboId: string) => Promise<boolean>;
}

const StepCombos: React.FC<StepCombosProps> = ({ onboarding, onCreatePackage, onDeactivatePackage }) => {
  const { state, addCombo, updateCombo, removeCombo } = onboarding;

  return (
    <div className={styles.comboStep}>
      <div className={styles.comboIntro}>
        <div className={styles.comboIntroMain}>
          <span className={styles.comboEyebrow}>Bước gợi ý, không bắt buộc</span>
          <h2 className={styles.stepHeading}>Tạo gói lịch học để phụ huynh chọn nhanh hơn</h2>
        </div>
      </div>

      <div className={styles.comboRuleNotice}>
        <span className={styles.comboRuleNoticeIcon}>
          <InfoCircleOutlined />
        </span>
        <p>
          <strong>1 gói = 1 booking tháng</strong>, hệ thống tự tạo lịch theo gói. Phụ huynh vẫn đặt được theo lịch
          rảnh.
        </p>
      </div>

      <ComboManager
        combos={state.combos}
        availability={state.availability}
        subjectRecords={state.subjectRecords}
        onAdd={addCombo}
        onUpdate={updateCombo}
        onRemove={removeCombo}
        onCreatePackage={onCreatePackage}
        onDeactivatePackage={onDeactivatePackage}
      />
    </div>
  );
};

export default StepCombos;

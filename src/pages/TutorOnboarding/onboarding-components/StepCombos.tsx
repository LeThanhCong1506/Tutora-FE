import React from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import styles from '../styles.module.css';
import ComboManager from './ComboManager';
import type { UseOnboardingState } from './hooks/useOnboardingState';
import type { FixedCombo } from './types';

interface StepCombosProps {
  onboarding: UseOnboardingState;
  inactiveCombos?: FixedCombo[];
  onCreatePackage?: (combo: FixedCombo) => Promise<FixedCombo | null>;
  onUpdatePackage?: (comboId: string, combo: FixedCombo) => Promise<FixedCombo | null>;
  onDeactivatePackage?: (comboId: string) => Promise<boolean>;
  onActivatePackage?: (comboId: string) => Promise<FixedCombo | null>;
}

const StepCombos: React.FC<StepCombosProps> = ({
  onboarding,
  inactiveCombos,
  onCreatePackage,
  onUpdatePackage,
  onDeactivatePackage,
  onActivatePackage,
}) => {
  const { state, addCombo, updateCombo, removeCombo } = onboarding;

  // Sau khi hiện lại thành công, đưa gói trở lại danh sách đang hiển thị/sửa được.
  const handleActivate = onActivatePackage
    ? async (comboId: string) => {
        const reactivated = await onActivatePackage(comboId);
        if (reactivated) addCombo(reactivated);
        return reactivated;
      }
    : undefined;

  return (
    <div className={styles.comboStep}>
      <div className={styles.comboIntro}>
        <div className={styles.comboIntroMain}>
          <span className={styles.comboEyebrow}>Mục gợi ý, không bắt buộc</span>
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
        inactiveCombos={inactiveCombos}
        availability={state.availability}
        subjectRecords={state.subjectRecords}
        onAdd={addCombo}
        onUpdate={updateCombo}
        onRemove={removeCombo}
        onCreatePackage={onCreatePackage}
        onUpdatePackage={onUpdatePackage}
        onDeactivatePackage={onDeactivatePackage}
        onActivatePackage={handleActivate}
      />
    </div>
  );
};

export default StepCombos;

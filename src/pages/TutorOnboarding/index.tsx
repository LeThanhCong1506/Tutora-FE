import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './styles.module.css';
import {
  useOnboardingState,
  useOnboardingSync,
  useLookups,
  OnboardingStepper,
  StepSubjectRecords,
  StepAvailability,
  StepCombos,
  OnboardingSummary,
  type OnboardingStep,
} from './onboarding-components';

const TutorOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const onboarding = useOnboardingState();
  const { state, hydrate, combosMatchAvailability, canFinish, goNext, goBack, goToStep } = onboarding;
  const sync = useOnboardingSync(hydrate);
  const { subjects, gradeLevels } = useLookups();
  const [finished, setFinished] = useState(false);

  // Thứ tự bước: 1 = lịch rảnh, 2 = môn & giá, 3 = gói.
  const availabilityReady = state.availability.length > 0;
  const subjectsReady = state.subjectRecords.length > 0;

  const isStepEnabled = (step: OnboardingStep) => {
    if (step === 1) return true;
    if (step === 2) return availabilityReady; // cần lịch rảnh trước
    return availabilityReady && subjectsReady; // step 3
  };

  const canProceedCurrent =
    state.currentStep === 1 ? availabilityReady : state.currentStep === 2 ? subjectsReady : canFinish;

  const blockingReason = (() => {
    if (canProceedCurrent) return null;
    if (state.currentStep === 1) {
      return 'Cần thêm ít nhất 1 khung giờ rảnh để tiếp tục.';
    }
    if (state.currentStep === 2) {
      return 'Cần thêm ít nhất 1 record (môn × khối × giá) để tiếp tục.';
    }
    if (!combosMatchAvailability) {
      return 'Có gói lịch học cố định không còn nằm trong lịch rảnh. Hãy cập nhật gói trước khi hoàn tất.';
    }
    return null;
  })();

  const footerStatusText = `Bước ${state.currentStep} / 3`;

  const handleNext = async () => {
    // Lưu từng bước: mỗi bước map đúng 1 nhóm endpoint.
    if (state.currentStep === 1) {
      if (await sync.saveAvailability(state.availability)) {
        toast.success('Đã lưu lịch rảnh');
        goNext();
      }
      return;
    }
    if (state.currentStep === 2) {
      if (await sync.savePricing(state.subjectRecords)) {
        toast.success('Đã lưu môn học & giá');
        goNext();
      }
      return;
    }
    // Bước 3 — gói lịch học (kết thúc).
    if (await sync.savePackages(state.combos)) {
      toast.success('Đã lưu gói lịch học. Hoàn tất thiết lập!');
      setFinished(true);
    }
  };

  if (sync.loading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>Đang tải thiết lập của bạn…</h1>
          {sync.loadError && <p className={styles.footerWarn}>{sync.loadError}</p>}
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <OnboardingSummary
        subjectRecords={state.subjectRecords}
        availability={state.availability}
        combos={state.combos}
        onBack={() => setFinished(false)}
        onFinish={() => navigate('/tutor-portal/dashboard')}
      />
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Thiết lập môn học, lịch rảnh & gói lịch học</h1>
        <p className={styles.headerSubtitle}>
          Bước 1: thiết lập lịch rảnh để nhận booking. Bước 2: cấu hình môn và giá. Bước 3: tạo gói lịch học gợi ý,
          không bắt buộc.
        </p>
        <OnboardingStepper currentStep={state.currentStep} onStepClick={goToStep} isStepEnabled={isStepEnabled} />
      </div>

      <div className={styles.body}>
        {state.currentStep === 1 && (
          <StepAvailability onboarding={onboarding} onSaveAvailability={sync.saveAvailability} saving={sync.saving} />
        )}
        {state.currentStep === 2 && (
          <StepSubjectRecords
            onboarding={onboarding}
            subjects={subjects}
            gradeLevels={gradeLevels}
            onCreateSubjectRecord={sync.createSubjectRecord}
            onSaveSubjectRecords={sync.savePricing}
            saving={sync.saving}
          />
        )}
        {state.currentStep === 3 && (
          <StepCombos
            onboarding={onboarding}
            onCreatePackage={sync.createFixedPackage}
            onDeactivatePackage={sync.deactivateFixedPackage}
          />
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.footerInfo}>
          {blockingReason ? <span className={styles.footerWarn}>{blockingReason}</span> : footerStatusText}
        </div>
        <div className={styles.footerBtns}>
          {state.currentStep > 1 && (
            <button type="button" className={styles.btnGhost} onClick={goBack}>
              Quay lại
            </button>
          )}
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleNext}
            disabled={!canProceedCurrent || sync.saving}
          >
            {sync.saving ? 'Đang lưu...' : state.currentStep === 3 ? 'Hoàn tất' : 'Tiếp tục'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorOnboarding;

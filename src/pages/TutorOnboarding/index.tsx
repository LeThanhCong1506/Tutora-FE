import React, { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './styles.module.css';
import { useTabParam } from '../../hooks/useTabParam';
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

// Bước đang xem sống trên URL (`?step=`) thay vì useState — reload/F5 hoặc share
// link không còn văng về bước 1. `summary` là màn tổng kết sau khi bấm "Hoàn tất".
const STEP_SLUGS = ['availability', 'pricing', 'packages', 'summary'] as const;
type StepSlug = (typeof STEP_SLUGS)[number];

const STEP_BY_SLUG: Record<StepSlug, OnboardingStep> = {
  availability: 1,
  pricing: 2,
  packages: 3,
  summary: 3,
};
const SLUG_BY_STEP: Record<OnboardingStep, StepSlug> = { 1: 'availability', 2: 'pricing', 3: 'packages' };
const clampStep = (n: number): OnboardingStep => Math.min(3, Math.max(1, n)) as OnboardingStep;

const TutorOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const onboarding = useOnboardingState();
  const { state, hydrate, canFinish } = onboarding;
  const sync = useOnboardingSync(hydrate);
  const { subjects, gradeLevels } = useLookups();

  const [stepSlug, setStepSlug] = useTabParam<StepSlug>(STEP_SLUGS, 'availability', { paramKey: 'step' });
  const finished = stepSlug === 'summary';
  const currentStep = STEP_BY_SLUG[stepSlug];

  const goToStep = useCallback((step: OnboardingStep) => setStepSlug(SLUG_BY_STEP[step]), [setStepSlug]);
  const goNext = useCallback(() => setStepSlug(SLUG_BY_STEP[clampStep(currentStep + 1)]), [currentStep, setStepSlug]);

  // Thứ tự bước: 1 = lịch rảnh, 2 = môn & giá, 3 = gói.
  const availabilityReady = state.availability.length > 0;
  const subjectsReady = state.subjectRecords.length > 0;
  const packagesReady = state.combos.length > 0;

  const isStepEnabled = (step: OnboardingStep) => {
    if (step === 1) return true;
    if (step === 2) return availabilityReady; // cần lịch rảnh trước
    return availabilityReady && subjectsReady; // step 3
  };

  // URL có thể trỏ tới bước chưa mở khoá (link cũ, gõ tay, dữ liệu đã bị xoá).
  // Chờ hydrate xong mới biết bước nào hợp lệ, rồi kéo về bước xa nhất đang mở.
  // `summary` chỉ đọc nên không chặn — cứ hiển thị theo dữ liệu đã load.
  useEffect(() => {
    if (sync.loading || finished || isStepEnabled(currentStep)) return;
    setStepSlug(SLUG_BY_STEP[availabilityReady ? (subjectsReady ? 3 : 2) : 1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync.loading, finished, currentStep, availabilityReady, subjectsReady]);

  const canProceedCurrent = currentStep === 1 ? availabilityReady : currentStep === 2 ? subjectsReady : canFinish;

  const sectionStatuses: Record<OnboardingStep, string> = {
    1: availabilityReady ? 'Đã thiết lập' : 'Cần thiết lập',
    2: availabilityReady ? (subjectsReady ? `${state.subjectRecords.length} cấu hình` : 'Cần cấu hình') : 'Cần lịch rảnh',
    3: availabilityReady && subjectsReady ? (packagesReady ? `${state.combos.length} gói` : 'Tuỳ chọn') : 'Cần lịch & giá',
  };

  const handleNext = async () => {
    // Lưu từng bước: mỗi bước map đúng 1 nhóm endpoint.
    if (currentStep === 1) {
      if (await sync.saveAvailability(state.availability)) {
        toast.success('Đã lưu lịch rảnh');
        goNext();
      }
      return;
    }
    if (currentStep === 2) {
      // savePricing tự hiện toast đúng (kể cả trường hợp hồ sơ active → chờ Admin duyệt).
      if (await sync.savePricing(state.subjectRecords)) {
        goNext();
      }
      return;
    }
    // Bước 3 — gói lịch học (kết thúc).
    if (await sync.savePackages(state.combos)) {
      toast.success('Đã lưu gói lịch học. Hoàn tất thiết lập!');
      setStepSlug('summary');
    }
  };

  if (sync.loading) {
    return (
      <div className={styles.loadingScreen} role="status" aria-live="polite">
        <div className={styles.loadingSpinner} aria-hidden="true" />
        <div className={styles.loadingCopy}>
          <h1>Đang tải thiết lập giảng dạy…</h1>
          <p>{sync.loadError || 'Vui lòng chờ trong giây lát'}</p>
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
        gradeLevels={gradeLevels}
        onBack={() => setStepSlug('packages', { tab: null })}
        onFinish={() => navigate('/tutor-portal/dashboard')}
      />
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.stepNavigation}>
        <OnboardingStepper
          currentStep={currentStep}
          onStepClick={goToStep}
          isStepEnabled={isStepEnabled}
          sectionStatuses={sectionStatuses}
        />
      </div>

      <div className={styles.body}>
        {currentStep === 1 && (
          <StepAvailability onboarding={onboarding} onSaveAvailability={sync.saveAvailability} saving={sync.saving} />
        )}
        {currentStep === 2 && (
          <StepSubjectRecords
            onboarding={onboarding}
            subjects={subjects}
            gradeLevels={gradeLevels}
            onSaveSubjectRecords={sync.savePricing}
            saving={sync.saving}
          />
        )}
        {currentStep === 3 && (
          <StepCombos
            onboarding={onboarding}
            inactiveCombos={sync.inactiveCombos}
            onCreatePackage={sync.createFixedPackage}
            onUpdatePackage={sync.updateFixedPackage}
            onDeactivatePackage={sync.deactivateFixedPackage}
            onActivatePackage={sync.activateFixedPackage}
          />
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.footerInfo}>
          {blockingReason ? <span className={styles.footerWarn}>{blockingReason}</span> : footerStatusText}
        </div>
        <div className={styles.footerBtns}>
          {currentStep > 1 && (
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
            {sync.saving ? 'Đang lưu...' : currentStep === 3 ? 'Hoàn tất' : 'Tiếp tục'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorOnboarding;

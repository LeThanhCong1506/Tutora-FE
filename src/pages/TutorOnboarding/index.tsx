import React, { useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { PageContainer } from '../../components/shared';
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
  type OnboardingStep,
} from './onboarding-components';

// Bước đang xem sống trên URL (`?step=`) thay vì useState — reload/F5 hoặc share
// link không còn văng về bước 1.
//
// Không còn bước `summary`: bấm "Hoàn tất" là lưu xong và về thẳng dashboard, chỉ báo bằng toast.
// Màn tổng kết trước đây chỉ đọc lại dữ liệu vừa nhập, buộc thêm một cú bấm mà không cho thêm
// quyết định nào — gia sư đã thấy từng bước ngay trước đó rồi.
const STEP_SLUGS = ['availability', 'pricing', 'packages'] as const;
type StepSlug = (typeof STEP_SLUGS)[number];

const STEP_BY_SLUG: Record<StepSlug, OnboardingStep> = {
  availability: 1,
  pricing: 2,
  packages: 3,
};
const SLUG_BY_STEP: Record<OnboardingStep, StepSlug> = { 1: 'availability', 2: 'pricing', 3: 'packages' };
const clampStep = (n: number): OnboardingStep => Math.min(3, Math.max(1, n)) as OnboardingStep;

const TutorOnboarding: React.FC = () => {
  const onboarding = useOnboardingState();
  const { state, hydrate, canFinish } = onboarding;
  const sync = useOnboardingSync(hydrate);
  const { subjects, gradeLevels } = useLookups();

  const [stepSlug, setStepSlug] = useTabParam<StepSlug>(STEP_SLUGS, 'availability', { paramKey: 'step' });
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
  useEffect(() => {
    if (sync.loading || isStepEnabled(currentStep)) return;
    setStepSlug(SLUG_BY_STEP[availabilityReady ? (subjectsReady ? 3 : 2) : 1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync.loading, currentStep, availabilityReady, subjectsReady]);

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
      // savePricing tự hiện toast theo message thật của BE (lưu là áp dụng ngay, không chờ duyệt).
      if (await sync.savePricing(state.subjectRecords)) {
        goNext();
      }
      return;
    }
    // Bước 3 — gói lịch học (kết thúc): chỉ báo bằng toast và Ở LẠI trang. Không màn tổng kết,
    // cũng không tự điều hướng — gia sư tự quyết định đi đâu tiếp, và còn sửa lại được ngay.
    if (await sync.savePackages(state.combos)) {
      toast.success('Đã lưu gói lịch học. Hoàn tất thiết lập!');
    }
  };

  const pageHeader = (
    <PageContainer
      className={styles.pageHeader}
      title="Thiết lập giảng dạy"
      titleInfo="Thiết lập lịch rảnh, môn học, mức giá và các gói lịch để sẵn sàng nhận booking."
      maxWidth="full"
    >
      {null}
    </PageContainer>
  );

  if (sync.loading) {
    return (
      <div className={styles.page}>
        {pageHeader}
        <div className={styles.loadingScreen} role="status" aria-live="polite">
          <div className={styles.loadingSpinner} aria-hidden="true" />
          <div className={styles.loadingCopy}>
            <strong>Đang tải thiết lập giảng dạy…</strong>
            <p>{sync.loadError || 'Vui lòng chờ trong giây lát'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {pageHeader}
      <div className={styles.stepNavigation} data-tour="onboarding-stepper">
        <OnboardingStepper
          currentStep={currentStep}
          onStepClick={goToStep}
          isStepEnabled={isStepEnabled}
          sectionStatuses={sectionStatuses}
        />
      </div>

      <div className={styles.body} data-tour="onboarding-body">
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
            onDeletePackage={sync.deleteFixedPackage}
          />
        )}
      </div>

      <div className={styles.footerPrimaryPill} data-tour="onboarding-cta">
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
  );
};

export default TutorOnboarding;

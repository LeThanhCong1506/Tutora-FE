import React, { useMemo } from 'react';
import { toast } from 'react-toastify';
import type { TutorProfileFormData } from '../hooks/useTutorProfileForm';
import type { TutorFullProfile } from '../../../services/tutorDetail.service';
import { getUserIdFromToken } from '../../../services/auth.service';
import {
  VideoIntroSection,
  AboutSection,
  AcademicPortfolioSection,
  ActiveClassesSection,
  TestimonialsSection,
  BookingSidebar,
} from '../../TutorDetail/components';
import '../../../styles/pages/tutor-detail.css';

// ===== Props =====
interface TutorProfilePreviewProps {
  formData: TutorProfileFormData;
}

/**
 * Map dữ liệu form (đang chỉnh sửa) sang đúng shape `TutorFullProfile` mà trang
 * công khai /tutor-detail/:id dùng. Nhờ vậy chế độ "Xem trước" tái sử dụng CHÍNH
 * các section component của marketplace (Hero/About/Portfolio/Booking…) — gia sư
 * thấy đúng hồ sơ của mình sẽ hiển thị thế nào, và UI luôn đồng bộ với trang thật.
 *
 * Các phần phụ thuộc dữ liệu vận hành (lớp đang dạy, đánh giá) không có trong form:
 *  - activeClasses: để rỗng (section tự ẩn khi không có lớp).
 *  - feedbacks: để null, nhưng truyền tutorId để TestimonialsSection tự lấy đánh giá thật.
 */
const mapFormDataToFullProfile = (data: TutorProfileFormData): TutorFullProfile => ({
  videoIntroUrl: data.videoIntroUrl,

  avatarUrl: data.avatarUrl || null,
  fullName: data.fullName || null,
  headline: data.headline || null,
  teachingAreaCity: data.teachingAreaCity || null,
  teachingAreaDistrict: data.teachingAreaDistrict || null,
  teachingMode: data.teachingMode || null,
  subjects: data.subjects.map((s) => ({
    subjectId: s.subjectId,
    subjectName: s.subjectName,
    gradeLevels: s.gradeLevels,
    tags: s.tags,
  })),
  subjectGradePrices: null,

  bio: data.bio || null,
  education: data.education || null,
  gpa: data.gpa,
  gpaScale: data.gpaScale,
  experience: data.experience || null,

  certificates: data.credentials.map((c) => ({
    certificateId: c.id,
    certificateName: c.name,
    certificateType: c.certificateType,
    issuingOrganization: c.institution,
    yearIssued: c.issueYear,
    credentialId: c.credentialId ?? null,
    credentialUrl: c.credentialUrl ?? null,
    certificateFileUrl: c.certificateUrl ?? '',
    createdAt: c.createdAt ?? '',
    verificationStatus: c.verificationStatus,
    verificationNote: c.verificationNote ?? null,
  })),

  hourlyRate: data.hourlyRate,
  trialLessonPrice: data.trialLessonPrice,
  allowPriceNegotiation: data.allowPriceNegotiation,

  // form `availability` (giờ local HH:mm) → shape availability của trang public.
  // `apiDayOfWeek` đã là chuẩn BE (0=CN..6=T7) mà BookingSidebar mong đợi.
  availabilities: data.availability.map((slot) => ({
    availabilityid: slot.id,
    tutorid: '',
    dayofweek: slot.apiDayOfWeek,
    starttime: slot.startTime,
    endtime: slot.endTime,
    createdat: '',
    dayName: slot.dayName,
  })),
  packages: null,

  totalFeedbacks: data.totalReviews,
  averageRating: data.averageRating,
  totalLessons: 0,
  feedbacks: null,

  totalActiveClasses: 0,
  activeClasses: null,

  combos: null,
});

// ===== Main Preview Component =====
const TutorProfilePreview: React.FC<TutorProfilePreviewProps> = ({ formData }) => {
  const profile = useMemo(() => mapFormDataToFullProfile(formData), [formData]);
  const tutorId = getUserIdFromToken() ?? undefined;

  const handlePreviewBooking = () => {
    toast.info('Đây là bản xem trước. Phụ huynh/học sinh sẽ dùng nút này để đặt lịch trên marketplace.', {
      toastId: 'profile-preview-booking',
    });
  };

  return (
    <div
      className="tutor-detail-page"
      style={{ background: 'var(--color-cream, #faf5ee)', minHeight: 'auto', width: '100%', flex: 1 }}
    >
      <main className="tutor-detail-main" style={{ paddingTop: '30px', paddingBottom: '80px' }}>
        <div className="tutor-detail-container">
          <div className="tutor-detail-content">
            <VideoIntroSection profile={profile} />
            <AboutSection profile={profile} />

            <div className="portfolio-stats-wrapper">
              <AcademicPortfolioSection certificates={profile.certificates} />
            </div>

            <ActiveClassesSection classes={profile.activeClasses} totalActive={profile.totalActiveClasses} />

            <TestimonialsSection
              feedbacks={profile.feedbacks}
              totalFeedbacks={profile.totalFeedbacks}
              tutorId={tutorId}
            />
          </div>

          <BookingSidebar availabilities={profile.availabilities} onBooking={handlePreviewBooking} />
        </div>
      </main>
    </div>
  );
};

export default TutorProfilePreview;

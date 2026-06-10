import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { getCurrentUser } from '../../services/auth.service';
import { isZaloMiniApp } from '../../services/zalo-env';
import { loginWithZalo } from '../../services/zalo-auth.service';
import ZaloRoleSelectModal from '../../components/ZaloRoleSelectModal/ZaloRoleSelectModal';
import BookingModal from './BookingModal';
import { getTutorFullProfile } from '../../services/tutorDetail.service';
import type { TutorFullProfile } from '../../services/tutorDetail.service';
import type { Combo } from '../../types/combo.types';

// TODO(BE): Mock combo data — xóa khi /api/tutors/{id}/combos available.
// Áp dụng chung cho mọi tutor để demo flow "đặt theo gói".
const MOCK_TUTOR_COMBOS: Combo[] = [
  {
    id: 'mock-combo-math-fixed',
    name: 'Combo 8 buổi Toán cố định',
    type: 'fixed',
    subjectId: 1,
    subjectName: 'Toán',
    sessions: [
      { dayOfWeek: 1, startHour: 18, startMinute: 0, durationHours: 1.5 }, // T2 18:00-19:30
      { dayOfWeek: 3, startHour: 18, startMinute: 0, durationHours: 1.5 }, // T4 18:00-19:30
    ],
  },
  {
    id: 'mock-combo-english-flex',
    name: 'Combo Tiếng Anh linh hoạt',
    type: 'flex',
    subjectId: 2,
    subjectName: 'Tiếng Anh',
    sessionsPerWeek: 2,
    sessionsPerMonth: 8,
    hoursPerSession: 1,
    description: 'Phụ huynh tự chọn khung giờ phù hợp từ lịch rảnh của gia sư. Ưu tiên buổi tối hoặc cuối tuần.',
  },
];
import {
    HeroSection,
    AboutSection,
    AcademicPortfolioSection,
    ActiveClassesSection,
    TestimonialsSection,
    BookingSidebar,
    TutorDetailSkeleton,
    formatCurrency,
} from './components';
import '../../styles/pages/tutor-detail.css';

const TutorDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<TutorFullProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showBooking, setShowBooking] = useState(false);
    const [showRoleSelect, setShowRoleSelect] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

    const requireLogin = async (onSuccess: () => void): Promise<void> => {
        const user = getCurrentUser();
        if (!user) {
            if (isZaloMiniApp()) {
                setPendingAction(() => onSuccess);
                setShowRoleSelect(true);
                return;
            }
            toast.info('Vui lòng đăng nhập để sử dụng tính năng này.');
            navigate('/login');
            return;
        }
        onSuccess();
    };

    const handleRoleSelect = async (role: 'Parent' | 'Student' | 'Tutor') => {
        setShowRoleSelect(false);
        try {
            await loginWithZalo(role);
            if (pendingAction) {
                pendingAction();
                setPendingAction(null);
            }
        } catch (e) {
            console.error('[requireLogin] Zalo auth error:', e);
            toast.error('Đăng nhập Zalo thất bại, vui lòng thử lại.');
        }
    };

    useEffect(() => {
        let mounted = true;

        const fetchProfile = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const response = await getTutorFullProfile(id);
                if (mounted) {
                    // TODO(BE): inject mock combos cho demo — xóa khi BE trả về `combos`.
                    const profileWithCombos = { ...response.content, combos: response.content.combos ?? MOCK_TUTOR_COMBOS };
                    setProfile(profileWithCombos);
                    setError(null);
                }
            } catch (err) {
                if (mounted) {
                    console.error('[TutorDetail] Failed to fetch:', err);
                    setError('Có lỗi xảy ra khi tải thông tin gia sư.');
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchProfile();
        return () => { mounted = false; };
    }, [id]);

    if (loading) {
        return <TutorDetailSkeleton />;
    }

    if (error || !profile) {
        return (
            <div className="tutor-detail-page">
                <Header />
                <div className="error-container">
                    <h2>Oops!</h2>
                    <p>{error || 'Không tìm thấy thông tin gia sư.'}</p>
                    <button onClick={() => window.history.back()} className="btn-back">Quay lại</button>
                </div>
                <Footer />
            </div>
        );
    }

    const inMiniApp = isZaloMiniApp();

    return (
        <div className="tutor-detail-page">
            {!inMiniApp && <Header />}

            {/*
              * Breadcrumb (back + Trang chủ / Tìm kiếm Gia sư / Hồ sơ <tên>) đã bỏ
              * theo yêu cầu UX. Lưu ý: trang này SEO-critical (xem CLAUDE.md) —
              * nếu cần khôi phục cấu trúc BreadcrumbList cho rich result của Google,
              * có thể thêm lại bằng JSON-LD trong <head> mà không hiển thị UI.
              */}

            <main
                className="tutor-detail-main"
                style={inMiniApp ? { paddingTop: '0' } : undefined}
            >
                <div className="tutor-detail-container">
                    <div className="tutor-detail-content">
                        <HeroSection profile={profile} />
                        <AboutSection profile={profile} />

                        <div className="portfolio-stats-wrapper">
                            <AcademicPortfolioSection certificates={profile.certificates} />
                        </div>

                        <ActiveClassesSection
                            classes={profile.activeClasses}
                            totalActive={profile.totalActiveClasses}
                        />

                        <TestimonialsSection
                            feedbacks={profile.feedbacks}
                            totalFeedbacks={profile.totalFeedbacks}
                            tutorId={id}
                        />
                    </div>

                    {!inMiniApp && (
                        <BookingSidebar
                            hourlyRate={profile.hourlyRate}
                            trialLessonPrice={profile.trialLessonPrice}
                            availabilities={profile.availabilities}
                            onBooking={() => requireLogin(() => setShowBooking(true))}
                        />
                    )}
                </div>
            </main>
            {!inMiniApp && <Footer />}

            <div className="mobile-sticky-cta">
                <div className="mobile-cta-price">
                    <span className="mobile-cta-price-amount">{formatCurrency(profile.hourlyRate ? Math.round(profile.hourlyRate * 1.05) : null)}</span>
                    <span className="mobile-cta-price-unit">/ buổi học</span>
                </div>
                <button className="mobile-cta-book" onClick={() => requireLogin(() => setShowBooking(true))}>
                    <b>ĐẶT LỊCH</b>
                </button>
            </div>

            <BookingModal
                isOpen={showBooking}
                onClose={() => setShowBooking(false)}
                tutorName={profile.fullName || ''}
                tutorId={id || ''}
                hourlyRate={profile.hourlyRate || 0}
                subjects={profile.subjects || []}
                availabilities={profile.availabilities}
                tutorTeachingMode={profile.teachingMode}
                combos={profile.combos || []}
            />

            {showRoleSelect && (
                <ZaloRoleSelectModal
                    onSelect={handleRoleSelect}
                    onCancel={() => { setShowRoleSelect(false); setPendingAction(null); }}
                />
            )}
        </div>
    );
};

export default TutorDetailPage;

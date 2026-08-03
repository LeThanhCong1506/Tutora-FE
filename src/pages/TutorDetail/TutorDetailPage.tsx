import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { getCurrentUser, hasAnyRole } from '../../services/auth.service';
import { isZaloMiniApp } from '../../services/zalo-env';
import { loginWithZalo } from '../../services/zalo-auth.service';
import ZaloRoleSelectModal from '../../components/ZaloRoleSelectModal/ZaloRoleSelectModal';
import BookingModal from './BookingModal';
import {
    getTutorAvailabilities,
    getTutorFullProfile,
    getTutorSchedule,
    mapPackagesToFixedCombos,
} from '../../services/tutorDetail.service';
import type { TutorFullProfile } from '../../services/tutorDetail.service';
import {
    VideoIntroSection,
    AboutSection,
    AcademicPortfolioSection,
    ActiveClassesSection,
    TestimonialsSection,
    BookingSidebar,
    TutorDetailSkeleton,
} from './components';
import '../../styles/pages/tutor-detail.css';

const TutorDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const inMiniApp = isZaloMiniApp();
    const [profile, setProfile] = useState<TutorFullProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showBooking, setShowBooking] = useState(false);
    const [showRoleSelect, setShowRoleSelect] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const autoBookingTriggered = useRef(false);

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

    const openBooking = () => {
        if (!hasAnyRole(['Parent', 'Student'])) {
            toast.warning('Chỉ phụ huynh hoặc học sinh mới có thể đặt lịch học.', {
                toastId: 'booking-role-forbidden',
            });
            return;
        }

        setShowBooking(true);
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

    // Nút "Đặt lịch" trên tutor card (Zalo OA) mở thẳng trang này kèm ?openBooking=1 —
    // tự mở BookingModal ngay khi profile load xong, thay cho luồng chat text cũ (chọn gói
    // qua DeepSeek, xem tutora-zalo-bot MiniAppButtonService.buildTutorDetailLink). Chỉ tự
    // mở ĐÚNG 1 lần (autoBookingTriggered) — tránh mở lại nếu profile re-fetch/re-render.
    useEffect(() => {
        if (autoBookingTriggered.current || !profile) return;
        if (searchParams.get('openBooking') !== '1') return;
        autoBookingTriggered.current = true;
        void requireLogin(openBooking);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile, searchParams]);

    useEffect(() => {
        let mounted = true;

        const fetchProfile = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const [profileResult, availabilityResult, scheduleResult] = await Promise.allSettled([
                    getTutorFullProfile(id),
                    getTutorAvailabilities(id),
                    getTutorSchedule(id),
                ]);

                if (profileResult.status === 'rejected') {
                    throw profileResult.reason;
                }

                const response = profileResult.value;
                const freshAvailabilities =
                    availabilityResult.status === 'fulfilled'
                        ? availabilityResult.value.content
                        : response.content.availabilities;
                const freshPackages =
                    scheduleResult.status === 'fulfilled'
                        ? scheduleResult.value.content.packages
                        : response.content.packages;

                if (mounted) {
                    const profileWithCombos = {
                        ...response.content,
                        availabilities: freshAvailabilities ?? [],
                        packages: freshPackages ?? [],
                        combos: mapPackagesToFixedCombos(freshPackages),
                    };
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
            <div className={`tutor-detail-page${inMiniApp ? ' tutor-detail-page--mini-app' : ''}`}>
                {!inMiniApp && <Header />}
                <div className="error-container">
                    <h2>Oops!</h2>
                    <p>{error || 'Không tìm thấy thông tin gia sư.'}</p>
                    <button onClick={() => window.history.back()} className="btn-back">Quay lại</button>
                </div>
                {!inMiniApp && <Footer />}
            </div>
        );
    }

    return (
        <div className={`tutor-detail-page${inMiniApp ? ' tutor-detail-page--mini-app' : ''}`}>
            {!inMiniApp && <Header />}

            {/*
              * Breadcrumb (back + Trang chủ / Tìm kiếm Gia sư / Hồ sơ <tên>) đã bỏ
              * theo yêu cầu UX. Lưu ý: trang này SEO-critical (xem CLAUDE.md) —
              * nếu cần khôi phục cấu trúc BreadcrumbList cho rich result của Google,
              * có thể thêm lại bằng JSON-LD trong <head> mà không hiển thị UI.
              */}

            <main className="tutor-detail-main">
                <div className="tutor-detail-container">
                    <div className="tutor-detail-content">
                        <VideoIntroSection profile={profile} />
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
                            availabilities={profile.availabilities}
                            onBooking={() => requireLogin(openBooking)}
                        />
                    )}
                </div>
            </main>
            {!inMiniApp && <Footer />}

            <div className="mobile-sticky-cta">
                <button className="mobile-cta-book" onClick={() => requireLogin(openBooking)}>
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
                subjectGradePrices={profile.subjectGradePrices || []}
                packages={profile.packages || []}
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

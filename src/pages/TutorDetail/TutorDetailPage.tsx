import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { getCurrentUser, getCurrentUserRole, hasAnyRole, setPendingRedirect } from '../../services/auth.service';
import { createChannel } from '../../services/chat.service';
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
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const inMiniApp = isZaloMiniApp();
    const [profile, setProfile] = useState<TutorFullProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showBooking, setShowBooking] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [showRoleSelect, setShowRoleSelect] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const autoBookingTriggered = useRef(false);
    // Quay lại từ /student-portal/profile sau khi lưu SĐT phụ huynh cho luồng OTP giao dịch lớn —
    // tự mở lại popup đặt lịch, thẳng vào bước thanh toán của đúng booking đang thanh toán dở.
    // Chốt lại thành state cục bộ (không đọc trực tiếp từ location.state ở mọi lần render) vì
    // effect bên dưới sẽ xoá location.state ngay sau khi đọc — nếu đọc trực tiếp, giá trị sẽ
    // biến mất trước khi BookingModal kịp nhận prop này.
    const [resumeBookingId, setResumeBookingId] = useState<number | null>(null);
    const autoResumeTriggered = useRef(false);

    // React Router giữ nguyên scrollY khi đổi route trong cùng document. Đưa trang chi tiết
    // về đầu trước khi browser paint để người dùng không rơi vào giữa hồ sơ theo vị trí của
    // thẻ vừa chọn ở trang tìm kiếm.
    useLayoutEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, [id]);

    const requireLogin = async (onSuccess: () => void): Promise<void> => {
        const user = getCurrentUser();
        if (!user) {
            if (isZaloMiniApp()) {
                setPendingAction(() => onSuccess);
                setShowRoleSelect(true);
                return;
            }
            toast.info('Vui lòng đăng nhập để sử dụng tính năng này.');
            // Đăng nhập xong quay lại đúng hồ sơ gia sư đang xem, thay vì rơi về dashboard
            // và phải tìm lại từ đầu (LoginForm đọc và xoá key này ngay sau khi vào).
            setPendingRedirect(`${location.pathname}${location.search}`);
            navigate('/login');
            return;
        }
        onSuccess();
    };

    // Nút yêu thích nằm trong VideoIntroSection, nhưng luồng mời đăng nhập (Mini App dùng
    // ZaloRoleSelectModal, web thì sang /login) chỉ có ở trang này nên truyền xuống cho con.
    // Đăng nhập xong KHÔNG tự lưu hộ — người dùng bấm lại trái tim nếu vẫn muốn.
    const promptLoginForFavorite = () => {
        void requireLogin(() => { });
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

    // Nhắn tin với gia sư trước khi đặt lịch: tạo/lấy kênh chat rồi mở thẳng cuộc trò chuyện
    // ở trang Tin nhắn — cùng cơ chế với nút "Nhắn tin" trên TutorCard (trang tìm kiếm).
    const openMessage = async () => {
        if (!hasAnyRole(['Parent', 'Student'])) {
            toast.warning('Chỉ phụ huynh hoặc học sinh mới có thể nhắn tin với gia sư.', {
                toastId: 'message-role-forbidden',
            });
            return;
        }
        if (sendingMessage || !id || !profile) return;

        setSendingMessage(true);
        try {
            const res = await createChannel(id);
            const channelId = res.content?.channelId;
            if (!channelId) throw new Error('Thiếu channelId');

            const role = (getCurrentUserRole() || '').toLowerCase();
            const messagesPath = role === 'student' ? '/student-portal/messages' : '/parent-portal/messages';

            navigate(messagesPath, {
                state: {
                    openChannel: {
                        channelId,
                        bookingId: 0,
                        otherUserId: id,
                        otherUserName: profile.fullName,
                        otherUserAvatarUrl: profile.avatarUrl,
                        status: 'active',
                        lastMessageAt: '',
                        lastMessagePreview: '',
                    },
                },
            });
        } catch {
            toast.error('Không mở được cuộc trò chuyện. Vui lòng thử lại.', { toastId: 'tutor-detail-message-error' });
        } finally {
            setSendingMessage(false);
        }
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

    // Tương tự ?openBooking=1 ở trên, nhưng cho luồng resume OTP giao dịch lớn: quay lại từ trang
    // hồ sơ (state.resumeBookingOtp), tự mở popup thẳng vào bước thanh toán, không qua wizard.
    useEffect(() => {
        if (autoResumeTriggered.current || !profile) return;
        const fromState = (location.state as { resumeBookingOtp?: number } | null)?.resumeBookingOtp;
        if (fromState == null) return;
        autoResumeTriggered.current = true;
        setResumeBookingId(fromState);
        setShowBooking(true);
        // Xoá state khỏi history để refresh/back không mở lại popup lần nữa.
        navigate(location.pathname + location.search, { replace: true, state: null });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile, location.state]);

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
                        <VideoIntroSection
                            profile={profile}
                            tutorId={id || ''}
                            onFavoriteBlocked={promptLoginForFavorite}
                        />
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
                            onMessage={() => requireLogin(openMessage)}
                            messaging={sendingMessage}
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
                resumeBookingId={resumeBookingId}
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

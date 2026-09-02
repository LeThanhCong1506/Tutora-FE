import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { isZaloMiniApp } from './services/zalo-env';
import { DeeplinkHandler } from './components/DeeplinkHandler/DeeplinkHandler';

// --- Static imports (layouts, infrastructure, always-needed components) ---
// Admin layout đã chuyển sang repo riêng `tutora-admin-frontend` (xem plan
// t-i-mu-n-t-ch-resource-shimmering-wren.md). User-facing repo chỉ giữ 3 portal.
import TutorPortalLayout from './layouts/TutorPortalLayout';
import ParentLayout from './layouts/ParentLayout';
import StudentLayout from './layouts/StudentLayout';
import { StudentProfileGate, StudentSelfRegisteredGate } from './contexts/StudentProfileContext';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import SessionExpiredModal from './components/SessionExpiredModal';
import ChatAssistant from './components/ChatAssistant/ChatAssistant';
import PageLoader from './components/PageLoader/PageLoader';
import { ErrorBoundary } from './components/shared';
import { getCurrentUser, isTokenExpired, clearUserFromStorage } from './services/auth.service';
import { apiClient } from './services/apiClient';
import { signalRService } from './services/signalr.service';
import { ToastContainer, Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// TUTORA brand override — phải import SAU default CSS để cascade thắng.
import './styles/toastify.css';
import ParentDisputes from './pages/ParentDisputes';

// --- Lazy-loaded pages ---
// Public
const HomePage = lazy(() => import('./pages/Home/HomePage'));
const TutorSearchPage = lazy(() => import('./pages/TutorSearch/TutorSearchPage'));
const MiniAppSearchFormPage = lazy(() => import('./pages/MiniAppSearchForm/MiniAppSearchFormPage'));
const PolicyPage = lazy(() => import('./pages/Policy'));
const FavoritesPage = lazy(() => import('./pages/Favorites'));
const TutorDetailPage = lazy(() => import('./pages/TutorDetail/TutorDetailPage'));
const ParentBookingDemo = lazy(() => import('./pages/ParentBookingDemo'));
const LoginPage = lazy(() => import('./pages/Login/LoginPage'));
const RegisterPage = lazy(() => import('./pages/Register/RegisterPage'));
const ResetPasswordPage = lazy(() => import('./pages/Login/ResetPasswordPage'));
const VerifyPhonePage = lazy(() => import('./pages/VerifyPhone/VerifyPhonePage'));
const SocialRegisterPage = lazy(() => import('./pages/SocialRegister/SocialRegisterPage'));
const ZaloCallbackPage = lazy(() => import('./pages/ZaloCallback/ZaloCallbackPage'));

// Error pages
const NotFoundPage = lazy(() => import('./pages/Error/NotFoundPage'));
const UnauthorizedPage = lazy(() => import('./pages/Error/UnauthorizedPage'));
const ForbiddenPage = lazy(() => import('./pages/Error/ForbiddenPage'));

// Admin pages — moved to tutora-admin-frontend repo.

// Tutor Portal pages
const TutorOnboarding = lazy(() => import('./pages/TutorOnboarding'));
const TutorPortalProfile = lazy(() => import('./pages/TutorPortal/TutorPortalProfile'));
const TutorPortalDashboard = lazy(() => import('./pages/TutorPortal/TutorPortalDashboard'));
const TutorPortalMessages = lazy(() => import('./pages/TutorPortal/TutorPortalMessages'));
const TutorPortalCalendar = lazy(() => import('./pages/TutorPortal/TutorPortalCalendar'));
const TutorPortalClasses = lazy(() => import('./pages/TutorPortal/TutorPortalClasses'));
const TutorPortalClassSessionDetail = lazy(() => import('./pages/TutorPortal/TutorPortalClassSessionDetail'));
const TutorPortalDisputes = lazy(() => import('./pages/TutorPortal/TutorPortalDisputes'));
const TutorPortalDisputeDetail = lazy(() => import('./pages/TutorPortal/TutorPortalDisputeDetail'));
const TutorPortalStudentProfile = lazy(() => import('./pages/TutorPortal/TutorPortalStudentProfile'));
const TutorPortalBookings = lazy(() => import('./pages/TutorPortal/TutorPortalBookings'));
const TutorPortalBookingDetail = lazy(() => import('./pages/TutorPortal/TutorPortalBookingDetail'));
const TutorFinanceDashboardPage = lazy(
  () => import('./pages/TutorFinance/TutorFinanceDashboard/TutorFinanceDashboardPage'),
);
const TransactionHistoryPage = lazy(() => import('./pages/TutorFinance/TransactionHistory/TransactionHistoryPage'));
const BankInfoManagementPage = lazy(() => import('./pages/TutorFinance/BankInfoManagement/BankInfoManagementPage'));
const TutorAccount = lazy(() => import('./pages/TutorAccount'));
const CreateWithdrawalPage = lazy(() => import('./pages/TutorFinance/CreateWithdrawal/CreateWithdrawalPage'));
const WithdrawalListPage = lazy(() => import('./pages/TutorFinance/WithdrawalList/WithdrawalListPage'));
const WithdrawalDetailPage = lazy(() => import('./pages/TutorFinance/WithdrawalList/WithdrawalDetailPage'));

// Parent pages
const ParentDashboard = lazy(() => import('./pages/ParentDashboard'));
const ParentBooking = lazy(() => import('./pages/ParentBooking'));
const BookingDetail = lazy(() => import('./pages/ParentBooking/Details'));
const ParentWallet = lazy(() => import('./pages/ParentWallet'));
const ParentWalletTransactions = lazy(() => import('./pages/ParentWallet/AllTransactionsPage'));
const ParentWalletWithdrawals = lazy(() => import('./pages/ParentWallet/WithdrawalRequestsPage'));
const ParentWalletWithdrawalDetail = lazy(() => import('./pages/ParentWallet/WithdrawalDetailPage'));
// Dùng chung Parent/Student — xem BankAccountPage.tsx (tương tự StudentWallet tái dùng ParentWallet).
const BankAccountPage = lazy(() => import('./pages/ParentWallet/BankAccountPage'));
const ParentMessage = lazy(() => import('./pages/ParentMessage'));
const PaymentPage = lazy(() => import('./pages/ParentBooking/Payment'));
const ParentStudent = lazy(() => import('./pages/ParentStudent'));
const ParentLessons = lazy(() => import('./pages/ParentLessons'));
const ParentLessonDetail = lazy(() => import('./pages/ParentLessons/ParentLessonDetail'));
const ParentAccount = lazy(() => import('./pages/ParentAccount'));

// Student pages
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const StudentWallet = lazy(() => import('./pages/StudentWallet'));
const StudentBooking = lazy(() => import('./pages/StudentBooking'));
const StudentLessons = lazy(() => import('./pages/StudentLessons'));
const StudentLessonDetail = lazy(() => import('./pages/StudentLessons/StudentLessonDetail'));
const StudentDisputes = lazy(() => import('./pages/StudentLessons/StudentDisputes'));
const StudentDisputeDetail = lazy(() => import('./pages/StudentLessons/StudentDisputeDetail'));
const ParentDisputeDetail = lazy(() => import('./pages/ParentDisputes/ParentDisputeDetail'));
const StudentAccount = lazy(() => import('./pages/StudentAccount'));
const StudentProfile = lazy(() => import('./pages/StudentProfile'));
const StudentProgress = lazy(() => import('./pages/StudentProgress'));

// Payment callback
const PaymentCallback = lazy(() => import('./pages/PaymentCallback/PaymentCallback'));
// Route trung gian cho nút CTA trong tin ZNS — tự đưa người bấm về đúng cổng theo vai trò đang
// đăng nhập, vì 1 template có thể gửi cho phụ huynh HOẶC học sinh tự quản lý HOẶC gia sư.
const GoRedirect = lazy(() => import('./pages/GoRedirect/GoRedirect'));
const NotificationsPage = lazy(() => import('./pages/Notifications/NotificationsPage'));
const SupportChatPage = lazy(() => import('./pages/Support/SupportChatPage'));

// Live video-call session (full-screen, no portal chrome)
const LiveSession = lazy(() => import('./pages/LiveSession'));
// Phòng chờ trước khi vào lớp — chờ đủ cả gia sư và học viên rồi mới vào phòng học
const SessionLobby = lazy(() => import('./pages/SessionLobby'));
// const EmotionTest = lazy(() => import('./pages/EmotionTest'));

// ---------------------

const inMiniApp = isZaloMiniApp();

const ASSISTANT_HIDDEN_PREFIXES = [
  '/tutor-portal',
  '/parent-portal',
  '/student-portal',
  '/live-session',
  '/session-lobby',
  '/go',
];

// Trang "Tổng quan" của mỗi portal — ngoại lệ vẫn hiện bong bóng Trợ lý Tutora dù nằm
// trong 1 trong các prefix bị ẩn ở trên.
const ASSISTANT_VISIBLE_PATHS = [
  '/tutor-portal/dashboard',
  '/parent-portal/dashboard',
  '/student-portal/dashboard',
];

function LegacyStudentLessonsRedirect() {
  const { lessonId } = useParams();
  const location = useLocation();
  const pathname = lessonId ? `/student-portal/calendar/${lessonId}` : '/student-portal/calendar';

  return <Navigate to={{ pathname, search: location.search, hash: location.hash }} replace />;
}

function LegacyTutorClassesRedirect() {
  const location = useLocation();

  return <Navigate to={{ pathname: '/tutor-portal/calendar', search: location.search, hash: location.hash }} replace />;
}

/**
 * Văn bản pháp lý từng nằm ở /policies/<slug> trước khi gộp vào trang "Về chúng tôi".
 * Giữ redirect vì đây là loại URL người dùng hay bookmark và được trích dẫn trong chính
 * nội dung điều khoản.
 */
function LegacyPolicyRedirect() {
  const { slug } = useParams<{ slug: string }>();

  return <Navigate to={slug ? `/about/${slug}` : '/about'} replace />;
}

/**
 * `/live-session/:id/demo-ui` -> render CHÍNH trang LiveSession ở chế độ mock.
 * `mock=1` vào URL để trang tự chạy nhánh dữ liệu giả (không Agora, không API).
 */
// function DemoUiRoute() {
//   const [searchParams] = useSearchParams();

//   if (searchParams.get('mock') !== '1') {
//     const params = new URLSearchParams(searchParams);
//     params.set('mock', '1');
//     return <Navigate to={{ search: `?${params.toString()}` }} replace />;
//   }
//   return <LiveSession />;
// }

function App() {
  const location = useLocation();
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const [forceLogoutReason, setForceLogoutReason] = useState<string | null>(null);
  const isDemoRoute = location.pathname.startsWith('/demo/');
  const showChatAssistant =
    !inMiniApp &&
    (ASSISTANT_VISIBLE_PATHS.includes(location.pathname) ||
      !ASSISTANT_HIDDEN_PREFIXES.some((prefix) => location.pathname.startsWith(prefix)));

  // Detect Supabase recovery hash and redirect to /reset-password
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && location.pathname === '/') {
      const hashParams = new URLSearchParams(hash.substring(1));
      const type = hashParams.get('type');
      if (type === 'recovery') {
        // Redirect to /reset-password while preserving the hash fragment
        window.location.href = `/reset-password${hash}`;
      }
    }
  }, [location.pathname]);

  const checkTokenExpiry = useCallback(async () => {
    const user = getCurrentUser();
    if (!user?.accessToken || !isTokenExpired()) return;

    // Không tự gọi /tokens/refresh ở đây — apiClient's response interceptor đã có
    // mutex (isRefreshing/failedQueue) lo việc này cho MỌI request trong app. Từng có
    // 1 đường refresh riêng ở đây, chạy song song độc lập với interceptor đó; khi cả 2
    // cùng refresh gần như đồng thời, request thứ 2 dùng refresh token vừa bị request
    // thứ 1 revoke (rotation single-use) → BE tưởng bị đánh cắp, revoke sạch cả family
    // → user bị đăng xuất dù đang dùng app bình thường. Gọi qua apiClient để đi chung
    // 1 đường, dùng endpoint nhẹ có sẵn cho mọi role (bell badge) chỉ để kích hoạt
    // interceptor refresh nếu cần — bản thân dữ liệu trả về không dùng tới.
    try {
      await apiClient.get('/notifications/mine/unread-count');
      return; // còn hạn hoặc refresh (qua interceptor) đã tự lo xong, không cần show modal
    } catch {
      await clearUserFromStorage();
      setShowSessionExpired(true);
    }
  }, []);

  // Check token expiry khi route thay đổi
  useEffect(() => {
    if (isDemoRoute) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkTokenExpiry();
  }, [location.pathname, checkTokenExpiry, isDemoRoute]);

  // Check token expiry định kỳ mỗi 30 giây
  useEffect(() => {
    if (isDemoRoute) return;
    const interval = setInterval(checkTokenExpiry, 30000);
    return () => clearInterval(interval);
  }, [checkTokenExpiry, isDemoRoute]);

  // Lắng nghe "ForceLogout" từ BE — đăng nhập ở thiết bị khác (chỉ giữ 1 phiên web/Zalo
  // Mini App) hoặc mật khẩu vừa bị đổi. Đẩy tức thời qua SignalR, không cần đợi access
  // token tự hết hạn (~1h) mới bị đá.
  useEffect(() => {
    const unsubscribe = signalRService.subscribeToForceLogout(async (payload) => {
      await clearUserFromStorage();
      setForceLogoutReason(payload?.reason ?? null);
      setShowSessionExpired(true);
    });
    return unsubscribe;
  }, []);

  return (
    <div>
      <SessionExpiredModal
        isOpen={showSessionExpired}
        onClose={() => setShowSessionExpired(false)}
        title={
          forceLogoutReason === 'new_login'
            ? 'Tài khoản đã đăng nhập ở thiết bị khác'
            : forceLogoutReason === 'password_changed'
              ? 'Mật khẩu vừa được thay đổi'
              : undefined
        }
        description={
          forceLogoutReason === 'new_login'
            ? 'Tài khoản của bạn vừa đăng nhập ở một thiết bị/trình duyệt khác. Vui lòng đăng nhập lại nếu đây không phải là bạn.'
            : forceLogoutReason === 'password_changed'
              ? 'Mật khẩu tài khoản vừa được thay đổi. Vui lòng đăng nhập lại bằng mật khẩu mới.'
              : undefined
        }
      />
      <ToastContainer
        position="top-right"
        autoClose={5000}
        limit={3}
        theme="light"
        transition={Slide}
        closeOnClick
        pauseOnHover
        pauseOnFocusLoss
        newestOnTop
        draggable
        /* Trên mọi modal — xem ghi chú ở .Toastify__toast-container trong styles/toastify.css. */
        style={{ zIndex: 100100 }}
      />

      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          {inMiniApp && <DeeplinkHandler />}
          <Routes>
            {/* Public Routes */}
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/tutor-search" element={<TutorSearchPage />} />
            <Route path="/mini-app-search" element={<MiniAppSearchFormPage />} />
            <Route path="/demo/parent-booking" element={<ParentBookingDemo />} />
            <Route path="/demo/parent-booking/:tutorId" element={<ParentBookingDemo />} />
            <Route path="/demo/parent-booking/tutor/:tutorId" element={<ParentBookingDemo />} />
            {/* <Route path="/classroom/:id/test-emotion" element={<EmotionTest />} /> */}
            <Route path="/tutor-detail" element={<Navigate to="/" replace />} />
            <Route path="/tutor-detail/:id" element={<TutorDetailPage />} />

            {/* "Về chúng tôi" — giới thiệu Tutora và toàn bộ văn bản pháp lý dùng chung một
                layout có sidebar. Public, có cả trong Zalo Mini App vì người dùng Zalo cũng
                phải đọc được thứ họ tick đồng ý. Route động theo slug: nội dung nằm trong DB
                và admin thêm văn bản mới qua CMS mà không cần deploy lại FE.
                `/about` không có param → trang hiển thị văn bản giới thiệu. */}
            <Route path="/about" element={<PolicyPage />} />
            <Route path="/about/:slug" element={<PolicyPage />} />
            {/* Đường dẫn cũ trước khi gộp vào /about. */}
            <Route path="/terms" element={<Navigate to="/about/terms" replace />} />
            <Route path="/privacy" element={<Navigate to="/about/privacy" replace />} />
            {/* "Quy chế hoạt động" cũ nói về đặt lịch, phí dịch vụ, tạm giữ và giải ngân, đổi
                lịch, vắng mặt, khiếu nại, rút tiền — 8/11 mục nay nằm trong Điều khoản sử dụng
                (mục 5 và 6). Trỏ sang Quy tắc cộng đồng là sai: bên đó chỉ có chuẩn mực ứng xử,
                người vào tra mức phí dịch vụ sẽ không thấy gì. */}
            <Route path="/operating-rules" element={<Navigate to="/about/terms" replace />} />
            <Route path="/policies" element={<Navigate to="/about" replace />} />
            <Route path="/policies/:slug" element={<LegacyPolicyRedirect />} />

            {/* Tutor Portal — không có trong Zalo Mini App */}
            {!inMiniApp && (
              <>
                {/* Tutor Portal - PROTECTED */}
                <Route
                  path="/tutor-portal"
                  element={
                    <ProtectedRoute allowedRoles={['Tutor']}>
                      <TutorPortalLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/tutor-portal/dashboard" replace />} />
                  <Route path="onboarding" element={<TutorOnboarding />} />
                  <Route path="dashboard" element={<TutorPortalDashboard />} />
                  <Route path="profile" element={<TutorPortalProfile />} />
                  {/* Lịch dạy đã gộp vào Onboarding — mọi URL /tutor-portal/schedule điều hướng sang onboarding */}
                  <Route path="schedule" element={<Navigate to="/tutor-portal/onboarding" replace />} />
                  <Route path="messages" element={<TutorPortalMessages />} />
                  {/* Lịch dạy — đồng bộ giao diện với /student-portal/calendar */}
                  <Route path="calendar" element={<TutorPortalCalendar />} />
                  <Route path="class-sessions" element={<Navigate to="/tutor-portal/calendar" replace />} />
                  <Route path="class-sessions/:classSessionId" element={<TutorPortalClassSessionDetail />} />
                  <Route path="disputes" element={<TutorPortalDisputes />} />
                  {/* Khiếu nại có trang riêng thay vì card nhúng trong chi tiết buổi học.
                      Param là classSessionId vì toàn bộ API khiếu nại keyed theo buổi học. */}
                  <Route path="disputes/:classSessionId" element={<TutorPortalDisputeDetail />} />
                  <Route path="classes" element={<TutorPortalClasses />} />
                  <Route path="classes/:classId" element={<LegacyTutorClassesRedirect />} />
                  <Route path="students/:studentId" element={<TutorPortalStudentProfile />} />
                  <Route path="bookings" element={<TutorPortalBookings />} />
                  <Route path="bookings/:id" element={<TutorPortalBookingDetail />} />
                  <Route path="finance" element={<TutorFinanceDashboardPage />} />
                  <Route path="finance/transactions" element={<TransactionHistoryPage />} />
                  <Route path="finance/bank-info" element={<BankInfoManagementPage />} />
                  <Route path="finance/withdraw" element={<CreateWithdrawalPage />} />
                  <Route path="finance/withdrawals" element={<WithdrawalListPage />} />
                  <Route path="finance/withdrawals/:id" element={<WithdrawalDetailPage />} />
                  <Route path="account" element={<TutorAccount />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="support" element={<SupportChatPage />} />
                </Route>
              </>
            )}

            {/* Parent Layout - PROTECTED */}
            <Route
              path="/parent-portal"
              element={
                <ProtectedRoute allowedRoles={['Parent']}>
                  <ParentLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/parent-portal/dashboard" replace />} />
              <Route path="dashboard" element={<ParentDashboard />} />
              <Route path="booking" element={<ParentBooking />} />
              <Route path="booking/:id" element={<BookingDetail />} />
              <Route path="booking/:id/payment" element={<PaymentPage />} />
              <Route path="student" element={<ParentStudent />} />
              <Route path="wallet" element={<ParentWallet />} />
              <Route path="wallet/transactions" element={<ParentWalletTransactions />} />
              <Route path="wallet/withdrawals" element={<ParentWalletWithdrawals />} />
              <Route path="wallet/withdrawals/:id" element={<ParentWalletWithdrawalDetail />} />
              <Route path="wallet/bank-account" element={<BankAccountPage />} />
              <Route path="messages" element={<ParentMessage />} />
              <Route path="favorites" element={<FavoritesPage />} />
              <Route path="lessons" element={<ParentLessons />} />
              <Route path="lessons/:lessonId" element={<ParentLessonDetail />} />
              <Route path="account" element={<ParentAccount />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="support" element={<SupportChatPage />} />
              <Route path="disputes" element={<ParentDisputes />} />
              <Route path="disputes/:classSessionId" element={<ParentDisputeDetail />} />
            </Route>

            {/* Student Layout - PROTECTED */}
            <Route
              path="/student-portal"
              element={
                <ProtectedRoute allowedRoles={['Student']}>
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
              {/* Gate: ép hoàn tất hồ sơ học sinh ở lần đăng nhập đầu tiên trước khi vào các trang khác */}
              <Route element={<StudentProfileGate />}>
                <Route index element={<Navigate to="/student-portal/dashboard" replace />} />
                <Route path="dashboard" element={<StudentDashboard />} />
                <Route element={<StudentSelfRegisteredGate />}>
                  <Route path="booking" element={<StudentBooking />} />
                  <Route path="booking/:id" element={<BookingDetail />} />
                  <Route path="booking/:id/payment" element={<PaymentPage />} />
                </Route>
                <Route path="favorites" element={<FavoritesPage />} />
                <Route path="calendar" element={<StudentLessons />} />
                <Route path="progress" element={<StudentProgress />} />
                <Route path="calendar/:lessonId" element={<StudentLessonDetail />} />
                <Route path="lessons" element={<LegacyStudentLessonsRedirect />} />
                <Route path="lessons/:lessonId" element={<LegacyStudentLessonsRedirect />} />
                {/* Ví CHỈ cho học sinh tự đăng ký — tài khoản do phụ huynh quản lý bị chặn (kể cả gõ URL).
                    Trang ví student riêng (copy UI parent) để tương lai tùy biến UI/UX/tính năng độc lập. */}
                <Route element={<StudentSelfRegisteredGate />}>
                  <Route path="wallet" element={<StudentWallet />} />
                  <Route path="wallet/transactions" element={<ParentWalletTransactions />} />
                  <Route path="wallet/withdrawals" element={<ParentWalletWithdrawals />} />
                  <Route path="wallet/withdrawals/:id" element={<ParentWalletWithdrawalDetail />} />
                  <Route path="wallet/bank-account" element={<BankAccountPage />} />
                </Route>
                {/* Khiếu nại: học sinh do phụ huynh quản lý cũng được xem/tạo (phụ huynh vẫn được báo
                    qua thông báo khi con tạo/phản hồi khiếu nại) — không đặt trong gate ví ở trên nữa. */}
                <Route path="disputes" element={<StudentDisputes />} />
                <Route path="disputes/:classSessionId" element={<StudentDisputeDetail />} />
                <Route path="messages" element={<ParentMessage />} />
                <Route path="profile" element={<StudentProfile />} />
                <Route path="account" element={<StudentAccount />} />
                <Route path="notifications" element={<NotificationsPage />} />
                {/* Điểm vào chat Admin nằm trong cột hội thoại của trang Tin nhắn. */}
                <Route path="support" element={<Navigate to="/student-portal/messages" replace />} />
              </Route>
            </Route>

            {/* PayOS callback - loaded inside iframe after payment */}
            <Route path="/payment/success" element={<PaymentCallback />} />
            <Route path="/payment/cancel" element={<PaymentCallback />} />
            <Route path="/go/:target" element={<GoRedirect />} />
            {/* Dạng path cho id — nút ZNS đang dùng dạng query `?b=`, giữ cả hai để không phụ thuộc
                việc công cụ Zalo có chấp nhận tham số nằm trong đường dẫn hay không. */}
            <Route path="/go/:target/:id" element={<GoRedirect />} />

            {/* Live video-call session — full-screen, không có portal chrome */}
            <Route
              path="/live-session/:classSessionId"
              element={
                <ProtectedRoute allowedRoles={['Tutor', 'Student']}>
                  <LiveSession />
                </ProtectedRoute>
              }
            />

            {/* <Route path="/live-session/:classSessionId/demo-ui" element={<DemoUiRoute />} /> */}

            {/* Phòng chờ trước buổi học — chờ đủ 2 phía rồi tự chuyển vào live-session */}
            <Route
              path="/session-lobby/:classSessionId"
              element={
                <ProtectedRoute allowedRoles={['Tutor', 'Student']}>
                  <SessionLobby />
                </ProtectedRoute>
              }
            />

            {/* Auth routes — không có trong Zalo Mini App (auth qua Zalo token) */}
            {!inMiniApp && (
              <>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-phone" element={<VerifyPhonePage />} />
                <Route path="/auth/social-complete" element={<SocialRegisterPage />} />
                <Route path="/auth/zalo/callback" element={<ZaloCallbackPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
              </>
            )}

            {/* Error Pages */}
            <Route path="/401" element={<UnauthorizedPage />} />
            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="/404" element={<NotFoundPage />} />

            {/* Catch-all Route - Must be last */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        {showChatAssistant && <ChatAssistant />}
      </ErrorBoundary>
    </div>
  );
}

export default App;

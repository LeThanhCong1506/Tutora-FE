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
import axios from 'axios';
import { getCurrentUser, isTokenExpired, updateTokens, clearUserFromStorage } from './services/auth.service';

const BACKEND_API = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';
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
const TutorPortalClassSessionDetail = lazy(() => import('./pages/TutorPortal/TutorPortalClassSessionDetail'));
const TutorPortalDisputes = lazy(() => import('./pages/TutorPortal/TutorPortalDisputes'));
const TutorPortalStudentProfile = lazy(() => import('./pages/TutorPortal/TutorPortalStudentProfile'));
const TutorPortalBookings = lazy(() => import('./pages/TutorPortal/TutorPortalBookings'));
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
const StudentAccount = lazy(() => import('./pages/StudentAccount'));
const StudentProfile = lazy(() => import('./pages/StudentProfile'));

// Payment callback
const PaymentCallback = lazy(() => import('./pages/PaymentCallback/PaymentCallback'));
const NotificationsPage = lazy(() => import('./pages/Notifications/NotificationsPage'));

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

function App() {
  const location = useLocation();
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const isDemoRoute = location.pathname.startsWith('/demo/');
  const showChatAssistant =
    !inMiniApp && !ASSISTANT_HIDDEN_PREFIXES.some((prefix) => location.pathname.startsWith(prefix));

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

    // Thử silent refresh trước khi show modal
    if (user.refreshToken) {
      try {
        const response = await axios.post(`${BACKEND_API}/tokens/refresh`, {
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
        });
        const { token, refreshToken } = response.data.content;
        await updateTokens(token, refreshToken);
        return; // refresh thành công, không show modal
      } catch {
        await clearUserFromStorage();
      }
    }

    setShowSessionExpired(true);
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

  return (
    <div>
      <SessionExpiredModal isOpen={showSessionExpired} onClose={() => setShowSessionExpired(false)} />
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
        style={{ zIndex: 99999 }}
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
                  {/* Legacy: URL /classes từng dùng bookingId, nên quay về lịch thay vì hiểu nhầm là classSessionId. */}
                  <Route path="classes" element={<LegacyTutorClassesRedirect />} />
                  <Route path="classes/:classId" element={<LegacyTutorClassesRedirect />} />
                  <Route path="students/:studentId" element={<TutorPortalStudentProfile />} />
                  <Route path="bookings" element={<TutorPortalBookings />} />
                  <Route path="finance" element={<TutorFinanceDashboardPage />} />
                  <Route path="finance/transactions" element={<TransactionHistoryPage />} />
                  <Route path="finance/bank-info" element={<BankInfoManagementPage />} />
                  <Route path="finance/withdraw" element={<CreateWithdrawalPage />} />
                  <Route path="finance/withdrawals" element={<WithdrawalListPage />} />
                  <Route path="finance/withdrawals/:id" element={<WithdrawalDetailPage />} />
                  <Route path="account" element={<TutorAccount />} />
                  <Route path="notifications" element={<NotificationsPage />} />
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
              <Route path="messages" element={<ParentMessage />} />
              <Route path="lessons" element={<ParentLessons />} />
              <Route path="lessons/:lessonId" element={<ParentLessonDetail />} />
              <Route path="account" element={<ParentAccount />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="disputes" element={<ParentDisputes />} />
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
                <Route path="booking" element={<StudentBooking />} />
                <Route path="booking/:id" element={<BookingDetail />} />
                <Route path="booking/:id/payment" element={<PaymentPage />} />
                <Route path="calendar" element={<StudentLessons />} />
                <Route path="calendar/:lessonId" element={<StudentLessonDetail />} />
                <Route path="lessons" element={<LegacyStudentLessonsRedirect />} />
                <Route path="lessons/:lessonId" element={<LegacyStudentLessonsRedirect />} />
                {/* Ví CHỈ cho học sinh tự đăng ký — tài khoản do phụ huynh quản lý bị chặn (kể cả gõ URL).
                    Trang ví student riêng (copy UI parent) để tương lai tùy biến UI/UX/tính năng độc lập. */}
                <Route element={<StudentSelfRegisteredGate />}>
                  <Route path="wallet" element={<StudentWallet />} />
                  <Route path="wallet/transactions" element={<ParentWalletTransactions />} />
                  <Route path="wallet/withdrawals" element={<ParentWalletWithdrawals />} />
                  <Route path="disputes" element={<StudentDisputes />} />
                </Route>
                <Route path="messages" element={<ParentMessage />} />
                <Route path="profile" element={<StudentProfile />} />
                <Route path="account" element={<StudentAccount />} />
                <Route path="notifications" element={<NotificationsPage />} />
              </Route>
            </Route>

            {/* PayOS callback - loaded inside iframe after payment */}
            <Route path="/payment/success" element={<PaymentCallback />} />
            <Route path="/payment/cancel" element={<PaymentCallback />} />

            {/* Live video-call session — full-screen, không có portal chrome */}
            <Route
              path="/live-session/:classSessionId"
              element={
                <ProtectedRoute allowedRoles={['Tutor', 'Student']}>
                  <LiveSession />
                </ProtectedRoute>
              }
            />

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

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { isZaloMiniApp } from './services/zalo-env';
import { DeeplinkHandler } from './components/DeeplinkHandler/DeeplinkHandler';

// --- Static imports (layouts, infrastructure, always-needed components) ---
// Admin layout đã chuyển sang repo riêng `tutora-admin-frontend` (xem plan
// t-i-mu-n-t-ch-resource-shimmering-wren.md). User-facing repo chỉ giữ 3 portal.
import TutorPortalLayout from './layouts/TutorPortalLayout';
import ParentLayout from './layouts/ParentLayout';
import StudentLayout from './layouts/StudentLayout';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import SessionExpiredModal from './components/SessionExpiredModal';
import PageLoader from './components/PageLoader/PageLoader';
import { ErrorBoundary } from './components/shared';
import axios from 'axios';
import { getCurrentUser, isTokenExpired, updateTokens, clearUserFromStorage } from './services/auth.service';

const BACKEND_API = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';
import { ToastContainer, Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// TUTORA brand override — phải import SAU default CSS để cascade thắng.
import './styles/toastify.css';

// --- Lazy-loaded pages ---
// Public
const HomePage = lazy(() => import('./pages/Home/HomePage'));
const TutorSearchPage = lazy(() => import('./pages/TutorSearch/TutorSearchPage'));
const ParentBookingDemo = lazy(() => import('./pages/ParentBookingDemo'));
const LoginPage = lazy(() => import('./pages/Login/LoginPage'));
const RegisterPage = lazy(() => import('./pages/Register/RegisterPage'));
const ResetPasswordPage = lazy(() => import('./pages/Login/ResetPasswordPage'));

// Error pages
const NotFoundPage = lazy(() => import('./pages/Error/NotFoundPage'));
const UnauthorizedPage = lazy(() => import('./pages/Error/UnauthorizedPage'));
const ForbiddenPage = lazy(() => import('./pages/Error/ForbiddenPage'));

// Admin pages — moved to tutora-admin-frontend repo.

// Tutor Portal pages
const TutorOnboarding = lazy(() => import('./pages/TutorOnboarding'));
const TutorPortalProfile = lazy(() => import('./pages/TutorPortal/TutorPortalProfile'));
const TutorPortalDashboard = lazy(() => import('./pages/TutorPortal/TutorPortalDashboard'));
const TutorPortalSchedule = lazy(() => import('./pages/TutorPortal/TutorPortalSchedule'));
const TutorPortalMessages = lazy(() => import('./pages/TutorPortal/TutorPortalMessages'));
const TutorPortalClasses = lazy(() => import('./pages/TutorPortal/TutorPortalClasses'));
const TutorPortalClassDetail = lazy(() => import('./pages/TutorPortal/TutorPortalClassDetail'));
const TutorPortalStudentProfile = lazy(() => import('./pages/TutorPortal/TutorPortalStudentProfile'));
const TutorPortalBookings = lazy(() => import('./pages/TutorPortal/TutorPortalBookings'));
const TutorFinanceDashboardPage = lazy(() => import('./pages/TutorFinance/TutorFinanceDashboard/TutorFinanceDashboardPage'));
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
const ParentMessage = lazy(() => import('./pages/ParentMessage'));
const PaymentPage = lazy(() => import('./pages/ParentBooking/Payment'));
const ParentStudent = lazy(() => import('./pages/ParentStudent'));
const ParentLessons = lazy(() => import('./pages/ParentLessons'));
const ParentLessonDetail = lazy(() => import('./pages/ParentLessons/ParentLessonDetail'));
const ParentCalendar = lazy(() => import('./pages/ParentLessons/ParentCalendar'));
const ParentAccount = lazy(() => import('./pages/ParentAccount'));

// Student pages
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const StudentBooking = lazy(() => import('./pages/StudentBooking'));
const StudentLessons = lazy(() => import('./pages/StudentLessons'));
const StudentLessonDetail = lazy(() => import('./pages/StudentLessons/StudentLessonDetail'));
const StudentCalendar = lazy(() => import('./pages/StudentLessons/StudentCalendar'));
const StudentLinkAccount = lazy(() => import('./pages/StudentLinkAccount'));
const StudentAccount = lazy(() => import('./pages/StudentAccount'));

// Payment callback
const PaymentCallback = lazy(() => import('./pages/PaymentCallback/PaymentCallback'));
const NotificationsPage = lazy(() => import('./pages/Notifications/NotificationsPage'));

// ---------------------

const inMiniApp = isZaloMiniApp();

const FallbackRedirect = () => {
  useEffect(() => {
    if (window.location.port === '5173' || window.location.hostname === 'app.tutora.vn') {
      const nextDomain = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://tutora.vn';
      window.location.replace(`${nextDomain}${window.location.pathname}${window.location.search}`);
    } else {
      // Force full page navigation → Next.js SSR handles the route.
      // replace() tears down the current Vite SPA entirely.
      window.location.replace(window.location.pathname + window.location.search);
    }
  }, []);
  return <PageLoader />;
};

function App() {
  const location = useLocation();
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const isDemoRoute = location.pathname.startsWith('/demo/');

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
      <SessionExpiredModal
        isOpen={showSessionExpired}
        onClose={() => setShowSessionExpired(false)}
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
          <Route path="/demo/parent-booking" element={<ParentBookingDemo />} />
          <Route path="/demo/parent-booking/:tutorId" element={<ParentBookingDemo />} />
          <Route path="/demo/parent-booking/tutor/:tutorId" element={<ParentBookingDemo />} />
          <Route path="/tutor-detail" element={<Navigate to="/" replace />} />
          <Route path="/tutor-detail/:id" element={<FallbackRedirect />} />

          {/* Tutor Portal — không có trong Zalo Mini App */}
          {!inMiniApp && (
            <>
              {/* Tutor Portal - PROTECTED */}
              <Route path="/tutor-portal" element={
                <ProtectedRoute allowedRoles={["Tutor"]}>
                  <TutorPortalLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/tutor-portal/dashboard" replace />} />
                <Route path="onboarding" element={<TutorOnboarding />} />
                <Route path="dashboard" element={<TutorPortalDashboard />} />
                <Route path="profile" element={<TutorPortalProfile />} />
                <Route path="schedule" element={<TutorPortalSchedule />} />
                <Route path="messages" element={<TutorPortalMessages />} />
                <Route path="classes" element={<TutorPortalClasses />} />
                <Route path="classes/:classId" element={<TutorPortalClassDetail />} />
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
              <ProtectedRoute allowedRoles={["Parent"]}>
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
            <Route path="messages" element={<ParentMessage />} />
            <Route path="calendar" element={<ParentCalendar />} />
            <Route path="lessons" element={<ParentLessons />} />
            <Route path="lessons/:lessonId" element={<ParentLessonDetail />} />
            <Route path="account" element={<ParentAccount />} />
            <Route path="notifications" element={<NotificationsPage />} />
            {/* <Route path="disputes" element={<ParentDisputes />} /> */}
          </Route>

          {/* Student Layout - PROTECTED */}
          <Route
            path="/student-portal"
            element={
              <ProtectedRoute allowedRoles={["Student"]}>
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/student-portal/dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="booking" element={<StudentBooking />} />
            <Route path="booking/:id" element={<BookingDetail />} />
            <Route path="booking/:id/payment" element={<PaymentPage />} />
            <Route path="lessons" element={<StudentLessons />} />
            <Route path="lessons/:lessonId" element={<StudentLessonDetail />} />
            <Route path="calendar" element={<StudentCalendar />} />
            <Route path="messages" element={<ParentMessage />} />
            <Route path="link-account" element={<StudentLinkAccount />} />
            <Route path="account" element={<StudentAccount />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>

          {/* PayOS callback - loaded inside iframe after payment */}
          <Route path="/payment/success" element={<PaymentCallback />} />
          <Route path="/payment/cancel" element={<PaymentCallback />} />

          {/* Auth routes — không có trong Zalo Mini App (auth qua Zalo token) */}
          {!inMiniApp && (
            <>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
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
      </ErrorBoundary>
    </div>
  );
}

export default App;

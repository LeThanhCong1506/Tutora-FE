import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUserRole } from '../../services/auth.service';

type PortalRole = 'parent' | 'student' | 'tutor';

/**
 * Đích tới theo từng vai trò cho một "khu vực" chung — dùng cho nút CTA trong tin ZNS, nơi
 * người nhận cùng 1 template có thể là phụ huynh HOẶC học sinh tự quản lý (>=16, không có phụ
 * huynh) HOẶC gia sư, nên không thể gắn cứng 1 URL cổng cụ thể vào nút. Xem GoRedirect bên dưới.
 */
const TARGET_BY_ROLE: Record<string, Partial<Record<PortalRole, string>>> = {
  lessons: {
    parent: '/parent-portal/lessons',
    student: '/student-portal/calendar',
  },
  bookings: {
    parent: '/parent-portal/lessons',
    student: '/student-portal/calendar',
    tutor: '/tutor-portal/bookings',
  },
  payout: {
    tutor: '/tutor-portal/finance/withdrawals',
  },
  disputes: {
    parent: '/parent-portal/disputes',
    student: '/student-portal/disputes',
    tutor: '/tutor-portal/disputes',
  },
};

/**
 * Route trung gian cho nút thao tác (CTA) trong tin ZNS: /go/lessons, /go/bookings, /go/payout,
 * /go/disputes. Cùng 1 URL nút bấm dùng chung cho mọi người nhận của 1 template, nhưng đích thật
 * (parent-portal hay student-portal hay tutor-portal) phụ thuộc vai trò tài khoản ĐANG đăng nhập
 * trên máy bấm vào link — không đọc được từ tin nhắn. Trang này tự dò vai trò rồi điều hướng.
 *
 * Chưa đăng nhập: chuyển sang /login — sau khi đăng nhập xong sẽ về dashboard theo vai trò (mất
 * ngữ cảnh "khu vực" cụ thể, nhưng KHÔNG lỗi) vì cơ chế returnUrl hiện tại của LoginForm chỉ chấp
 * nhận origin khác (chặn same-origin để tránh open-redirect), không dùng lại được ở đây.
 */
const GoRedirect = () => {
  const { target } = useParams<{ target: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const role = getCurrentUserRole()?.toLowerCase() as PortalRole | undefined;
    if (!role) {
      navigate('/login', { replace: true });
      return;
    }
    const dest = target ? TARGET_BY_ROLE[target]?.[role] : undefined;
    navigate(dest ?? '/', { replace: true });
  }, [target, navigate]);

  return null;
};

export default GoRedirect;

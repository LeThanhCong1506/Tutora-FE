import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getCurrentUser, getUserInfoFromToken } from "../../services/auth.service";
import { toast } from "react-toastify";

interface ProtectedRouteProps {
    allowedRoles?: string[];
    children?: React.ReactNode;
}

/**
 * Map role -> dashboard path tương ứng
 */
const getDashboardByRole = (role: string): string => {
    switch (role.toLowerCase()) {
        case 'admin':
            return '/admin-portal/dashboard';
        case 'tutor':
            return '/tutor-portal/dashboard';
        case 'parent':
            return '/parent-portal/dashboard';
        case 'student':
            return '/student-portal/dashboard';
        default:
            return '/';
    }
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    allowedRoles,
    children,
}) => {
    const user = getCurrentUser();

    if (!user || !user.accessToken) {
        // Chưa đăng nhập -> toast + redirect login
        toast.info('Vui lòng đăng nhập để truy cập trang này.', { toastId: 'auth-required' });
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && allowedRoles.length > 0) {
        const userInfo = getUserInfoFromToken();
        const userRole = (userInfo?.role || '').toLowerCase();

        if (!allowedRoles.some(r => r.toLowerCase() === userRole)) {
            // Sai role -> toast + redirect về dashboard của role hiện tại
            toast.warning('Bạn không có quyền truy cập trang này.', { toastId: 'role-forbidden' });
            const redirectPath = getDashboardByRole(userRole);
            return <Navigate to={redirectPath} replace />;
        }
    }

    return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;


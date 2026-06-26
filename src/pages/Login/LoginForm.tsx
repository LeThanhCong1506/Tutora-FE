/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/Login/LoginForm.tsx — Dùng SimpleAuth API (không qua Supabase)
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import InputGroup from "../../components/InputGroup";
import ForgotPasswordModal from "../../components/ForgotPasswordModal";
import GoogleSignInButton from "../../components/GoogleSignInButton";
import axios from "axios";
import { saveUserToStorage, googleAuth } from "../../services/auth.service";

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';
const REMEMBERED_PHONE_KEY = 'TUTORA_remembered_phone';

// Chỉ giữ chữ số và dấu '+' đứng đầu (cho số dạng +84...).
const sanitizePhone = (raw: string) => raw.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');

const LoginForm: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ phone: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);

  // Load remembered phone on mount
  useEffect(() => {
    const savedPhone = localStorage.getItem(REMEMBERED_PHONE_KEY);
    if (savedPhone) {
      setFormData((prev) => ({ ...prev, phone: savedPhone }));
      setRememberMe(true);
    }
  }, []);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === "phone" ? sanitizePhone(value) : value }));
  };

  /**
   * Decode JWT payload to extract role (lowercase). Returns '' on decode error.
   */
  const getRoleFromToken = (token: string): string => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(
        decodeURIComponent(
          atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
        )
      );
      const roleClaim = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
      return (payload[roleClaim] || '').toLowerCase();
    } catch {
      return '';
    }
  };

  /**
   * Map role -> portal path cho 3 portal còn lại trong repo này.
   * Admin đã chuyển sang repo riêng `tutora-admin-frontend` — caller PHẢI xử lý
   * role='admin' riêng (toast + redirect external) trước khi gọi hàm này.
   */
  const getPortalPathFromRole = (role: string): string => {
    switch (role) {
      case 'tutor': return '/tutor-portal/dashboard';
      case 'parent': return '/parent-portal/dashboard';
      case 'student': return '/student-portal/dashboard';
      default: return '/';
    }
  };

  const ADMIN_PORTAL_URL = import.meta.env.VITE_ADMIN_PORTAL_URL || 'https://admin.tutora.vn';

  /**
   * Hoàn tất đăng nhập sau khi đã có JWT (dùng chung cho password & Google).
   * Admin có cổng riêng (tutora-admin-frontend) → KHÔNG save token, chỉ cảnh báo.
   * Trả về true nếu đăng nhập user-facing thành công.
   */
  const finishLogin = (token: string, refreshToken: string): boolean => {
    const role = getRoleFromToken(token);

    if (role === 'admin') {
      toast.warning(
        <div style={{ lineHeight: 1.5 }}>
          <strong style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
            Tài khoản quản trị
          </strong>
          <span style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
            Vui lòng dùng cổng quản trị riêng.
          </span>
          <a
            href={ADMIN_PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1a2238', fontWeight: 600, fontSize: 13, textDecoration: 'underline' }}
          >
            Đi tới Tutora Admin →
          </a>
        </div>,
        { autoClose: 10000, toastId: 'admin-wrong-portal' }
      );
      return false;
    }

    saveUserToStorage({ accessToken: token, refreshToken });
    toast.success("Đăng nhập thành công!");
    setTimeout(() => navigate(getPortalPathFromRole(role)), 800);
    return true;
  };

  /**
   * Callback khi GIS trả idToken. Gọi /auth/google:
   *  - Có sẵn tài khoản (SĐT đã xác thực) → BE trả { accessToken, refreshToken } → đăng nhập luôn.
   *  - Chưa hoàn tất → BE trả socialRegistrationToken → sang trang hoàn tất đăng ký (role + SĐT + OTP).
   */
  const handleGoogleCredential = async (idToken: string) => {
    try {
      setIsSubmitting(true);
      const data = await googleAuth(idToken);

      if (data?.accessToken) {
        finishLogin(data.accessToken, data.refreshToken);
        return;
      }

      if (data?.requiresPhoneInput || data?.requiresRoleSelection) {
        navigate('/auth/social-complete', {
          state: {
            socialRegistrationToken: data.socialRegistrationToken,
            email: data.email,
            phone: data.phone,
            requiresRoleSelection: data.requiresRoleSelection,
          },
        });
        return;
      }

      toast.error(data?.message || data?.errorMessage || "Đăng nhập Google thất bại.");
    } catch (error: any) {
      console.error("Google login error:", error);
      toast.error(error.response?.data?.message || "Đăng nhập Google thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.phone || !formData.password) {
      toast.warning("Vui lòng nhập đầy đủ số điện thoại và mật khẩu!");
      return;
    }

    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (phoneDigits.length < 9 || phoneDigits.length > 11) {
      toast.warning("Số điện thoại không hợp lệ!");
      return;
    }

    try {
      setIsSubmitting(true);

      // Call auth login API directly (no Supabase) — chỉ đăng nhập bằng số điện thoại
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        emailOrPhone: formData.phone,
        password: formData.password,
      });

      const data = response.data;
      const content = data.content;

      // BE chặn đăng nhập khi SĐT chưa xác thực → trả 200 kèm requiresPhoneVerification.
      // Đưa sang trang nhập OTP và tự gửi lại mã mới (OTP đăng ký có thể đã hết hạn).
      if (content?.requiresPhoneVerification) {
        const phone = content.phone || formData.phone;
        toast.info("Số điện thoại chưa được xác thực. Vui lòng nhập mã OTP để hoàn tất.");
        navigate(`/verify-phone?phone=${encodeURIComponent(phone)}`, {
          state: { autoResend: true },
        });
        return;
      }

      const token = content?.token;
      const refreshToken = content?.refreshToken;

      if (!token) {
        throw new Error("Không nhận được token từ server");
      }

      // Hoàn tất đăng nhập (admin được chặn bên trong finishLogin).
      const loggedIn = finishLogin(token, refreshToken);

      // Chỉ ghi nhớ SĐT khi đăng nhập user-facing thành công.
      if (loggedIn) {
        if (rememberMe) {
          localStorage.setItem(REMEMBERED_PHONE_KEY, formData.phone);
        } else {
          localStorage.removeItem(REMEMBERED_PHONE_KEY);
        }
      }
    } catch (error: any) {
      console.error("Login Error:", error);

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.content ||
        error.message ||
        "Đăng nhập thất bại";

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-form relative">
      {/* --- NỘI DUNG FORM CHÍNH --- */}
      <div className="login-form__header animate-fade-in-up">
        <h1 className="login-form__title">Chào mừng trở lại</h1>
        <p className="login-form__subtitle">
          Tiếp tục hành trình học thuật của bạn cùng TUTORA.
        </p>
      </div>

      <div className="login-form__body">
        <form onSubmit={handleSubmit} className="login-form__form">
          <div className="animate-fade-in-up delay-100">
            <InputGroup
              id="phone"
              name="phone"
              type="tel"
              label="Số điện thoại"
              placeholder="090..."
              icon="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="animate-fade-in-up delay-200">
            <InputGroup
              id="password"
              name="password"
              type="password"
              label="Mật khẩu"
              placeholder="••••••••"
              icon="lock"
              value={formData.password}
              onChange={handleChange}
              showPasswordToggle={true}
              disabled={isSubmitting}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', marginLeft: '5px' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                  style={{ width: '16px', height: '16px', accentColor: '#1a2238', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', color: '#555', fontWeight: 500 }}>Ghi nhớ đăng nhập</span>
              </label>
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                disabled={isSubmitting}
              >
                Quên mật khẩu?
              </button>
            </div>
          </div>

          <div className="login-form__submit animate-fade-in-up delay-300">
            <button
              type="submit"
              className="login-form__button"
              disabled={isSubmitting}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                opacity: isSubmitting ? 0.7 : 1,
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              {isSubmitting && (
                <svg
                  className="animate-spin"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
              {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </div>

          {/* Divider "hoặc" */}
          <div
            className="animate-fade-in-up delay-300"
            style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}
          >
            <span style={{ flex: 1, height: 1, background: 'rgba(26,34,56,0.12)' }} />
            <span style={{ fontSize: 12, color: 'rgba(26,34,56,0.45)', fontWeight: 500 }}>HOẶC</span>
            <span style={{ flex: 1, height: 1, background: 'rgba(26,34,56,0.12)' }} />
          </div>

          {/* Đăng nhập với Google (GIS trả idToken → /auth/google) */}
          <div className="animate-fade-in-up delay-300">
            <GoogleSignInButton onCredential={handleGoogleCredential} disabled={isSubmitting} />
          </div>

          <div className="login-form__register animate-fade-in-up delay-300">
            <p>
              Chưa có tài khoản?{" "}
              <a href="/register" className="login-form__register-link">
                Đăng ký ngay
              </a>
            </p>
          </div>
        </form>
      </div>
      <div className="login-form__accent"></div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </div>
  );
};

export default LoginForm;

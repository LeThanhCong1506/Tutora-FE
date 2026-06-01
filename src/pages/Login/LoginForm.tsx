/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/Login/LoginForm.tsx — Dùng SimpleAuth API (không qua Supabase)
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import InputGroup from "../../components/InputGroup";
import ForgotPasswordModal from "../../components/ForgotPasswordModal";
import axios from "axios";
import { saveUserToStorage } from "../../services/auth.service";

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';
const REMEMBERED_EMAIL_KEY = 'TUTORA_remembered_email';

const LoginForm: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (savedEmail) {
      setFormData((prev) => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Decode JWT payload to extract role-based portal path
   */
  const getPortalPathFromToken = (token: string): string => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(
        decodeURIComponent(
          atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
        )
      );
      const roleClaim = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
      const role = (payload[roleClaim] || '').toLowerCase();
      switch (role) {
        case 'admin': return '/admin-portal/dashboard';
        case 'tutor': return '/tutor-portal/dashboard';
        case 'parent': return '/parent-portal/dashboard';
        case 'student': return '/student-portal/dashboard';
        default: return '/';
      }
    } catch {
      return '/';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.warning("Vui lòng nhập đầy đủ email và mật khẩu!");
      return;
    }

    try {
      setIsSubmitting(true);

      // Call auth login API directly (no Supabase)
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        emailOrPhone: formData.email,
        password: formData.password,
      });

      const data = response.data;
      const token = data.content?.token;
      const refreshToken = data.content?.refreshToken;

      if (!token) {
        throw new Error("Không nhận được token từ server");
      }

      // Save or clear remembered email based on checkbox
      if (rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, formData.email);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      // Save user data with accessToken and refreshToken
      saveUserToStorage({ accessToken: token, refreshToken });

      // Get portal path from role in token
      const portalPath = getPortalPathFromToken(token);

      toast.success("Đăng nhập thành công!");
      setTimeout(() => {
        navigate(portalPath);
      }, 800);
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
              id="email"
              name="email"
              type="text"
              label="Email, SĐT hoặc Username"
              placeholder="name@example.com hoặc username"
              icon="mail"
              value={formData.email}
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

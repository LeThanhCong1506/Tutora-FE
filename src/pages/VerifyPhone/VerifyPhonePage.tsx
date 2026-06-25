/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/VerifyPhone/VerifyPhonePage.tsx
// Màn nhập OTP xác thực số điện thoại — dùng cho luồng đăng ký mới của BE
// (POST /auth/register trả requiresPhoneVerification + gửi OTP qua SMS) và
// cho luồng đăng nhập khi tài khoản chưa xác thực số điện thoại.
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import {
  verifyPhoneOtp,
  resendPhoneOtp,
  saveUserToStorage,
  getRoleFromToken,
} from "../../services/auth.service";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import styles from "../../styles/pages/reset-password.module.css";

const PhoneIcon = () => (
  <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const RESEND_COOLDOWN = 60; // giây

const portalPathFromRole = (role: string): string => {
  switch (role) {
    case "admin": return "/admin-portal/dashboard";
    case "tutor": return "/tutor-portal/dashboard";
    case "parent": return "/parent-portal/dashboard";
    case "student": return "/student-portal/dashboard";
    default: return "/";
  }
};

const VerifyPhonePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // SĐT cần xác thực: ưu tiên query (?phone=) để sống sót khi refresh, fallback state.
  const phone = useMemo(() => {
    const fromQuery = new URLSearchParams(location.search).get("phone");
    const fromState = (location.state as { phone?: string } | null)?.phone;
    return fromQuery || fromState || "";
  }, [location.search, location.state]);

  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Không có SĐT → quay lại đăng ký.
  useEffect(() => {
    if (!phone) {
      toast.warning("Thiếu thông tin số điện thoại cần xác thực. Vui lòng đăng ký lại.");
      navigate("/register", { replace: true });
    }
  }, [phone, navigate]);

  // Đếm ngược nút "Gửi lại mã".
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!phone || cooldown > 0 || isResending) return;
    try {
      setIsResending(true);
      await resendPhoneOtp(phone);
      toast.success("Đã gửi lại mã xác thực. Vui lòng kiểm tra tin nhắn SMS.");
      setCooldown(RESEND_COOLDOWN);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Không gửi lại được mã. Vui lòng thử lại.");
    } finally {
      setIsResending(false);
    }
  };

  // Tự gửi lại mã khi đến từ luồng đăng nhập (OTP đăng ký có thể đã hết hạn).
  useEffect(() => {
    const autoResend = (location.state as { autoResend?: boolean } | null)?.autoResend;
    if (phone && autoResend) {
      handleResend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.replace(/\D/g, "");
    if (code.length !== 6) {
      toast.warning("Vui lòng nhập đủ 6 chữ số mã OTP.");
      return;
    }

    try {
      setIsSubmitting(true);
      const data = await verifyPhoneOtp(phone, code);
      const token = data.content?.token;
      const refreshToken = data.content?.refreshToken;

      if (!token) {
        throw new Error("Không nhận được token từ server");
      }

      await saveUserToStorage({ accessToken: token, refreshToken });
      window.dispatchEvent(new Event("auth-change"));

      const role = (getRoleFromToken(token) || "").toLowerCase();
      toast.success("Xác thực số điện thoại thành công!");
      setTimeout(() => navigate(portalPathFromRole(role), { replace: true }), 1200);
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || "Xác thực thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!phone) return null;

  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.card}>
            <div className={styles.cardContent}>
              <div className={styles.iconCircle}>
                <PhoneIcon />
              </div>

              <h1 className={styles.title}>Xác thực số điện thoại</h1>
              <p className={styles.description}>
                Nhập mã OTP gồm 6 chữ số đã được gửi tới <strong>{phone}</strong>
              </p>

              <form onSubmit={handleSubmit}>
                <div className={styles.fieldGroupLast}>
                  <label htmlFor="otp" className={styles.label}>Mã xác thực (OTP)</label>
                  <div className={styles.inputWrapper}>
                    <input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="______"
                      className={styles.input}
                      style={{ paddingLeft: 16, letterSpacing: "0.5em", textAlign: "center", fontSize: 20, fontWeight: 700 }}
                    />
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className={styles.btnPrimary}>
                  {isSubmitting ? "Đang xác thực..." : "Xác nhận"}
                </button>

                <div style={{ textAlign: "center", marginTop: 12, marginBottom: 4 }}>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={cooldown > 0 || isResending}
                    className={styles.backLink}
                  >
                    {cooldown > 0
                      ? `Gửi lại mã sau ${cooldown}s`
                      : isResending
                        ? "Đang gửi..."
                        : "Gửi lại mã"}
                  </button>
                </div>

                <div style={{ textAlign: "center" }}>
                  <button type="button" onClick={() => navigate("/login")} className={styles.backLink}>
                    <ArrowLeftIcon /> Quay lại đăng nhập
                  </button>
                </div>
              </form>
            </div>

            <div className={styles.accentBar} />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default VerifyPhonePage;

// src/components/ForgotPasswordModal.tsx
import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { supabase } from "../lib/supabase";
import axios from "axios";
import styles from "../styles/components/forgot-password-modal.module.css";

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const COOLDOWN_SECONDS = 60;
const MAX_RESEND_ATTEMPTS = 3;

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
    isOpen,
    onClose,
}) => {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [resendCount, setResendCount] = useState(0);

    // Cooldown timer
    useEffect(() => {
        if (cooldown <= 0) return;

        const timer = setInterval(() => {
            setCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [cooldown]);

    const handleSubmit = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!email) {
            toast.warning("Vui lòng nhập email của bạn!");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error("Email không hợp lệ!");
            return;
        }

        if (cooldown > 0) {
            toast.info(`Vui lòng đợi ${cooldown} giây trước khi gửi lại.`);
            return;
        }

        if (resendCount >= MAX_RESEND_ATTEMPTS) {
            toast.warning("Bạn đã vượt quá số lần gửi cho phép. Vui lòng thử lại sau.");
            return;
        }

        try {
            setIsLoading(true);

            // Step 1: Check if email exists in the system
            try {
                await axios.get(`${API_BASE_URL}/users/by-email/${encodeURIComponent(email)}`);
            } catch (checkError: any) {
                if (checkError?.response?.status === 404 || checkError?.response?.status === 500) {
                    toast.error("Email này chưa được đăng ký trong hệ thống. Vui lòng kiểm tra lại.");
                    return;
                }
                // For other errors (network, etc.), proceed anyway to avoid blocking user
            }

            // Step 2: Send reset password email via Supabase
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            setEmailSent(true);
            setResendCount((prev) => prev + 1);
            setCooldown(COOLDOWN_SECONDS);
            toast.success("Email đặt lại mật khẩu đã được gửi!");
        } catch (error: any) {
            console.error("Forgot password error:", error);

            if (error?.code === "over_email_send_rate_limit") {
                toast.error(
                    "Hệ thống đang gửi quá nhiều email. Vui lòng đợi vài phút rồi thử lại."
                );
                setCooldown(COOLDOWN_SECONDS * 2); // Longer cooldown on rate limit
            } else {
                toast.error(error.message || "Có lỗi xảy ra. Vui lòng thử lại.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [email, cooldown, resendCount]);

    const handleClose = () => {
        setEmail("");
        setEmailSent(false);
        onClose();
    };

    const handleResend = () => {
        if (cooldown > 0 || resendCount >= MAX_RESEND_ATTEMPTS) return;
        setEmailSent(false);
        // Trigger submit again after re-rendering
        setTimeout(() => {
            handleSubmit();
        }, 0);
    };

    const isResendDisabled = cooldown > 0 || resendCount >= MAX_RESEND_ATTEMPTS || isLoading;

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            {/* Backdrop */}
            <div className={styles.backdrop} onClick={handleClose} />

            {/* Modal */}
            <div className={styles.modal}>
                {/* Close button */}
                <button onClick={handleClose} className={styles.closeBtn}>
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Content */}
                <div className={styles.content}>
                    {!emailSent ? (
                        <div>
                            {/* Icon */}
                            <div className={styles.iconCircleBurgundy}>
                                <svg width="28" height="28" fill="none" stroke="#631b1b" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                            </div>

                            {/* Title & Description */}
                            <h2 className={styles.title}>Quên mật khẩu?</h2>
                            <p className={styles.description}>
                                Nhập email của bạn và chúng tôi sẽ gửi link đặt lại mật khẩu
                            </p>

                            {/* Form */}
                            <form onSubmit={handleSubmit}>
                                <div style={{ marginBottom: "24px" }}>
                                    <label htmlFor="forgot-email" className={styles.label}>Email</label>
                                    <div className={styles.inputWrapper}>
                                        <div className={styles.inputIcon}>
                                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <input
                                            id="forgot-email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="name@example.com"
                                            className={styles.input}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || cooldown > 0}
                                    className={styles.btnPrimary}
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className={styles.spinner} width="20" height="20" fill="none" viewBox="0 0 24 24">
                                                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path style={{ opacity: 0.75 }} fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Đang gửi...
                                        </>
                                    ) : cooldown > 0 ? (
                                        `Gửi lại sau ${cooldown}s`
                                    ) : (
                                        "Gửi link đặt lại mật khẩu"
                                    )}
                                </button>
                            </form>
                        </div>
                    ) : (
                        // Success state
                        <div style={{ textAlign: "center" }}>
                            <div className={styles.iconCircleGreen}>
                                <svg width="28" height="28" fill="none" stroke="#ffffff" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                                </svg>
                            </div>

                            <h3 className={styles.title}>Kiểm tra email của bạn!</h3>
                            <p className={styles.description}>
                                Chúng tôi đã gửi link đặt lại mật khẩu đến{" "}
                                <span className={styles.emailHighlight}>{email}</span>
                            </p>

                            <div className={styles.alertBox}>
                                <p className={styles.alertText}>
                                    Nếu bạn không thấy email, vui lòng kiểm tra trong thư mục spam.
                                </p>
                            </div>

                            <a
                                href="https://mail.google.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.btnPrimary}
                                style={{ marginBottom: "12px" }}
                            >
                                Mở Gmail
                            </a>

                            <button onClick={handleClose} className={styles.btnOutline}>
                                Đóng
                            </button>

                            {resendCount >= MAX_RESEND_ATTEMPTS ? (
                                <p className={styles.cooldownText}>
                                    Bạn đã gửi tối đa {MAX_RESEND_ATTEMPTS} lần. Vui lòng kiểm tra email hoặc thử lại sau.
                                </p>
                            ) : (
                                <button
                                    onClick={handleResend}
                                    disabled={isResendDisabled}
                                    className={`${styles.btnLink} ${isResendDisabled ? styles.btnLinkDisabled : ""}`}
                                >
                                    {cooldown > 0
                                        ? `Gửi lại sau ${cooldown}s`
                                        : "Không nhận được email? Gửi lại"}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Decorative Accent Bar */}
                <div className={styles.accentBar} />
            </div>
        </div>
    );
};

export default ForgotPasswordModal;

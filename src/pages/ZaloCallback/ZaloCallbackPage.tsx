/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/ZaloCallback/ZaloCallbackPage.tsx
// Trang Zalo redirect về (FRONTEND_CALLBACK_URL) sau khi user cấp quyền.
// Luồng:
//   1. Lấy `code` + `state` từ query, lấy `codeVerifier` đã lưu theo `state`.
//   2. POST /auth/zalo (qua exchangeZaloCode) — `code` chỉ dùng 1 lần.
//   3a. BE trả token  → lưu + điều hướng vào portal theo role.
//   3b. BE yêu cầu hoàn tất đăng ký → sang /auth/social-complete (chọn role + SĐT + OTP).
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  consumeZaloCodeVerifier,
  exchangeZaloCode,
  getZaloRedirectUri,
} from "../../services/zalo-oauth.service";
import { saveUserToStorage, getRoleFromToken } from "../../services/auth.service";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import styles from "../../styles/pages/reset-password.module.css";

const ADMIN_PORTAL_URL = import.meta.env.VITE_ADMIN_PORTAL_URL || "https://cms.tutora.vn";

// Admin có cổng riêng (repo tutora-admin-frontend) — 3 portal còn lại nằm trong repo này.
const portalPathFromRole = (role: string): string => {
  switch (role) {
    case "tutor":
      return "/tutor-portal/dashboard";
    case "parent":
      return "/parent-portal/dashboard";
    case "student":
      return "/student-portal/dashboard";
    default:
      return "/";
  }
};

const ZaloCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorMsg, setErrorMsg] = useState("");
  // Chống double-exchange do StrictMode chạy effect 2 lần (code Zalo dùng 1 lần).
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const fail = (message: string) => {
      setErrorMsg(message);
      toast.error(message);
    };

    const run = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state") || "";
      // Zalo có thể trả lỗi khi user từ chối cấp quyền.
      const zaloError = searchParams.get("error") || searchParams.get("error_reason");

      if (zaloError) {
        fail("Bạn đã hủy đăng nhập Zalo hoặc chưa cấp quyền. Vui lòng thử lại.");
        return;
      }
      if (!code || !state) {
        fail("Thiếu thông tin xác thực từ Zalo. Vui lòng thử lại.");
        return;
      }

      // Lấy & xoá codeVerifier theo state (đồng thời kiểm tra state hợp lệ — chống CSRF).
      const codeVerifier = consumeZaloCodeVerifier(state);
      if (!codeVerifier) {
        fail("Phiên đăng nhập Zalo không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.");
        return;
      }

      try {
        const data = await exchangeZaloCode(code, codeVerifier, getZaloRedirectUri());

        // Nhánh đăng nhập: BE trả { content: { token, refreshToken } }.
        const token = data?.content?.token ?? (data as any)?.accessToken;
        const refreshToken = data?.content?.refreshToken ?? (data as any)?.refreshToken;

        if (token) {
          const role = (getRoleFromToken(token) || "").toLowerCase();
          if (role === "admin") {
            fail("Tài khoản quản trị vui lòng dùng cổng quản trị riêng.");
            setTimeout(() => {
              window.location.href = ADMIN_PORTAL_URL;
            }, 1500);
            return;
          }

          await saveUserToStorage({ accessToken: token, refreshToken });
          window.dispatchEvent(new Event("auth-change"));
          toast.success("Đăng nhập Zalo thành công!");
          setTimeout(() => navigate(portalPathFromRole(role), { replace: true }), 800);
          return;
        }

        // Nhánh hoàn tất đăng ký: BE trả socialRegistrationToken (không bọc content).
        const socialRegistrationToken =
          data?.socialRegistrationToken ?? (data as any)?.content?.socialRegistrationToken;

        if (socialRegistrationToken) {
          navigate("/auth/social-complete", {
            replace: true,
            state: {
              socialRegistrationToken,
              email: data?.email ?? (data as any)?.content?.email,
              phone: data?.phone ?? (data as any)?.content?.phone,
              // TẠM GỠ — mặc định false chỉ an toàn khi BE hỏi lại vai trò ở bước sau.
              //  // Mặc định FALSE. Trước đây mặc định true, nghĩa là mọi phản hồi thiếu trường này
              //  // đều bắt người dùng chọn vai trò — kể cả người đã có tài khoản. Người mới thật sự
              //  // vẫn được hỏi, chỉ là ở bước sau, khi SĐT đã xác nhận họ là người mới.
              //  requiresRoleSelection:
              //    data?.requiresRoleSelection ?? (data as any)?.content?.requiresRoleSelection ?? false,
              requiresRoleSelection:
                data?.requiresRoleSelection ?? (data as any)?.content?.requiresRoleSelection ?? true,
            },
          });
          return;
        }

        fail(data?.message || "Đăng nhập Zalo thất bại. Vui lòng thử lại.");
      } catch (error: any) {
        fail(error.response?.data?.message || "Đăng nhập Zalo thất bại. Vui lòng thử lại.");
      }
    };

    run();
  }, [searchParams, navigate]);

  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.card}>
            <div className={styles.cardContent}>
              {errorMsg ? (
                <>
                  <h1 className={styles.title}>Đăng nhập Zalo thất bại</h1>
                  <p className={styles.description}>{errorMsg}</p>
                  <button
                    type="button"
                    onClick={() => navigate("/login", { replace: true })}
                    className={styles.btnPrimary}
                  >
                    Quay lại đăng nhập
                  </button>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <svg
                    className="animate-spin"
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{ margin: "0 auto 16px", display: "block", color: "#0068ff" }}
                  >
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <h1 className={styles.title}>Đang xử lý đăng nhập Zalo</h1>
                  <p className={styles.description}>Vui lòng đợi trong giây lát...</p>
                </div>
              )}
            </div>

            <div className={styles.accentBar} />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ZaloCallbackPage;

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from "react";
import "../styles/components/google-signin-button.css";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "267458190455-83ihoq4vf0n85o6srh6bua3p9dmckibk.apps.googleusercontent.com";

const GSI_SRC = "https://accounts.google.com/gsi/client";

let gsiPromise: Promise<void> | null = null;
const loadGsi = (): Promise<void> => {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as any).google?.accounts?.id) return Promise.resolve();
  if (gsiPromise) return gsiPromise;

  gsiPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("GSI load failed")));
      return;
    }

    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("GSI load failed"));
    document.head.appendChild(script);
  });

  return gsiPromise;
};

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ onCredential, disabled }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let renderTimer: number | null = null;

    loadGsi()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const google = (window as any).google;

        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          ux_mode: "popup",
          callback: (resp: any) => {
            if (resp?.credential) onCredentialRef.current(resp.credential);
          },
        });

        const renderButton = () => {
          if (cancelled || !containerRef.current) return;
          containerRef.current.innerHTML = "";
          const width = Math.round(containerRef.current.getBoundingClientRect().width || 360);

          google.accounts.id.renderButton(containerRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            logo_alignment: "left",
            locale: "vi",
            width: Math.min(Math.max(width, 160), 400),
          });

          setIsReady(true);
          setHasError(false);
        };

        renderButton();

        if ("ResizeObserver" in window && containerRef.current) {
          let lastWidth = Math.round(containerRef.current.getBoundingClientRect().width);
          resizeObserver = new ResizeObserver(([entry]) => {
            const nextWidth = Math.round(entry.contentRect.width);
            if (Math.abs(nextWidth - lastWidth) < 4) return;

            lastWidth = nextWidth;
            if (renderTimer) window.clearTimeout(renderTimer);
            renderTimer = window.setTimeout(renderButton, 120);
          });
          resizeObserver.observe(containerRef.current);
        }
      })
      .catch(() => {
        setHasError(true);
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (renderTimer) window.clearTimeout(renderTimer);
    };
  }, []);

  const isUnavailable = disabled || !isReady || hasError;
  const label = hasError
    ? "Không tải được Google"
    : isReady
      ? "Tiếp tục với Google"
      : "Đang tải Google...";

  return (
    <div
      className={[
        "google-signin-button",
        disabled ? "google-signin-button--disabled" : "",
        !isReady && !hasError ? "google-signin-button--loading" : "",
        hasError ? "google-signin-button--error" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-busy={!isReady && !hasError}
      aria-disabled={isUnavailable}
    >
      <div className="google-signin-button__visual" aria-hidden="true">
        <span className="google-signin-button__icon">
          <svg viewBox="0 0 24 24" role="presentation" focusable="false">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.37c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.37 12 5.37z"
            />
          </svg>
        </span>
        <span className="google-signin-button__label">{label}</span>
        <span className="google-signin-button__chevron" />
      </div>
      <div ref={containerRef} className="google-signin-button__native" aria-hidden={isUnavailable} />
    </div>
  );
};

export default GoogleSignInButton;

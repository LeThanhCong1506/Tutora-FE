import React, { useEffect, type ReactNode } from "react";
import Header from "../Header";
import Footer from "../Footer";
import "./AuthLayout.css";

type AuthLayoutVariant = "login" | "register";

interface AuthLayoutProps {
  variant: AuthLayoutVariant;
  hero: ReactNode;
  form: ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ variant, hero, form }) => {
  const pageClassName = `${variant}-page`;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [variant]);

  return (
    <div className={`auth-page ${pageClassName}`}>
      <Header />

      <main className={`auth-page__main ${pageClassName}__main`}>
        <div className={`auth-page__bg-decoration ${pageClassName}__bg-decoration`}>
          <div className={`auth-page__blob ${pageClassName}__blob ${pageClassName}__blob--gold`}></div>
          <div className={`auth-page__blob ${pageClassName}__blob ${pageClassName}__blob--green`}></div>
        </div>

        <div className={`auth-page__content ${pageClassName}__content`}>
          <div className={`auth-page__hero ${pageClassName}__hero`}>{hero}</div>
          <div className={`auth-page__form-wrapper ${pageClassName}__form-wrapper`}>{form}</div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AuthLayout;

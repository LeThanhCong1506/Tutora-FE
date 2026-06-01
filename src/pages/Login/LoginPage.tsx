import React from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import LoginForm from "./LoginForm";
import "../../styles/pages/login.css";
import HeroSection from "./HeroSection";

const LoginPage: React.FC = () => {
  return (
    <div className="login-page">
      <Header />

      <main className="login-page__main">
        {/* Background decorative elements */}
        <div className="login-page__bg-decoration">
          <div className="login-page__blob login-page__blob--gold"></div>
          <div className="login-page__blob login-page__blob--green"></div>
        </div>

        {/* Content Grid */}
        <div className="login-page__content">
          {/* Hero Section - Desktop Only */}
          <div className="login-page__hero">
            <HeroSection />
          </div>

          {/* Login Form */}
          <div className="login-page__form-wrapper">
            <LoginForm />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LoginPage;

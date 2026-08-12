import React from "react";
import AuthLayout from "../../components/AuthLayout";
import LoginForm from "./LoginForm";
import "../../styles/pages/login.css";
import HeroSection from "./HeroSection";

const LoginPage: React.FC = () => {
  return <AuthLayout variant="login" hero={<HeroSection />} form={<LoginForm />} />;
};

export default LoginPage;

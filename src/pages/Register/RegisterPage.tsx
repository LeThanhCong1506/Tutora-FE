import React from 'react';
import AuthLayout from '../../components/AuthLayout';
import HeroSection from './HeroSection';
import RegisterForm from './RegisterForm';
import '../../styles/pages/register.css';

const RegisterPage: React.FC = () => {
    return <AuthLayout variant="register" hero={<HeroSection />} form={<RegisterForm />} />;
};

export default RegisterPage;

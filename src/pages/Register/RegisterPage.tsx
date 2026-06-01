import React from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import HeroSection from './HeroSection';
import RegisterForm from './RegisterForm';
import '../../styles/pages/register.css';

const RegisterPage: React.FC = () => {
    return (
        <div className="register-page">
            <Header />

            <main className="register-page__main">
                {/* Background decorative elements */}
                <div className="register-page__bg-decoration">
                    <div className="register-page__blob register-page__blob--gold"></div>
                    <div className="register-page__blob register-page__blob--green"></div>
                </div>

                {/* Content Grid */}
                <div className="register-page__content">
                    {/* Hero Section - Desktop Only */}
                    <div className="register-page__hero">
                        <HeroSection />
                    </div>

                    {/* Register Form */}
                    <div className="register-page__form-wrapper">
                        <RegisterForm />
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default RegisterPage;

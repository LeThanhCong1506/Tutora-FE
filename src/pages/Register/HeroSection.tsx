import React from 'react';

const HeroSection: React.FC = () => {
    return (
        <div className="register-hero">
            <div className="register-hero__content">
                {/* Badge */}
                <span className="register-hero__badge">
                    Top 5% Verified Tutors
                </span>

                {/* Main Headline */}
                <h1 className="register-hero__title">
                    Kiến tạo <span className="register-hero__title-accent">di sản</span>
                    <br />học thuật cho
                    <br />chính bạn.
                </h1>
            </div>

            {/* Trust Indicators */}
            <div className="register-hero__trust">
                <div className="register-hero__avatars">
                    <img
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
                        alt="User 1"
                        className="register-hero__avatar"
                    />
                    <img
                        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
                        alt="User 2"
                        className="register-hero__avatar"
                    />
                    <img
                        src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face"
                        alt="User 3"
                        className="register-hero__avatar"
                    />
                </div>
                <div className="register-hero__trust-text">
                    Được tin tưởng bởi <span className="register-hero__trust-count">12,000+</span> học viên
                </div>
            </div>
        </div>
    );
};

export default HeroSection;

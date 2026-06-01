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

                {/* Description */}
                <p className="register-hero__description">
                    Gia nhập cộng đồng tinh hoa. Kết nối với những bộ óc xuất sắc nhất
                    để xây dựng một lộ trình tương lai vững chắc.
                </p>
            </div>

            {/* Stats Section */}
            <div className="register-hero__stats-section">
                <div className="register-hero__stats-grid">
                    <div className="register-hero__stat">
                        <div className="register-hero__stat-value">500+</div>
                        <div className="register-hero__stat-label">Gia sư Elite</div>
                    </div>
                    <div className="register-hero__stat">
                        <div className="register-hero__stat-value">98%</div>
                        <div className="register-hero__stat-label">Tỉ lệ đạt mục tiêu</div>
                    </div>
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
        </div>
    );
};

export default HeroSection;

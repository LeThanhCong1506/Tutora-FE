import React from 'react';

const HeroSection: React.FC = () => {
    return (
        <div className="login-hero">
            <div className="login-hero__content">
                {/* Badge */}
                <span className="login-hero__badge">
                    Chào mừng trở lại
                </span>

                {/* Main Headline */}
                <h1 className="login-hero__title">
                    Tiếp tục <span className="login-hero__title-accent">di sản</span>
                    <br />học thuật của
                    <br />riêng bạn.
                </h1>

                {/* Description */}
                <p className="login-hero__description">
                    Truy cập hệ thống quản lý học tập cá nhân hóa. Kết nối lại với cố vấn
                    và theo dõi tiến độ phát triển của bạn.
                </p>
            </div>

            {/* Stats Section */}
            <div className="login-hero__stats-section">
                <div className="login-hero__stats-grid">
                    <div className="login-hero__stat">
                        <div className="login-hero__stat-value">12k+</div>
                        <div className="login-hero__stat-label">Học viên tích cực</div>
                    </div>
                    <div className="login-hero__stat">
                        <div className="login-hero__stat-value">4.9/5</div>
                        <div className="login-hero__stat-label">Đánh giá trung bình</div>
                    </div>
                </div>

                {/* Trust Indicators */}
                <div className="login-hero__trust">
                    <div className="login-hero__avatars">
                        <img
                            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face"
                            alt="User 1"
                            className="login-hero__avatar"
                        />
                        <img
                            src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face"
                            alt="User 2"
                            className="login-hero__avatar"
                        />
                        <img
                            src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face"
                            alt="User 3"
                            className="login-hero__avatar"
                        />
                    </div>
                    <div className="login-hero__trust-text">
                        Cùng phát triển với <span className="login-hero__trust-count">TUTORA Community</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeroSection;

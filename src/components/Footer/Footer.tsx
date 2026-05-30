import "./Footer.css";

const Footer = () => {
    const footerLinks = {
        academic: [
            "Tìm gia sư",
            "Đăng ký dạy kèm",
            "Cách hoạt động",
            "Môn học hỗ trợ",
        ],
        platform: [
            "Theo dõi học tập",
            "Báo cáo tiến độ",
            "Lộ trình cá nhân",
            "Hỗ trợ phụ huynh",
        ],
        resources: [
            "Về chúng tôi",
            "Trở thành Gia sư",
            "Liên hệ hỗ trợ",
            "Câu hỏi thường gặp",
        ],
    };

    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-main">
                    {/* Brand Column */}
                    <div className="footer-brand">
                        <div className="footer-logo">
                            <div className="footer-logo-icon">
                                <img src="/tutora-logo.png" alt="Tutora" width="38" height="38" />
                            </div>
                            <span className="footer-logo-text">TUTORA.</span>
                        </div>
                        <p className="footer-tagline">
                            "Kết nối phụ huynh với gia sư uy tín. Minh bạch — Bảo đảm — Tiện lợi."
                        </p>
                    </div>

                    {/* Links Columns */}
                    <div className="footer-links-column">
                        <h4 className="footer-links-title">HỌC THUẬT</h4>
                        <ul className="footer-links">
                            {footerLinks.academic.map((link, index) => (
                                <li key={index}><a href="#">{link}</a></li>
                            ))}
                        </ul>
                    </div>

                    <div className="footer-links-column">
                        <h4 className="footer-links-title">NỀN TẢNG</h4>
                        <ul className="footer-links">
                            {footerLinks.platform.map((link, index) => (
                                <li key={index}><a href="#">{link}</a></li>
                            ))}
                        </ul>
                    </div>

                    <div className="footer-links-column">
                        <h4 className="footer-links-title">TÀI NGUYÊN</h4>
                        <ul className="footer-links">
                            {footerLinks.resources.map((link, index) => (
                                <li key={index}><a href="#">{link}</a></li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Footer Bottom */}
                <div className="footer-bottom">
                    <span className="copyright">© 2026 Tutora. All Rights Reserved.</span>
                    <div className="footer-legal">
                        <a href="#">Chính sách bảo mật</a>
                        <a href="#">Điều khoản sử dụng</a>
                        <a href="#">Quy chế hoạt động</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

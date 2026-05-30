import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Header.css";
import { clearUserFromStorage, getCurrentUser, getUserInfoFromToken } from "../../services/auth.service";
import { Popconfirm } from "antd";
import { LogOut, LayoutDashboard } from "lucide-react";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState<string>("User");

  // Determine portal path based on role
  const getPortalPath = () => {
    const userInfo = getUserInfoFromToken();
    if (!userInfo?.role) return "/login";

    switch (userInfo.role.toLowerCase()) {
      case 'admin': return "/admin-portal/dashboard";
      case 'tutor': return "/tutor-portal";
      case 'parent': return "/parent-portal/dashboard";
      case 'student': return "/student-portal/dashboard";
      default: return "/";
    }
  };

  const portalPath = getPortalPath();

  // Ẩn user info trên trang đăng ký/đăng nhập
  const isAuthPage = location.pathname === "/register" || location.pathname === "/login";

  useEffect(() => {
    // Check if user is logged in from localStorage
    const user = getCurrentUser();
    if (user && user.accessToken) {
      setIsLoggedIn(true);

      const userInfo = getUserInfoFromToken();
      const displayName = userInfo?.fullname ||
        (userInfo?.firstName && userInfo?.lastName ? `${userInfo.firstName} ${userInfo.lastName}` : null) ||
        userInfo?.email?.split('@')[0] ||
        "User";
      setUserDisplayName(displayName);
    } else {
      setIsLoggedIn(false);
    }
  }, [location.pathname]); // Re-check on navigation

  const confirmLogout = () => {
    clearUserFromStorage();
    setIsLoggedIn(false);
    setIsLoggedIn(false);
    setIsMenuOpen(false);
    navigate("/login");
  };
  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo-link">
          <div className="logo-icon">
            <img src="/tutora-logo.png" alt="Tutora" width="38" height="38" />
          </div>
          <div className="logo-text">
            <span className="logo-name">TUTORA</span>
            <span className="logo-tagline">Nền tảng gia sư K-12</span>
          </div>
        </Link>
        <nav className="main-nav">
          <Link to="/tutor-search" className="nav-link">
            TÌM GIA SƯ
          </Link>
          <a href="/#learning-path" className="nav-link">
            LỘ TRÌNH HỌC
          </a>
          <a href="/#lms" className="nav-link">
            THEO DÕI HỌC TẬP
          </a>
          <a href="/#about" className="nav-link">
            VỀ CHÚNG TÔI
          </a>
        </nav>

        {/* Auth Buttons - Xử lý điều kiện hiển thị */}
        <div className="auth-buttons">
          {isLoggedIn && !isAuthPage ? (
            // --- GIAO DIỆN TỐI GIẢN KHI ĐÃ ĐĂNG NHẬP ---
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {/* Nút Portal tương ứng theo Role - Icon version */}
              <Link
                to={portalPath}
                className="btn-portal-icon"
                style={{
                  color: "var(--color-navy)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "8px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  transition: "background 0.2s ease",
                }}
                title="Go to Portal"
              >
                <LayoutDashboard size={20} />
              </Link>

              {/* Nút Đăng xuất - Icon version */}
              <Popconfirm
                title="Đăng xuất"
                description="Bạn có chắc chắn muốn đăng xuất?"
                onConfirm={confirmLogout}
                okText="Đồng ý"
                cancelText="Hủy"
                placement="bottomRight"
              >
                <button
                  className="btn-logout-icon"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "8px",
                    borderRadius: "50%",
                    cursor: "pointer",
                    transition: "background 0.2s ease",
                  }}
                  title="Đăng xuất"
                >
                  <LogOut size={20} />
                </button>
              </Popconfirm>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-login">
                LOG IN
              </Link>
              <Link to="/register" className="btn-signup">
                SIGN UP
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="mobile-menu">
          <nav className="mobile-nav">
            <Link
              to="/tutor-search"
              className="mobile-nav-link"
              onClick={() => setIsMenuOpen(false)}
            >
              TÌM GIA SƯ
            </Link>
            <a
              href="/#learning-path"
              className="mobile-nav-link"
              onClick={() => setIsMenuOpen(false)}
            >
              LỘ TRÌNH HỌC
            </a>
            <a
              href="/#lms"
              className="mobile-nav-link"
              onClick={() => setIsMenuOpen(false)}
            >
              THEO DÕI HỌC TẬP
            </a>
            <a
              href="/#about"
              className="mobile-nav-link"
              onClick={() => setIsMenuOpen(false)}
            >
              VỀ CHÚNG TÔI
            </a>
          </nav>

          {/* Mobile Auth Section */}
          <div className="mobile-auth">
            {isLoggedIn && !isAuthPage ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "1rem",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: '2px solid #d4b483',
                      background: '#631b1b',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    {userDisplayName.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600 }}>
                    {userDisplayName}
                  </span>
                </div>

                <Link
                  to={portalPath}
                  className="btn-signup"
                  style={{ width: "100%", textAlign: "center" }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  TRANG CÁ NHÂN
                </Link>

                <Popconfirm
                  title="Đăng xuất"
                  description="Bạn có muốn đăng xuất không?"
                  onConfirm={confirmLogout}
                  okText="Có"
                  cancelText="Không"
                >
                  <button
                    className="btn-login"
                    style={{
                      width: "100%",
                      border: "1px solid #ef4444",
                      color: "#ef4444",
                      cursor: "pointer",
                    }}
                  >
                    LOG OUT
                  </button>
                </Popconfirm>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn-login"
                  onClick={() => setIsMenuOpen(false)}
                >
                  LOG IN
                </Link>
                <Link
                  to="/register"
                  className="btn-signup"
                  onClick={() => setIsMenuOpen(false)}
                >
                  SIGN UP
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;

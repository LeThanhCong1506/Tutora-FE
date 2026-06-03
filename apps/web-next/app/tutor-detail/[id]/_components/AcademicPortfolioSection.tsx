import type { CertificateInfo } from '@/services/tutorDetail.types';
import { CertificateIcon, CheckIcon } from './icons';

/** Server Component. */
export default function AcademicPortfolioSection({
  certificates,
}: {
  certificates: CertificateInfo[] | null;
}) {
  return (
    <section className="portfolio-section">
      <div className="portfolio-header">
        <div className="portfolio-title-group">
          <h2 className="section-title">Hồ sơ năng lực học thuật</h2>
          <span className="portfolio-subtitle">Hệ thống TUTORA Academic Ledger v2.4</span>
        </div>
        <div className="verified-badge-green">
          <b>Xác thực 100%</b>
        </div>
      </div>

      <div className="portfolio-content">
        <div className="portfolio-category">
          <div className="category-header">
            <div className="category-indicator gold"></div>
            <span className="category-title">Văn bằng &amp; Chứng chỉ</span>
            <div className="category-divider"></div>
          </div>
          <div className="certificates-grid">
            {certificates && certificates.length > 0 ? (
              certificates.map((cert, index) => (
                <div key={index} className="certificate-card">
                  <div className="certificate-icon">
                    <CertificateIcon />
                  </div>
                  <div className="certificate-info">
                    <div className="certificate-title-row">
                      <b className="certificate-title">{cert.certificateName}</b>
                      {cert.verificationStatus === 'verified' && (
                        <div className="verified-check">
                          <CheckIcon />
                        </div>
                      )}
                    </div>
                    <span className="certificate-institution">{cert.issuingOrganization}</span>
                    {cert.yearIssued && (
                      <b className="certificate-score">Năm {cert.yearIssued}</b>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-message">Chưa có chứng chỉ được cập nhật.</p>
            )}
          </div>
        </div>

        <div className="portfolio-footer">
          <div className="portfolio-note">
            <div className="note-dot green"></div>
            <b>Hồ sơ gốc lưu trữ bởi TUTORA</b>
          </div>
          <div className="portfolio-note">
            <div className="note-dot green"></div>
            <b>Đã kiểm tra chéo (Cross-checked)</b>
          </div>
        </div>
      </div>
    </section>
  );
}

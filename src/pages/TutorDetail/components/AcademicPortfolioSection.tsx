import { useEffect, useState } from 'react';
import type { CertificateInfo } from '../../../services/tutorDetail.service';
import { getCertificateImageUrl } from '../../../utils/certificateImage';
import { CertificateIcon, CheckIcon } from './icons';

interface CertificatePreview {
    name: string;
    imageUrl: string;
}

const CertificateThumbnail = ({
    url,
    thumbnailUrl,
    name,
    onPreview,
}: {
    url?: string | null;
    thumbnailUrl?: string | null;
    name: string;
    onPreview: (preview: CertificatePreview) => void;
}) => {
    const [failed, setFailed] = useState(false);
    const thumbUrl = getCertificateImageUrl(url, false, thumbnailUrl);
    const fullUrl = getCertificateImageUrl(url, true, thumbnailUrl);

    if (!thumbUrl || failed) {
        return (
            <div className="certificate-icon">
                <CertificateIcon />
            </div>
        );
    }

    return (
        <button
            type="button"
            className="certificate-icon has-image"
            title={`Xem chứng chỉ ${name}`}
            aria-label={`Xem chứng chỉ ${name}`}
            onClick={() => onPreview({ name, imageUrl: fullUrl || thumbUrl })}
        >
            <img
                className="certificate-thumb-img"
                src={thumbUrl}
                alt={`Ảnh chứng chỉ ${name}`}
                loading="lazy"
                onError={() => setFailed(true)}
            />
        </button>
    );
};

const CertificatePreviewModal = ({ preview, onClose }: { preview: CertificatePreview; onClose: () => void }) => {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    return (
        <div
            className="certificate-lightbox"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={`Chứng chỉ ${preview.name}`}
        >
            <button className="certificate-lightbox-close" onClick={onClose} aria-label="Đóng" type="button">
                ×
            </button>
            <div className="certificate-lightbox-body" onClick={(e) => e.stopPropagation()}>
                <img className="certificate-lightbox-img" src={preview.imageUrl} alt={`Chứng chỉ ${preview.name}`} />
                <div className="certificate-lightbox-caption">{preview.name}</div>
            </div>
        </div>
    );
};

const AcademicPortfolioSection = ({ certificates }: { certificates: CertificateInfo[] | null }) => {
    const [preview, setPreview] = useState<CertificatePreview | null>(null);
    const certificateList = certificates ?? [];
    const totalCertificates = certificateList.length;
    const verifiedCertificates = certificateList.filter((cert) => cert.verificationStatus === 'verified').length;
    const verificationLabel = totalCertificates > 0
        ? `${verifiedCertificates}/${totalCertificates} đã xác thực`
        : 'Chưa cập nhật';

    return (
        <section className="portfolio-section">
            <div className="portfolio-header">
                <h2 className="section-title">Hồ sơ năng lực học thuật</h2>
                <div className="verified-badge-green">
                    <span className="verified-badge-icon" aria-hidden="true">
                        <CheckIcon />
                    </span>
                    <span className="verified-badge-copy">
                        <small>Trạng thái hồ sơ</small>
                        <b>{verificationLabel}</b>
                    </span>
                </div>
            </div>

            <div className="portfolio-content">
                <div className="portfolio-category">
                    <div className="category-header">
                        <div className="category-heading">
                            <div className="category-indicator gold"></div>
                            <span className="category-title">Văn bằng & Chứng chỉ</span>
                        </div>
                        <div className="category-summary">
                            <span className="category-count">
                                {totalCertificates > 0 ? `${totalCertificates} mục` : 'Chưa có mục nào'}
                            </span>
                            <div className="category-divider"></div>
                        </div>
                    </div>
                    <div className="certificates-grid">
                        {totalCertificates > 0 ? certificateList.map((cert, index) => {
                            const isVerified = cert.verificationStatus === 'verified';

                            return (
                                <div key={index} className={`certificate-card${isVerified ? ' is-verified' : ''}`}>
                                    <CertificateThumbnail
                                        url={cert.certificateFileUrl}
                                        thumbnailUrl={cert.thumbnailUrl}
                                        name={cert.certificateName}
                                        onPreview={setPreview}
                                    />
                                    <div className="certificate-info">
                                        <div className="certificate-meta-row">
                                            <span className="certificate-type">
                                                {cert.certificateType || 'Chứng chỉ'}
                                            </span>
                                            {isVerified && (
                                                <span className="certificate-status">
                                                    <CheckIcon />
                                                    Đã xác thực
                                                </span>
                                            )}
                                        </div>
                                        <div className="certificate-title-row">
                                            <b className="certificate-title">{cert.certificateName}</b>
                                        </div>
                                        <span className="certificate-institution">
                                            <small>Đơn vị cấp</small>
                                            {cert.issuingOrganization || 'Chưa cập nhật'}
                                        </span>
                                        {cert.yearIssued && <span className="certificate-year-pill">Năm {cert.yearIssued}</span>}
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="portfolio-empty-state">
                                <div className="portfolio-empty-icon" aria-hidden="true">
                                    <CertificateIcon />
                                </div>
                                <div className="portfolio-empty-copy">
                                    <b>Chưa có chứng chỉ được cập nhật</b>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {preview && <CertificatePreviewModal preview={preview} onClose={() => setPreview(null)} />}
        </section>
    );
};

export default AcademicPortfolioSection;

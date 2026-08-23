import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { formatCurrency, formatDateTime, formatWithdrawalStatusV2 } from '../../utils/formatters';
import { getWithdrawalDetail, type WithdrawalDetail } from '../../services/wallet.service';
import { useProtectedImage } from '../../hooks/useProtectedImage';
import { ImageLightbox } from '../../components/shared';
import styles from './styles.module.css';
import { getApiErrorMessage } from '../../utils/apiError';

interface Props {
  withdrawalId: number;
  onClose: () => void;
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className={styles.invoiceRow}>
    <span className={styles.invoiceLabel}>{label}</span>
    <span className={styles.invoiceValue}>{value}</span>
  </div>
);

const WithdrawalDetailModal = ({ withdrawalId, onClose }: Props) => {
  const [detail, setDetail] = useState<WithdrawalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  // Ảnh biên lai nằm sau endpoint đòi token; thẻ <img> không gửi được nên phải tải bằng JS.
  const { objectUrl: proofImage, failed: proofFailed } = useProtectedImage(detail?.proofImageUrl);
  const [proofZoomed, setProofZoomed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await getWithdrawalDetail(withdrawalId);
        if (!cancelled) setDetail(res.content);
      } catch (error) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, 'Không thể tải chi tiết yêu cầu rút tiền'));
          onClose();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [withdrawalId, onClose]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Chi tiết yêu cầu rút tiền</h3>
          <button className={styles.modalCloseBtn} type="button" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {loading || !detail ? (
            <div className={styles.emptyState}>Đang tải...</div>
          ) : (
            <>
              <div className={styles.invoiceAmountBlock}>
                <span className={styles.invoiceType}>{formatWithdrawalStatusV2(detail.status || '')}</span>
                <span className={`${styles.invoiceAmount} ${styles.valueRed}`}>-{formatCurrency(detail.amount)}</span>
                <span className={styles.invoiceDate}>{formatDateTime(detail.requestedAt)}</span>
              </div>

              <div className={styles.invoiceSection}>
                <div className={styles.invoiceSectionTitle}>Thông tin yêu cầu</div>
                <Row label="Mã yêu cầu" value={`#${detail.withdrawalId}`} />
                <Row label="Trạng thái" value={formatWithdrawalStatusV2(detail.status || '')} />
                <Row label="Số tiền" value={formatCurrency(detail.amount)} />
                <Row label="Yêu cầu lúc" value={formatDateTime(detail.requestedAt)} />
                {detail.processedAt && <Row label="Xử lý lúc" value={formatDateTime(detail.processedAt)} />}
              </div>

              <div className={styles.invoiceSection}>
                <div className={styles.invoiceSectionTitle}>Tài khoản nhận tiền</div>
                {detail.bankName && <Row label="Ngân hàng" value={detail.bankName} />}
                {detail.accountNumber && <Row label="Số tài khoản" value={detail.accountNumber} />}
                {detail.accountHolderName && <Row label="Chủ tài khoản" value={detail.accountHolderName} />}
              </div>

              {(detail.transactionId || detail.paidAt || detail.completionNote || detail.rejectionReason || detail.proofImageUrl) && (
                <div className={styles.invoiceSection}>
                  <div className={styles.invoiceSectionTitle}>Kết quả xử lý</div>
                  {detail.transactionId && <Row label="Mã tham chiếu thanh toán" value={detail.transactionId} />}
                  {detail.paidAt && <Row label="Thời gian chuyển khoản" value={formatDateTime(detail.paidAt)} />}
                  {detail.completionNote && <Row label="Ghi chú" value={detail.completionNote} />}
                  {detail.rejectionReason && <Row label="Lý do từ chối" value={detail.rejectionReason} />}
                  {detail.proofImageUrl && (
                    <div className={styles.invoiceRow}>
                      <span className={styles.invoiceLabel}>Biên lai chuyển khoản</span>
                      <div className={styles.invoiceValue}>
                        {proofFailed ? (
                          <span>Không tải được ảnh. Vui lòng thử lại.</span>
                        ) : !proofImage ? (
                          <span>Đang tải ảnh…</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              className={styles.proofImageLink}
                              onClick={() => setProofZoomed(true)}
                              aria-label="Phóng to biên lai chuyển khoản"
                            >
                              <img
                                src={proofImage}
                                alt="Biên lai chuyển khoản"
                                className={styles.proofImage}
                              />
                            </button>
                            <button
                              type="button"
                              className={styles.viewFullImageBtn}
                              onClick={() => setProofZoomed(true)}
                            >
                              Xem ảnh đầy đủ →
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ImageLightbox
        imageUrl={proofZoomed ? proofImage : null}
        title="Biên lai chuyển khoản"
        onClose={() => setProofZoomed(false)}
      />
    </div>
  );
};

export default WithdrawalDetailModal;
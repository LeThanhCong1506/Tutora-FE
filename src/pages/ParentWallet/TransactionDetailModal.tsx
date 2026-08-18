import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  formatCurrency,
  formatDateTime,
  formatTransactionType,
  formatWithdrawalStatusV2,
} from '../../utils/formatters';
import { getDisputeStatusMeta, getDisputeTypeLabel } from '../../components/disputes';
import {
  getTransactionDetail,
  getWithdrawalDetail,
  type TransactionDetail,
  type WithdrawalDetail,
} from '../../services/wallet.service';
import styles from './styles.module.css';

interface Props {
  transactionId: number;
  onClose: () => void;
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className={styles.invoiceRow}>
    <span className={styles.invoiceLabel}>{label}</span>
    <span className={styles.invoiceValue}>{value}</span>
  </div>
);

const TransactionDetailModal = ({ transactionId, onClose }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const portalBase = location.pathname.startsWith('/student-portal') ? '/student-portal' : '/parent-portal';
  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [withdrawalDetail, setWithdrawalDetail] = useState<WithdrawalDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getTransactionDetail(transactionId);
        if (cancelled) return;
        setDetail(res.content);

        // The wallet-transaction endpoint only returns flat ledger fields; for a
        // withdrawal-referencing transaction, fetch the full withdrawal record
        // (bank info, status, payout reference, proof) separately.
        if (res.content.referenceTable === 'withdrawal' && res.content.referenceId) {
          try {
            const withdrawalRes = await getWithdrawalDetail(res.content.referenceId);
            if (!cancelled) setWithdrawalDetail(withdrawalRes.content);
          } catch (err) {
            console.error('Failed to load withdrawal detail for transaction:', err);
          }
        }
      } catch {
        if (!cancelled) {
          toast.error('Không thể tải chi tiết giao dịch');
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
  }, [transactionId, onClose]);

  const positive = (detail?.amount ?? 0) >= 0;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Chi tiết giao dịch</h3>
          <button className={styles.modalCloseBtn} type="button" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {loading || !detail ? (
            <div className={styles.skeletonWrap} aria-busy="true" aria-label="Đang tải chi tiết giao dịch">
              <div className={styles.skeletonAmountBlock}>
                <span className={`${styles.skeleton} ${styles.skeletonType}`} />
                <span className={`${styles.skeleton} ${styles.skeletonAmount}`} />
                <span className={`${styles.skeleton} ${styles.skeletonDate}`} />
              </div>
              <span className={`${styles.skeleton} ${styles.skeletonNote}`} />
              <div className={styles.skeletonSection}>
                <span className={`${styles.skeleton} ${styles.skeletonSectionTitle}`} />
                <span className={`${styles.skeleton} ${styles.skeletonLine}`} />
                <span className={`${styles.skeleton} ${styles.skeletonLine}`} />
                <span className={`${styles.skeleton} ${styles.skeletonLine}`} />
                <span className={`${styles.skeleton} ${styles.skeletonLine}`} />
              </div>
            </div>
          ) : (
            <>
              <div className={styles.invoiceAmountBlock}>
                <span className={styles.invoiceType}>
                  {formatTransactionType(detail.transactionType)}
                </span>
                <span className={`${styles.invoiceAmount} ${positive ? styles.valueGreen : styles.valueRed}`}>
                  {positive ? '+' : ''}
                  {formatCurrency(detail.amount)}
                </span>
                <span className={styles.invoiceDate}>{formatDateTime(detail.createdAt)}</span>
              </div>

              {detail.description && (
                <div className={styles.invoiceNote}>{detail.description}</div>
              )}

              {/* ── Hoá đơn đặt lịch ── */}
              {detail.booking && (
                <div className={styles.invoiceSection}>
                  <div className={styles.invoiceSectionTitle}>Hoá đơn đặt lịch</div>
                  {detail.booking.paymentCode && (
                    <Row label="Mã thanh toán" value={detail.booking.paymentCode} />
                  )}
                  {detail.booking.subjectName && (
                    <Row label="Môn học" value={detail.booking.subjectName} />
                  )}
                  {detail.booking.tutorName && (
                    <Row label="Gia sư" value={detail.booking.tutorName} />
                  )}
                  {detail.booking.studentName && (
                    <Row label="Học sinh" value={detail.booking.studentName} />
                  )}
                  {detail.booking.totalSessions != null && (
                    <Row label="Số buổi" value={detail.booking.totalSessions} />
                  )}
                  {detail.booking.pricePerHour != null && (
                    <Row label="Đơn giá / giờ" value={formatCurrency(detail.booking.pricePerHour)} />
                  )}
                  {detail.booking.totalAmount != null && (
                    <Row label="Tổng tiền" value={formatCurrency(detail.booking.totalAmount)} />
                  )}
                  {detail.booking.depositAmount != null && (
                    <Row label="Tiền cọc" value={formatCurrency(detail.booking.depositAmount)} />
                  )}
                  {detail.booking.remainingAmount != null && (
                    <Row label="Còn lại" value={formatCurrency(detail.booking.remainingAmount)} />
                  )}
                  <button
                    className={styles.linkBtn}
                    type="button"
                    onClick={() => navigate(`${portalBase}/booking/${detail.booking!.bookingId}`)}
                  >
                    Xem chi tiết đặt lịch →
                  </button>
                </div>
              )}

              {/* ── Tranh chấp ── */}
              {detail.dispute && (
                <div className={styles.invoiceSection}>
                  <div className={styles.invoiceSectionTitle}>Thông tin tranh chấp</div>
                  <Row label="Mã tranh chấp" value={`#${detail.dispute.disputeId}`} />
                  {detail.dispute.disputeType && (
                    <Row label="Loại" value={getDisputeTypeLabel(detail.dispute.disputeType)} />
                  )}
                  {detail.dispute.status && (
                    <Row label="Trạng thái" value={getDisputeStatusMeta(detail.dispute.status).label} />
                  )}
                  {detail.dispute.reason && <Row label="Lý do" value={detail.dispute.reason} />}
                  {detail.dispute.refundAmount != null && (
                    <Row label="Số tiền hoàn" value={formatCurrency(detail.dispute.refundAmount)} />
                  )}
                  {detail.dispute.refundPercentage != null && (
                    <Row label="Tỷ lệ hoàn" value={`${detail.dispute.refundPercentage}%`} />
                  )}
                  {detail.dispute.resolutionNote && (
                    <Row label="Ghi chú xử lý" value={detail.dispute.resolutionNote} />
                  )}
                  {detail.dispute.bookingId != null && (
                    <button
                      className={styles.linkBtn}
                      type="button"
                      onClick={() => navigate(`${portalBase}/booking/${detail.dispute!.bookingId}`)}
                    >
                      Xem đặt lịch liên quan →
                    </button>
                  )}
                </div>
              )}

              {/* ── Rút tiền ── */}
              {withdrawalDetail && (
                <div className={styles.invoiceSection}>
                  <div className={styles.invoiceSectionTitle}>Yêu cầu rút tiền</div>
                  <Row label="Mã yêu cầu" value={`#${withdrawalDetail.withdrawalId}`} />
                  <Row
                    label="Trạng thái"
                    value={formatWithdrawalStatusV2(withdrawalDetail.status || '')}
                  />
                  {withdrawalDetail.bankName && (
                    <Row label="Ngân hàng" value={withdrawalDetail.bankName} />
                  )}
                  {withdrawalDetail.accountNumber && (
                    <Row label="Số tài khoản" value={withdrawalDetail.accountNumber} />
                  )}
                  {withdrawalDetail.accountHolderName && (
                    <Row label="Chủ tài khoản" value={withdrawalDetail.accountHolderName} />
                  )}
                  {withdrawalDetail.requestedAt && (
                    <Row label="Yêu cầu lúc" value={formatDateTime(withdrawalDetail.requestedAt)} />
                  )}
                  {withdrawalDetail.processedAt && (
                    <Row label="Xử lý lúc" value={formatDateTime(withdrawalDetail.processedAt)} />
                  )}
                  {withdrawalDetail.transactionId && (
                    <Row label="Mã tham chiếu thanh toán" value={withdrawalDetail.transactionId} />
                  )}
                  {withdrawalDetail.paidAt && (
                    <Row label="Thời gian chuyển khoản" value={formatDateTime(withdrawalDetail.paidAt)} />
                  )}
                  {withdrawalDetail.completionNote && (
                    <Row label="Ghi chú" value={withdrawalDetail.completionNote} />
                  )}
                  {withdrawalDetail.rejectionReason && (
                    <Row label="Lý do từ chối" value={withdrawalDetail.rejectionReason} />
                  )}
                  {withdrawalDetail.proofImageUrl && (
                    <div className={styles.invoiceRow}>
                      <span className={styles.invoiceLabel}>Biên lai chuyển khoản</span>
                      <div className={styles.invoiceValue}>
                        <a
                          href={withdrawalDetail.proofImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.proofImageLink}
                        >
                          <img
                            src={withdrawalDetail.proofImageUrl}
                            alt="Biên lai chuyển khoản"
                            className={styles.proofImage}
                            loading="lazy"
                          />
                        </a>
                        <button
                          type="button"
                          className={styles.viewFullImageBtn}
                          onClick={() => window.open(withdrawalDetail.proofImageUrl!, '_blank')}
                        >
                          Xem ảnh đầy đủ →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailModal;

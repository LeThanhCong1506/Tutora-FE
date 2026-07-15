import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { formatCurrency } from '../../utils/formatters';
import { createWithdrawal } from '../../services/wallet.service';
import { getBankList } from '../../services/bankVerification.service';
import type { BankListItem } from '../../types/finance.types';
import styles from './styles.module.css';

interface Props {
  availableBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}

const MIN_WITHDRAWAL = 100000;

const WithdrawModal = ({ availableBalance, onClose, onSuccess }: Props) => {
  const [banks, setBanks] = useState<BankListItem[]>([]);
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getBankList()
      .then(setBanks)
      .catch(() => {
        /* dropdown vẫn dùng được ở chế độ nhập tay nếu list lỗi */
      });
  }, []);

  const amountNumber = Number(amount);
  const amountValid =
    !Number.isNaN(amountNumber) &&
    amountNumber >= MIN_WITHDRAWAL &&
    amountNumber <= availableBalance;
  const formValid =
    amountValid && bankName.trim() && accountNumber.trim() && accountHolderName.trim();

  const handleSubmit = async () => {
    if (!formValid || submitting) return;
    setSubmitting(true);
    try {
      await createWithdrawal({
        amount: amountNumber,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolderName: accountHolderName.trim(),
      });
      toast.success('Đã gửi yêu cầu rút tiền, đang chờ xét duyệt.');
      onSuccess();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể gửi yêu cầu rút tiền. Vui lòng thử lại.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Gửi yêu cầu rút tiền</h3>
          <button className={styles.modalCloseBtn} type="button" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.balanceHint}>
            Số dư khả dụng: <strong>{formatCurrency(availableBalance)}</strong>
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Số tiền muốn rút</span>
            <input
              className={styles.input}
              type="number"
              inputMode="numeric"
              min={MIN_WITHDRAWAL}
              placeholder="Tối thiểu 100.000₫"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {amount !== '' && !amountValid && (
              <span className={styles.fieldError}>
                {amountNumber < MIN_WITHDRAWAL
                  ? 'Số tiền rút tối thiểu là 100.000₫.'
                  : 'Số tiền vượt quá số dư khả dụng.'}
              </span>
            )}
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Ngân hàng</span>
            <select
              className={styles.input}
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            >
              <option value="">-- Chọn ngân hàng --</option>
              {banks.map((b) => (
                <option key={b.code} value={b.shortName || b.fullName}>
                  {b.shortName ? `${b.shortName} — ${b.fullName}` : b.fullName}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Số tài khoản</span>
            <input
              className={styles.input}
              type="text"
              inputMode="numeric"
              placeholder="Nhập số tài khoản nhận tiền"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Tên chủ tài khoản</span>
            <input
              className={styles.input}
              type="text"
              placeholder="VD: NGUYEN VAN A"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value.toUpperCase())}
            />
          </label>

          <div className={styles.modalNote}>
            Yêu cầu rút tiền sẽ được xét duyệt trong vòng 24 giờ. Số tiền được tạm trừ khỏi số dư
            khả dụng ngay khi gửi yêu cầu.
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.secondaryBtn} type="button" onClick={onClose} disabled={submitting}>
            Huỷ
          </button>
          <button
            className={styles.primaryBtn}
            type="button"
            onClick={handleSubmit}
            disabled={!formValid || submitting}
          >
            {submitting ? 'Đang gửi...' : 'Xác nhận rút tiền'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WithdrawModal;

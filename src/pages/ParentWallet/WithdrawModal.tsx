import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { formatCurrency, maskBankAccount } from '../../utils/formatters';
import { createWithdrawal } from '../../services/wallet.service';
import { getBankAccount, type BankAccount } from '../../services/bankAccount.service';
import { setPendingRedirect } from '../../services/auth.service';
import styles from './styles.module.css';
import { getApiErrorMessage } from '../../utils/apiError';

interface Props {
  availableBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}

const MIN_WITHDRAWAL = 10000;

/**
 * Tài khoản nhận tiền giờ LUÔN là tài khoản ngân hàng đã lưu (giống Tutor) — không còn gõ tay mỗi
 * lần rút tiền, vì mọi thay đổi tài khoản ngân hàng giờ bắt buộc qua OTP (xem BankAccountForm).
 * Chưa lưu tài khoản nào → chặn rút tiền, dẫn đi lưu tài khoản trước.
 */
const WithdrawModal = ({ availableBalance, onClose, onSuccess }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const portalBase = location.pathname.startsWith('/student-portal') ? '/student-portal' : '/parent-portal';

  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    getBankAccount()
      .then((info) => {
        if (mounted) setBankAccount(info);
      })
      .catch(() => {
        if (mounted) setBankAccount(null);
      })
      .finally(() => {
        if (mounted) setLoadingAccount(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const hasBankAccount = Boolean(
    bankAccount?.bankName && bankAccount?.accountNumber && bankAccount?.accountHolderName,
  );

  const amountNumber = Number(amount);
  const amountValid =
    !Number.isNaN(amountNumber) &&
    amountNumber >= MIN_WITHDRAWAL &&
    amountNumber <= availableBalance;
  const formValid = amountValid && hasBankAccount;

  // Lưu lại đúng chỗ đang đứng (trang ví) để có thể quay lại sau khi lưu tài khoản ngân hàng —
  // KHÔNG tự mở lại modal này (không có URL riêng để resume), người dùng tự bấm "Rút tiền" lại.
  const goAddBankAccount = () => {
    setPendingRedirect(location.pathname);
    navigate(`${portalBase}/wallet/bank-account`);
  };

  const handleSubmit = async () => {
    if (!formValid || submitting) return;
    setSubmitting(true);
    try {
      await createWithdrawal({ amount: amountNumber });
      toast.success('Đã gửi yêu cầu rút tiền, đang chờ xét duyệt.');
      onSuccess();
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { errorCode?: string; message?: string } } };
      if (apiError.response?.data?.errorCode === 'BANK_ACCOUNT_REQUIRED') {
        toast.error('Bạn chưa có tài khoản ngân hàng đã lưu.');
        goAddBankAccount();
        return;
      }
      toast.error(getApiErrorMessage(apiError, 'Không thể gửi yêu cầu rút tiền. Vui lòng thử lại.'));
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
              placeholder="Tối thiểu 10,000₫"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {amount !== '' && !amountValid && (
              <span className={styles.fieldError}>
                {amountNumber < MIN_WITHDRAWAL
                  ? 'Số tiền rút tối thiểu là 10,000₫.'
                  : 'Số tiền vượt quá số dư khả dụng.'}
              </span>
            )}
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Tài khoản nhận tiền</span>
            {loadingAccount ? (
              <div className={styles.input}>Đang tải...</div>
            ) : hasBankAccount ? (
              <div className={styles.input}>
                <strong>{bankAccount!.bankName}</strong>
                <span style={{ display: 'block' }}>
                  {maskBankAccount(bankAccount!.accountNumber || '')} — {bankAccount!.accountHolderName}
                </span>
              </div>
            ) : (
              <span className={styles.fieldError}>
                Bạn chưa có tài khoản ngân hàng đã lưu.{' '}
                <button
                  type="button"
                  onClick={goAddBankAccount}
                  style={{ textDecoration: 'underline', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit' }}
                >
                  Thêm tài khoản ngân hàng
                </button>
              </span>
            )}
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

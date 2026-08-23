import React, { useState } from 'react';
import { Modal, Button } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import PaymentOtpStep from '../PaymentOtpStep/PaymentOtpStep';
import { useBankAccountOtp } from '../../hooks/useBankAccountOtp';
import { deleteBankAccount } from '../../services/bankAccount.service';
import { getApiErrorMessage } from '../../utils/apiError';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Xoá tài khoản ngân hàng — cùng yêu cầu OTP như lưu (không phải popup xác nhận thường). Bấm
 * "Xoá" chỉ gửi OTP; xoá thật chỉ xảy ra sau khi xác thực OTP thành công.
 */
const BankAccountDeleteModal: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [deleting, setDeleting] = useState(false);
  const otp = useBankAccountOtp();

  const handleConfirm = async () => {
    await otp.start();
  };

  const handleVerified = async () => {
    setDeleting(true);
    try {
      await deleteBankAccount();
      toast.success('Đã xoá tài khoản ngân hàng.');
      onSuccess();
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'Không thể xoá tài khoản ngân hàng. Vui lòng thử lại.');
      toast.error(message);
      otp.reset();
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    otp.reset();
    onClose();
  };

  return (
    <Modal
      className="finance-modal"
      title="Xoá tài khoản ngân hàng"
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnHidden
      centered
      width={480}
    >
      {otp.status === 'blocked' ? (
        <div className="finance-bank-otp-wrap">
          <p className="finance-otp-error">{otp.errorMessage}</p>
          <Button onClick={handleClose}>Đóng</Button>
        </div>
      ) : otp.status !== 'idle' ? (
        <div className="finance-bank-otp-wrap">
          {otp.status === 'sending' ? (
            <div className="finance-otp-loading">Đang gửi mã OTP...</div>
          ) : (
            <PaymentOtpStep
              title="Xác thực xoá tài khoản ngân hàng"
              description={
                <>
                  Vui lòng nhập mã OTP đã được gửi qua Zalo tới <strong>số điện thoại của bạn</strong> để xác nhận
                  xoá.
                </>
              }
              verifying={otp.verifying || deleting}
              initialCooldownSeconds={otp.initialCooldownSeconds}
              onVerify={otp.verify}
              onResend={otp.resend}
              onVerified={handleVerified}
            />
          )}
        </div>
      ) : (
        <div className="finance-bank-delete-confirm">
          <ExclamationCircleOutlined className="finance-bank-delete-confirm__icon" />
          <p>Bạn sẽ cần thêm lại tài khoản mới trước khi rút tiền lần sau. Bạn chắc chắn muốn xoá?</p>
          <div className="finance-form-actions">
            <Button onClick={handleClose}>Huỷ</Button>
            <Button danger type="primary" onClick={handleConfirm}>
              Xoá
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default BankAccountDeleteModal;

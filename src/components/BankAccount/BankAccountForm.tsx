import React, { useState } from 'react';
import { Alert, Button, Form, Input } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import BankSelectDropdown from './BankSelectDropdown';
import PaymentOtpStep from '../PaymentOtpStep/PaymentOtpStep';
import { useBankAccountOtp } from '../../hooks/useBankAccountOtp';
import { saveBankAccount, type BankAccount, type SaveBankAccountRequest } from '../../services/bankAccount.service';
import { getApiErrorMessage } from '../../utils/apiError';

interface Props {
  bankInfo: BankAccount | null;
  onSuccess: () => void;
  onCancel: () => void;
}

/** Chuẩn hóa tên chủ tài khoản: bỏ dấu tiếng Việt + viết hoa (theo chuẩn ngân hàng). */
const normalizeHolderName = (value: string): string =>
  value.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase();

/**
 * Form lưu tài khoản ngân hàng — dùng chung Tutor/Parent/Student. Bấm "Lưu thông tin" KHÔNG lưu
 * ngay: gửi OTP tới SĐT riêng của chính người dùng trước, form ẩn đi và thay bằng màn nhập OTP;
 * xác thực xong mới thực sự gọi lưu (tự động, không cần bấm thêm lần nữa).
 */
const BankAccountForm: React.FC<Props> = ({ bankInfo, onSuccess, onCancel }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [pendingValues, setPendingValues] = useState<SaveBankAccountRequest | null>(null);
  const otp = useBankAccountOtp();

  const handleFinish = async (values: { bankName: string; accountNumber: string; accountHolderName: string }) => {
    setPendingValues({
      bankName: values.bankName,
      accountNumber: values.accountNumber.trim(),
      accountHolderName: values.accountHolderName.trim(),
    });
    await otp.start();
  };

  const handleVerified = async () => {
    if (!pendingValues) return;
    setSaving(true);
    try {
      await saveBankAccount(pendingValues);
      toast.success('Cập nhật thông tin ngân hàng thành công.');
      onSuccess();
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'Không thể cập nhật thông tin ngân hàng. Vui lòng thử lại.');
      toast.error(message);
      otp.reset();
    } finally {
      setSaving(false);
    }
  };

  if (otp.status === 'blocked') {
    return (
      <div className="finance-bank-otp-wrap">
        <p className="finance-otp-error">{otp.errorMessage}</p>
        <Button onClick={onCancel}>Đóng</Button>
      </div>
    );
  }

  if (otp.status !== 'idle') {
    return (
      <div className="finance-bank-otp-wrap">
        {otp.status === 'sending' ? (
          <div className="finance-otp-loading">Đang gửi mã OTP...</div>
        ) : (
          <PaymentOtpStep
            title="Xác thực tài khoản ngân hàng"
            description={
              <>
                Để bảo vệ tài khoản của bạn, vui lòng nhập mã OTP đã được gửi qua Zalo tới{' '}
                <strong>số điện thoại của bạn</strong>.
              </>
            }
            verifying={otp.verifying || saving}
            initialCooldownSeconds={otp.initialCooldownSeconds}
            onVerify={otp.verify}
            onResend={otp.resend}
            onVerified={handleVerified}
          />
        )}
      </div>
    );
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{
        bankName: bankInfo?.bankName || '',
        accountNumber: bankInfo?.accountNumber || '',
        accountHolderName: bankInfo?.accountHolderName || '',
      }}
      className="finance-bank-form"
    >
      <Alert
        message="Tài khoản nhận tiền rút"
        description="Đây là tài khoản ngân hàng nhận tiền khi bạn tạo yêu cầu rút tiền. Vui lòng kiểm tra kỹ thông tin — chuyển khoản sai do thông tin không chính xác sẽ khó thu hồi. Mọi thay đổi đều cần xác thực OTP."
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        className="finance-form-alert"
      />

      <Form.Item name="bankCode" label="Ngân hàng" rules={[{ required: true, message: 'Vui lòng chọn ngân hàng' }]}>
        <BankSelectDropdown
          initialBankName={bankInfo?.bankName || undefined}
          onChange={(val, bank) => {
            form.setFieldsValue({
              bankCode: val,
              bankName: bank.shortName || bank.fullName,
            });
          }}
        />
      </Form.Item>

      <Form.Item name="bankName" hidden>
        <Input />
      </Form.Item>

      <Form.Item
        name="accountNumber"
        label="Số tài khoản"
        rules={[
          { required: true, message: 'Vui lòng nhập số tài khoản' },
          { pattern: /^\d{8,19}$/, message: 'Số tài khoản gồm 8-19 chữ số' },
        ]}
      >
        <Input placeholder="Ví dụ: 190312345678" size="large" inputMode="numeric" maxLength={19} />
      </Form.Item>

      <Form.Item
        name="accountHolderName"
        label="Tên chủ tài khoản"
        normalize={normalizeHolderName}
        rules={[
          { required: true, message: 'Vui lòng nhập tên chủ tài khoản' },
          { pattern: /^[A-Z\s]+$/, message: 'Tên viết hoa không dấu, chỉ gồm chữ cái và khoảng trắng' },
        ]}
        extra="Tên viết hoa không dấu, khớp với tên trên thẻ/app ngân hàng"
      >
        <Input placeholder="NGUYEN VAN A" size="large" />
      </Form.Item>

      <div className="finance-form-actions">
        <Button size="large" onClick={onCancel}>
          Hủy bỏ
        </Button>
        <Button type="primary" htmlType="submit" size="large" className="finance-primary-action">
          Lưu thông tin
        </Button>
      </div>
    </Form>
  );
};

export default BankAccountForm;

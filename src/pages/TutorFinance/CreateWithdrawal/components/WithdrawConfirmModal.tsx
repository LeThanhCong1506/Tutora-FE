import React from 'react';
import { Alert, Descriptions, Divider, Modal } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { formatCurrency } from '../../../../utils/formatters';
import type { BankInfo } from '../../../../types/finance.types';

interface Props {
  open: boolean;
  amount: number;
  bankInfo: BankInfo | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const WithdrawConfirmModal: React.FC<Props> = ({ open, amount, bankInfo, onConfirm, onCancel, loading }) => {
  return (
    <Modal
      className="finance-modal finance-confirm-modal"
      title="Xác nhận yêu cầu rút tiền"
      open={open}
      onOk={onConfirm}
      onCancel={onCancel}
      confirmLoading={loading}
      okText="Xác nhận rút tiền"
      cancelText="Quay lại"
      okButtonProps={{ className: 'finance-primary-action' }}
      centered
      width={560}
    >
      <div className="finance-confirm-content">
        <div className="finance-confirm-amount">
          <span>Số tiền yêu cầu</span>
          <strong>{formatCurrency(amount)}</strong>
          <small>Phí giao dịch: 0 VND</small>
        </div>

        <Descriptions className="finance-confirm-details" column={1} colon={false}>
          <Descriptions.Item label="Ngân hàng thụ hưởng">{bankInfo?.bankName}</Descriptions.Item>
          <Descriptions.Item label="Số tài khoản">{bankInfo?.accountNumber}</Descriptions.Item>
          <Descriptions.Item label="Chủ tài khoản">{bankInfo?.accountHolderName}</Descriptions.Item>
        </Descriptions>

        <Divider />

        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          message="Lưu ý quan trọng"
          description="Số tiền sẽ được tạm trừ khỏi số dư khả dụng ngay khi gửi yêu cầu. Yêu cầu sẽ được admin/staff xét duyệt và chuyển khoản trong vòng 24 giờ; nếu bị từ chối, tiền sẽ được hoàn lại ví. Sau khi xác nhận, yêu cầu không thể chỉnh sửa hoặc hủy."
          className="finance-form-alert"
        />
      </div>
    </Modal>
  );
};

export default WithdrawConfirmModal;

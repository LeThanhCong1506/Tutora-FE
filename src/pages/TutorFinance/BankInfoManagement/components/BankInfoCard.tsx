import React from 'react';
import { Button, Card, Empty } from 'antd';
import { BankOutlined, CalendarOutlined, EditOutlined } from '@ant-design/icons';
import { maskBankAccount } from '../../../../utils/formatters';
import type { BankInfo } from '../../../../types/finance.types';

interface Props {
  bankInfo: BankInfo | null;
  loading: boolean;
  onEdit: () => void;
}

const BankInfoCard: React.FC<Props> = ({ bankInfo, loading, onEdit }) => {
  const hasBankInfo = Boolean(bankInfo?.bankName && bankInfo?.accountNumber && bankInfo?.accountHolderName);

  if (loading) {
    return <Card className="finance-surface finance-bank-info-card" loading />;
  }

  if (!hasBankInfo) {
    return (
      <section className="finance-surface finance-bank-info-card finance-bank-empty">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div className="finance-empty-copy">
              <strong>Chưa có tài khoản nhận tiền</strong>
              <span>Thêm tài khoản ngân hàng trước khi tạo yêu cầu rút tiền.</span>
            </div>
          }
        >
          <Button
            type="primary"
            size="large"
            className="finance-primary-action"
            icon={<BankOutlined />}
            onClick={onEdit}
          >
            Thêm tài khoản
          </Button>
        </Empty>
      </section>
    );
  }

  const changedDate = bankInfo?.bankChangedAt
    ? new Date(bankInfo.bankChangedAt).toLocaleDateString('vi-VN')
    : 'Chưa ghi nhận';

  return (
    <section className="finance-surface finance-bank-info-card">
      <div className="finance-card-heading">
        <div>
          <span className="finance-card-heading__icon" aria-hidden="true">
            <BankOutlined />
          </span>
          <div>
            <h2>Tài khoản nhận tiền</h2>
            <p>Được sử dụng cho mọi yêu cầu rút tiền</p>
          </div>
        </div>
        <Button icon={<EditOutlined />} onClick={onEdit}>
          Thay đổi
        </Button>
      </div>

      <div className="finance-bank-visual" aria-label="Thông tin tài khoản ngân hàng">
        <div className="finance-bank-visual__top">
          <span>TUTORA PAYOUT</span>
          <BankOutlined aria-hidden="true" />
        </div>
        <div className="finance-bank-visual__name">{bankInfo?.bankName}</div>
        <div className="finance-bank-visual__number">{maskBankAccount(bankInfo?.accountNumber || '')}</div>
        <div className="finance-bank-visual__holder">
          <span>Chủ tài khoản</span>
          <strong>{bankInfo?.accountHolderName}</strong>
        </div>
      </div>

      <div className="finance-bank-meta">
        <CalendarOutlined aria-hidden="true" />
        <span>Cập nhật gần nhất</span>
        <strong>{changedDate}</strong>
      </div>
    </section>
  );
};

export default BankInfoCard;

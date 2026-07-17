import React, { useState } from 'react';
import { Button, Card, Form, InputNumber } from 'antd';
import { ArrowRightOutlined, BankOutlined, WalletOutlined } from '@ant-design/icons';
import { formatCurrency, maskBankAccount } from '../../../../utils/formatters';
import type { BankInfo } from '../../../../types/finance.types';

interface Props {
  balance: number;
  bankInfo: BankInfo | null;
  onSubmit: (amount: number) => void;
  loading: boolean;
}

const MIN_WITHDRAW = 100000;

const WithdrawForm: React.FC<Props> = ({ balance, bankInfo, onSubmit, loading }) => {
  const [form] = Form.useForm();
  const [amount, setAmount] = useState(0);

  const handleFinish = (values: { amount: number }) => {
    onSubmit(values.amount);
  };

  const chooseAmount = (value: number) => {
    form.setFieldsValue({ amount: value });
    setAmount(value);
    void form.validateFields(['amount']);
  };

  return (
    <Card className="finance-surface finance-withdraw-form-card" bordered={false}>
      <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ amount: 0 }} requiredMark={false}>
        <div className="finance-available-balance">
          <span className="finance-available-balance__icon" aria-hidden="true">
            <WalletOutlined />
          </span>
          <div>
            <span>Số dư có thể rút</span>
            <strong>{formatCurrency(balance)}</strong>
          </div>
          <span className="finance-available-balance__status">Khả dụng</span>
        </div>

        <Form.Item
          name="amount"
          label="Số tiền muốn rút"
          className="finance-amount-field"
          extra={`Tối thiểu ${formatCurrency(MIN_WITHDRAW)} · Không vượt quá số dư khả dụng`}
          rules={[
            { required: true, message: 'Vui lòng nhập số tiền' },
            { type: 'number', min: MIN_WITHDRAW, message: `Số tiền tối thiểu là ${formatCurrency(MIN_WITHDRAW)}` },
            { type: 'number', max: balance, message: `Số tiền tối đa là ${formatCurrency(balance)}` },
          ]}
        >
          <InputNumber<number>
            className="finance-amount-input"
            size="large"
            min={0}
            controls={false}
            formatter={(value) => `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            parser={(value) => Number(value?.replace(/\./g, '') || 0)}
            placeholder="0"
            onChange={(value) => setAmount(Number(value) || 0)}
            suffix="VND"
          />
        </Form.Item>

        <div className="finance-quick-amounts" aria-label="Chọn nhanh số tiền">
          {[500000, 1000000, 2000000, 5000000].map((value) => (
            <Button
              key={value}
              disabled={value > balance}
              className={amount === value ? 'finance-quick-amount--active' : ''}
              onClick={() => chooseAmount(value)}
            >
              {new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(value)}
            </Button>
          ))}
          <Button
            type="link"
            className="finance-text-action"
            disabled={balance < MIN_WITHDRAW}
            onClick={() => chooseAmount(balance)}
          >
            Rút toàn bộ
          </Button>
        </div>

        <div className="finance-recipient-card">
          <span className="finance-recipient-card__icon" aria-hidden="true">
            <BankOutlined />
          </span>
          <div className="finance-recipient-card__copy">
            <span>Chuyển đến</span>
            <strong>{bankInfo?.bankName || 'Chưa cập nhật ngân hàng'}</strong>
            <small>
              {bankInfo?.accountHolderName || '—'} · {maskBankAccount(bankInfo?.accountNumber || '') || '—'}
            </small>
          </div>
          <span className="finance-recipient-card__verified">Đã lưu</span>
        </div>

        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          className="finance-primary-action finance-withdraw-submit"
          loading={loading}
          disabled={amount < MIN_WITHDRAW || amount > balance}
        >
          Tiếp tục xác nhận <ArrowRightOutlined />
        </Button>
      </Form>
    </Card>
  );
};

export default WithdrawForm;

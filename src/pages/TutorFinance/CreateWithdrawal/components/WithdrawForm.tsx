import React, { useState } from 'react';
import { Form, InputNumber, Button, Space, Typography, Card } from 'antd';
import { BankOutlined, WalletOutlined } from '@ant-design/icons';
import { formatCurrency, maskBankAccount } from '../../../../utils/formatters';
import type { BankInfo } from '../../../../types/finance.types';

const { Text } = Typography;

interface Props {
    balance: number;
    bankInfo: BankInfo | null;
    onSubmit: (amount: number) => void;
    loading: boolean;
}

const WithdrawForm: React.FC<Props> = ({ balance, bankInfo, onSubmit, loading }) => {
    const [form] = Form.useForm();
    const [amount, setAmount] = useState<number>(0);

    const MIN_WITHDRAW = 100000;
    const MAX_WITHDRAW = balance;

    const handleFinish = (values: { amount: number }) => {
        onSubmit(values.amount);
    };

    return (
        <Card bordered={false}>
            <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ amount: 0 }}>
                <div style={{ marginBottom: '24px' }}>
                    <Space align="center" style={{ width: '100%', justifyContent: 'space-between', background: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
                        <Space>
                            <div style={{ background: '#e6f7ff', padding: '8px', borderRadius: '50%' }}>
                                <WalletOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: '#888' }}>Số dư khả dụng</div>
                                <div style={{ fontSize: '18px', fontWeight: 600 }}>{formatCurrency(balance)}</div>
                            </div>
                        </Space>
                    </Space>
                </div>

                <Form.Item
                    name="amount"
                    label={<span style={{ fontWeight: 600, fontSize: '16px' }}>Số tiền muốn rút</span>}
                    rules={[
                        { required: true, message: 'Vui lòng nhập số tiền' },
                        { type: 'number', min: MIN_WITHDRAW, message: `Số tiền tối thiểu là ${formatCurrency(MIN_WITHDRAW)}` },
                        { type: 'number', max: MAX_WITHDRAW, message: `Số tiền tối đa là ${formatCurrency(MAX_WITHDRAW)}` }
                    ]}
                >
                    <InputNumber
                        style={{ width: '100%' }}
                        size="large"
                        formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value!.replace(/\$\s?|(,*)/g, '')}
                        placeholder="Nhập số tiền..."
                        onChange={(val) => setAmount(Number(val) || 0)}
                        suffix="VND"
                    />
                </Form.Item>

                <div style={{ marginBottom: '24px' }}>
                    <Space wrap size="small">
                        {[500000, 1000000, 2000000, 5000000].map(val => (
                            <Button
                                key={val}
                                size="small"
                                disabled={val > balance}
                                onClick={() => {
                                    form.setFieldsValue({ amount: val });
                                    setAmount(val);
                                }}
                            >
                                {formatCurrency(val)}
                            </Button>
                        ))}
                        <Button
                            size="small"
                            type="link"
                            onClick={() => {
                                form.setFieldsValue({ amount: balance });
                                setAmount(balance);
                            }}
                        >
                            Rút hết số dư
                        </Button>
                    </Space>
                </div>

                <Card size="small" style={{ background: '#fafafa', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                            <BankOutlined style={{ color: '#888' }} />
                            <Text type="secondary">Ngân hàng nhận tiền</Text>
                        </Space>
                        <Text strong>{bankInfo?.bankName}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                        <Space>
                            <div style={{ width: '14px' }} /> {/* indent */}
                            <Text type="secondary" style={{ fontSize: '12px' }}>Số tài khoản</Text>
                        </Space>
                        <Text style={{ fontSize: '12px' }}>{maskBankAccount(bankInfo?.accountNumber || '')}</Text>
                    </div>
                </Card>

                <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    block
                    loading={loading}
                    disabled={amount < MIN_WITHDRAW || amount > balance}
                >
                    Tiếp tục
                </Button>
            </Form>
        </Card>
    );
};

export default WithdrawForm;

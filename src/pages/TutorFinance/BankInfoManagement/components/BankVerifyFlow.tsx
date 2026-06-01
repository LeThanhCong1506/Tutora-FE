import React, { useState } from 'react';
import { Steps, Form, Input, Button, Alert, Space } from 'antd';
import { BankOutlined, SafetyCertificateOutlined, CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { requestVerification, confirmVerification } from '../../../../services/bankVerification.service';
import BankSelectDropdown from './BankSelectDropdown';
import type { BankVerificationStatus } from '../../../../types/finance.types';
import { toast } from 'react-toastify';

// Removed Title as it's not used in this component

interface Props {
    onSuccess: () => void;
    onCancel: () => void;
    status: BankVerificationStatus | null;
}

const BankVerifyFlow: React.FC<Props> = ({ onSuccess, onCancel, status }) => {
    const [currentStep, setCurrentStep] = useState(status?.isPending && status?.isReadyToConfirm ? 1 : 0);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const [confirmForm] = Form.useForm();
    const [requestData, setRequestData] = useState<{ bankName?: string; accountNumber?: string }>({});

    const handleRequestVerify = async (values: any) => {
        setLoading(true);
        try {
            await requestVerification({
                bankCode: values.bankCode,
                accountNumber: values.accountNumber
            });
            setRequestData({
                bankName: values.bankName,
                accountNumber: values.accountNumber
            });
            setCurrentStep(1);
            toast.success('Đã gửi yêu cầu xác thực. Vui lòng kiểm tra tài khoản ngân hàng.');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Yêu cầu xác thực thất bại');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmVerify = async (values: any) => {
        setLoading(true);
        try {
            await confirmVerification({
                verificationCode: values.code
            });
            toast.success('Xác thực tài khoản ngân hàng thành công!');
            onSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Mã xác thực không chính xác hoặc đã hết hạn');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px 0' }}>
            <Steps
                current={currentStep}
                items={[
                    { title: 'Thông tin', icon: <BankOutlined /> },
                    { title: 'Xác thực', icon: <SafetyCertificateOutlined /> },
                    { title: 'Hoàn tất', icon: <CheckCircleOutlined /> },
                ]}
                style={{ marginBottom: '32px' }}
            />

            {currentStep === 0 && (
                <Form form={form} layout="vertical" onFinish={handleRequestVerify}>
                    <Alert
                        message="Quy trình xác thực"
                        description="Hệ thống sẽ gửi một khoản tiền nhỏ (dưới 1,000đ) vào tài khoản của bạn. Trong nội dung chuyển khoản sẽ kèm theo mã xác nhận 6 chữ số."
                        type="info"
                        showIcon
                        icon={<InfoCircleOutlined />}
                        style={{ marginBottom: '24px' }}
                    />

                    <Form.Item
                        name="bankCode"
                        label="Ngân hàng"
                        rules={[{ required: true, message: 'Vui lòng chọn ngân hàng' }]}
                    >
                        <BankSelectDropdown
                            onChange={(val, bank) => {
                                form.setFieldsValue({
                                    bankCode: val,
                                    bankName: bank.shortName
                                });
                            }}
                        />
                    </Form.Item>

                    <Form.Item name="bankName" hidden><Input /></Form.Item>

                    <Form.Item
                        name="accountNumber"
                        label="Số tài khoản"
                        rules={[
                            { required: true, message: 'Vui lòng nhập số tài khoản' },
                            { pattern: /^\d+$/, message: 'Số tài khoản chỉ gồm các chữ số' }
                        ]}
                    >
                        <Input placeholder="Ví dụ: 1903xxx" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="accountHolderName"
                        label="Tên chủ tài khoản"
                        rules={[{ required: true, message: 'Vui lòng nhập tên chủ tài khoản' }]}
                        extra="Tên phải viết hoa không dấu, khớp với tên trên thẻ/app ngân hàng"
                    >
                        <Input placeholder="NGUYEN VAN A" size="large" />
                    </Form.Item>

                    <div style={{ textAlign: 'right', marginTop: '32px' }}>
                        <Space>
                            <Button onClick={onCancel}>Hủy bỏ</Button>
                            <Button type="primary" htmlType="submit" loading={loading} size="large">
                                Gửi yêu cầu xác thực
                            </Button>
                        </Space>
                    </div>
                </Form>
            )}

            {currentStep === 1 && (
                <div>
                    <Alert
                        message="Đã gởi tiền xác thực"
                        description={
                            <span>
                                Vui lòng kiểm tra biến động số dư tài khoản <strong>{status?.maskedAccountNumber || requestData.accountNumber}</strong> {status?.bankName || requestData.bankName}.
                                Nhập 6 chữ số trong nội dung chuyển khoản (Ví dụ: TUTORA <strong>123456</strong>).
                            </span>
                        }
                        type="warning"
                        showIcon
                        style={{ marginBottom: '24px' }}
                    />

                    <Form form={confirmForm} layout="vertical" onFinish={handleConfirmVerify}>
                        <Form.Item
                            name="code"
                            label="Mã xác nhận (6 chữ số)"
                            rules={[
                                { required: true, message: 'Vui lòng nhập mã xác nhận' },
                                { len: 6, message: 'Mã xác nhận phải có đúng 6 chữ số' }
                            ]}
                            style={{ maxWidth: '300px', margin: '0 auto 24px' }}
                        >
                            <Input.OTP size="large" />
                        </Form.Item>

                        {status?.attemptsLeft !== undefined && (
                            <div style={{ marginBottom: '16px', color: status.attemptsLeft < 2 ? 'red' : 'inherit' }}>
                                Số lần thử còn lại: {status.attemptsLeft}
                            </div>
                        )}

                        <div style={{ textAlign: 'center', marginTop: '32px' }}>
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <Button type="primary" htmlType="submit" loading={loading} size="large" block>
                                    Xác nhận
                                </Button>
                                <Button type="link" onClick={() => setCurrentStep(0)} disabled={loading}>
                                    Nhập lại thông tin tài khoản
                                </Button>
                            </Space>
                        </div>
                    </Form>
                </div>
            )}
        </div>
    );
};

export default BankVerifyFlow;

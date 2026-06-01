import React from 'react';
import { Card, Badge, Typography, Space, Button, Descriptions, Empty, Alert } from 'antd';
import {
    CheckCircleFilled,
    ExclamationCircleFilled,
    BankOutlined,
    LoadingOutlined,
    EditOutlined
} from '@ant-design/icons';
import { maskBankAccount } from '../../../../utils/formatters';
import type { BankInfo, BankVerificationStatus } from '../../../../types/finance.types';

const { Title, Text } = Typography;

interface Props {
    bankInfo: BankInfo | null;
    verifyStatus: BankVerificationStatus | null;
    loading: boolean;
    onVerify: () => void;
    onUpdate: () => void;
}

const BankInfoCard: React.FC<Props> = ({ bankInfo, verifyStatus, loading, onVerify, onUpdate }) => {
    const isVerified = bankInfo?.isVerified;
    const isPending = verifyStatus?.isPending;

    if (!bankInfo && !loading) {
        return (
            <Card className="finance-card">
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Chưa có thông tin ngân hàng"
                >
                    <Button type="primary" icon={<BankOutlined />} onClick={onVerify}>
                        Thêm tài khoản ngay
                    </Button>
                </Empty>
            </Card>
        );
    }

    return (
        <Card
            className="finance-card"
            loading={loading}
            title={
                <Space>
                    <BankOutlined />
                    <span>Thông tin tài khoản nhận tiền</span>
                </Space>
            }
            extra={
                isVerified ? (
                    <Button type="link" icon={<EditOutlined />} onClick={onUpdate}>Thay đổi</Button>
                ) : null
            }
        >
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>{bankInfo?.bankName}</Title>
                    <Text strong style={{ fontSize: '18px' }}>{maskBankAccount(bankInfo?.accountNumber || '')}</Text>
                    <div style={{ marginTop: '4px' }}>
                        <Text type="secondary">{bankInfo?.accountHolderName}</Text>
                    </div>
                </div>
                <div>
                    {isVerified ? (
                        <Badge
                            count={
                                <Space style={{ background: '#f6ffed', border: '1px solid #b7eb8f', padding: '4px 12px', borderRadius: '20px' }}>
                                    <CheckCircleFilled style={{ color: '#52c41a' }} />
                                    <span style={{ color: '#52c41a', fontSize: '12px', fontWeight: 600 }}>ĐÃ XÁC THỰC</span>
                                </Space>
                            }
                        />
                    ) : isPending ? (
                        <Badge
                            count={
                                <Space style={{ background: '#fff7e6', border: '1px solid #ffd591', padding: '4px 12px', borderRadius: '20px' }}>
                                    <LoadingOutlined style={{ color: '#faad14' }} />
                                    <span style={{ color: '#faad14', fontSize: '12px', fontWeight: 600 }}>CHỜ XÁC THỰC</span>
                                </Space>
                            }
                        />
                    ) : (
                        <Badge
                            count={
                                <Space style={{ background: '#fff2f0', border: '1px solid #ffccc7', padding: '4px 12px', borderRadius: '20px' }}>
                                    <ExclamationCircleFilled style={{ color: '#ff4d4f' }} />
                                    <span style={{ color: '#ff4d4f', fontSize: '12px', fontWeight: 600 }}>CHƯA XÁC THỰC</span>
                                </Space>
                            }
                        />
                    )}
                </div>
            </div>

            {!isVerified && (
                <Alert
                    type={isPending ? "warning" : "error"}
                    message={isPending ? "Đang trong quá trình xác thực" : "Tài khoản chưa được xác thực"}
                    description={
                        <div style={{ marginTop: '8px' }}>
                            <p>Bạn cần xác thực tài khoản ngân hàng để có thể thực hiện rút tiền.</p>
                            <Button
                                type="primary"
                                danger={!isPending}
                                onClick={onVerify}
                                style={{ marginTop: '8px' }}
                            >
                                {isPending ? "Tiếp tục xác thực" : "Bắt đầu xác thực ngay"}
                            </Button>
                        </div>
                    }
                    showIcon
                />
            )}

            {isVerified && (
                <Descriptions column={1} size="small" style={{ marginTop: '16px' }}>
                    <Descriptions.Item label="Thời gian cập nhật">
                        {bankInfo?.bankChangedAt ? new Date(bankInfo.bankChangedAt).toLocaleDateString('vi-VN') : 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Hỗ trợ nhận tiền">Tức thì (24/7)</Descriptions.Item>
                </Descriptions>
            )}
        </Card>
    );
};

export default BankInfoCard;

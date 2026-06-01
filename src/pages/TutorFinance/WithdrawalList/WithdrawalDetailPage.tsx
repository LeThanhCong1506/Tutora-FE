import React, { useState, useEffect, useCallback } from 'react';
import { Card, Breadcrumb, Typography, Button, Descriptions, Steps, Alert, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeftOutlined,
    CloseCircleOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    SyncOutlined
} from '@ant-design/icons';
import { getWithdrawalDetail, cancelWithdrawal } from '../../../services/tutorFinance.service';
import type { WithdrawalDetail } from '../../../types/finance.types';
import { formatCurrency, formatDateTime, formatApprovalDecision, formatEstimatedTime } from '../../../utils/formatters';
import WithdrawalStatusBadge from './components/WithdrawalStatusBadge';
import CancelWithdrawalModal from './components/CancelWithdrawalModal';
import '../../../styles/pages/tutor-finance.css';
import { toast } from 'react-toastify';

const { Title, Text, Paragraph } = Typography;

const WithdrawalDetailPage: React.FC = () => {
    const { id: idStr } = useParams<{ id: string }>();
    const id = idStr ? parseInt(idStr) : 0;
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [withdrawal, setWithdrawal] = useState<WithdrawalDetail | null>(null);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    const fetchDetail = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await getWithdrawalDetail(id);
            setWithdrawal(data);
        } catch (error) {
            console.error('Failed to fetch withdrawal detail:', error);
            toast.error('Không thể tải thông tin chi tiết yêu cầu rút tiền');
            navigate('/tutor-portal/finance/withdrawals');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    const handleCancelWithdrawal = async () => {
        if (!id) return;
        setCancelling(true);
        try {
            await cancelWithdrawal(id);
            toast.success('Đã hủy yêu cầu rút tiền thành công');
            setIsCancelModalOpen(false);
            fetchDetail();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể hủy yêu cầu này');
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px' }}>
                <Spin size="large" tip="Đang tải thông tin..." />
            </div>
        );
    }

    if (!withdrawal) return null;

    const currentStep =
        withdrawal.status === 'Pending' ? 0 :
            withdrawal.status === 'Approved' ? 1 :
                withdrawal.status === 'Completed' ? 2 : 0;

    return (
        <div className="tutor-finance-container">
            <div className="finance-header">
                <Breadcrumb
                    items={[
                        { title: <a onClick={() => navigate('/tutor-portal/finance')}>Tài chính</a> },
                        { title: <a onClick={() => navigate('/tutor-portal/finance/withdrawals')}>Lịch sử rút tiền</a> },
                        { title: `Yêu cầu #${id}` },
                    ]}
                    style={{ marginBottom: '16px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <Title level={2}>Chi tiết yêu cầu rút tiền</Title>
                        <Text type="secondary">Mã yêu cầu: #{id}</Text>
                    </div>
                    {withdrawal.status === 'Pending' && (
                        <Button danger icon={<CloseCircleOutlined />} onClick={() => setIsCancelModalOpen(true)}>
                            Hủy yêu cầu
                        </Button>
                    )}
                </div>
            </div>

            <div className="withdrawal-detail-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                <div className="detail-main">
                    <Card
                        title="Trạng thái xử lý"
                        style={{ marginBottom: '24px' }}
                        extra={<WithdrawalStatusBadge status={withdrawal.status} />}
                    >
                        <Steps
                            current={withdrawal.status === 'Rejected' || withdrawal.status === 'Cancelled' ? -1 : currentStep}
                            status={withdrawal.status === 'Rejected' || withdrawal.status === 'Cancelled' ? 'error' : 'process'}
                            items={[
                                { title: 'Chờ duyệt', icon: <ClockCircleOutlined /> },
                                { title: 'Đang xử lý', icon: <SyncOutlined spin={withdrawal.status === 'Approved'} /> },
                                { title: 'Hoàn tất', icon: <CheckCircleOutlined /> },
                            ]}
                        />

                        {withdrawal.status === 'Rejected' && (
                            <Alert
                                type="error"
                                showIcon
                                message="Yêu cầu bị từ chối"
                                description={
                                    <div>
                                        <Paragraph strong style={{ margin: 0 }}>Lý do: {withdrawal.adminNote || 'Không có lý do cụ thể'}</Paragraph>
                                        <Text type="secondary">Số tiền đã được hoàn lại vào số dư khả dụng của bạn.</Text>
                                    </div>
                                }
                                style={{ marginTop: '24px' }}
                            />
                        )}

                        {withdrawal.status === 'Approved' && (
                            <Alert
                                type="info"
                                showIcon
                                message="Đã được phê duyệt"
                                description={`Yêu cầu đã được quản trị viên phê duyệt và đang được hệ thống chuyển tiền. Thời gian nhận tiền dự kiến: ${formatEstimatedTime('Approved')}.`}
                                style={{ marginTop: '24px' }}
                            />
                        )}
                    </Card>

                    <Card title="Thông tin giao dịch">
                        <Descriptions column={1} bordered>
                            <Descriptions.Item label="Số tiền rút">
                                <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>{formatCurrency(withdrawal.amount)}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Thời gian yêu cầu">{formatDateTime(withdrawal.requestedAt)}</Descriptions.Item>
                            {withdrawal.processedAt && (
                                <Descriptions.Item label="Thời gian xử lý">{formatDateTime(withdrawal.processedAt)}</Descriptions.Item>
                            )}
                            <Descriptions.Item label="Phí giao dịch">Miễn phí</Descriptions.Item>
                        </Descriptions>
                    </Card>
                </div>

                <div className="detail-sidebar">
                    <Card title="Tài khoản nhận tiền" style={{ marginBottom: '24px' }}>
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="Ngân hàng">{withdrawal.bankName}</Descriptions.Item>
                            <Descriptions.Item label="Số tài khoản">{withdrawal.accountNumber}</Descriptions.Item>
                            <Descriptions.Item label="Chủ tài khoản">{withdrawal.accountHolderName}</Descriptions.Item>
                        </Descriptions>
                    </Card>

                    <Card title="Lịch sử thay đổi">
                        <div style={{ fontSize: '12px', color: '#888' }}>
                            <div>• {formatDateTime(withdrawal.requestedAt)}: Tạo yêu cầu rút tiền.</div>
                            {withdrawal.status === 'Approved' && (
                                <div>• {withdrawal.processedAt ? formatDateTime(withdrawal.processedAt) : 'Vừa xong'}: Quyết định: {formatApprovalDecision('Approved')}.</div>
                            )}
                            {withdrawal.status === 'Completed' && (
                                <>
                                    <div>• {withdrawal.processedAt ? formatDateTime(withdrawal.processedAt) : '...'}: Quyết định: {formatApprovalDecision('Approved')}.</div>
                                    <div>• {withdrawal.processedAt ? formatDateTime(withdrawal.processedAt) : '...'}: Hệ thống xác nhận chuyển tiền thành công.</div>
                                </>
                            )}
                            {withdrawal.status === 'Rejected' && (
                                <div>• {withdrawal.processedAt ? formatDateTime(withdrawal.processedAt) : '...'}: Quyết định: {formatApprovalDecision('Rejected')}.</div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            <CancelWithdrawalModal
                open={isCancelModalOpen}
                withdrawalId={withdrawal.withdrawalId.toString()}
                amount={withdrawal.amount}
                loading={cancelling}
                onConfirm={handleCancelWithdrawal}
                onCancel={() => setIsCancelModalOpen(false)}
            />

            <div style={{ marginTop: '24px' }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tutor-portal/finance/withdrawals')}>
                    Quay lại danh sách
                </Button>
            </div>
        </div>
    );
};

export default WithdrawalDetailPage;

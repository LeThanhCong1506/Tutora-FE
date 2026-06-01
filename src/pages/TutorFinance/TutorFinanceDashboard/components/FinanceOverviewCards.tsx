import React from 'react';
import { Card, Tooltip } from 'antd';
import { InfoCircleOutlined, WalletOutlined, LockOutlined, RiseOutlined, HistoryOutlined } from '@ant-design/icons';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import type { FinanceSummary } from '../../../../types/finance.types';

interface Props {
    summary: FinanceSummary | null;
    loading: boolean;
}

const FinanceOverviewCards: React.FC<Props> = ({ summary, loading }) => {
    return (
        <div className="overview-cards-row">
            <Card className="finance-card" loading={loading}>
                <div className="card-label">
                    <WalletOutlined style={{ color: '#52c41a' }} />
                    <span>Số dư khả dụng</span>
                    <Tooltip title="Số tiền bạn có thể rút ngay lập tức">
                        <InfoCircleOutlined style={{ fontSize: '12px', cursor: 'help' }} />
                    </Tooltip>
                </div>
                <div className="card-value" style={{ color: '#52c41a' }}>
                    {formatCurrency(summary?.balance || 0)}
                </div>
                <div className="card-footer">
                    Cập nhật lúc: {formatDate(new Date().toISOString())}
                </div>
            </Card>

            <Card className="finance-card" loading={loading}>
                <div className="card-label">
                    <HistoryOutlined style={{ color: '#faad14' }} />
                    <span>Đang chờ quyết toán</span>
                    <Tooltip title="Tiền từ các buổi học vừa hoàn thành, đang trong thời gian đối soát">
                        <InfoCircleOutlined style={{ fontSize: '12px', cursor: 'help' }} />
                    </Tooltip>
                </div>
                <div className="card-value">
                    {formatCurrency(summary?.pendingSettlement || 0)}
                </div>
                <div className="card-footer">
                    Chờ xử lý từ hệ thống
                </div>
            </Card>

            <Card className="finance-card" loading={loading}>
                <div className="card-label">
                    <LockOutlined style={{ color: '#ff4d4f' }} />
                    <span>Đang tạm giữ</span>
                    <Tooltip title="Số tiền bị tạm giữ do khiếu nại hoặc chính sách bảo mật">
                        <InfoCircleOutlined style={{ fontSize: '12px', cursor: 'help' }} />
                    </Tooltip>
                </div>
                <div className="card-value" style={{ color: '#ff4d4f' }}>
                    {formatCurrency(summary?.frozenBalance || 0)}
                </div>
                <div className="card-footer">
                    Tiền ký quỹ (Escrow)
                </div>
            </Card>

            <Card className="finance-card" loading={loading}>
                <div className="card-label">
                    <RiseOutlined style={{ color: '#1890ff' }} />
                    <span>Tổng thu nhập</span>
                </div>
                <div className="card-value">
                    {formatCurrency(summary?.totalEarned || 0)}
                </div>
                <div className="card-footer">
                    Tổng tích lũy từ trước đến nay
                </div>
            </Card>
        </div>
    );
};

export default FinanceOverviewCards;

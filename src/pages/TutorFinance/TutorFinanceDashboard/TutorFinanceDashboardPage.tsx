import React, { useState, useEffect } from 'react';
import { Button, Table, Badge } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
    PlusOutlined,
    HistoryOutlined,
    BankOutlined,
    ArrowRightOutlined,
    WalletOutlined
} from '@ant-design/icons';
import { getFinanceSummary, getTransactions } from '../../../services/tutorFinance.service';
import { formatCurrency, formatDateTime, formatTransactionType } from '../../../utils/formatters';
import type { FinanceSummary, TutorTransaction } from '../../../types/finance.types';
import FinanceOverviewCards from './components/FinanceOverviewCards';
import EarningsChart from './components/EarningsChart';
import '../../../styles/pages/tutor-finance.css';
import { toast } from 'react-toastify';

const TutorFinanceDashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const [summary, setSummary] = useState<FinanceSummary | null>(null);
    const [recentTransactions, setRecentTransactions] = useState<TutorTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const [summaryRes, transRes] = await Promise.all([
                    getFinanceSummary(),
                    getTransactions({ page: 1, pageSize: 5 })
                ]);
                setSummary(summaryRes);
                setRecentTransactions(transRes.transactions);
            } catch (error) {
                console.error('Failed to fetch finance dashboard data:', error);
                toast.error('Không thể tải dữ liệu tổng quan tài chính');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const columns = [
        {
            title: 'Ngày',
            dataIndex: 'createdAt',
            render: (text: string) => formatDateTime(text),
        },
        {
            title: 'Loại',
            dataIndex: 'transactionType',
            render: (type: string) => (
                <Badge status={type === 'Withdrawal' ? 'error' : 'success'} text={formatTransactionType(type)} />
            ),
        },
        {
            title: 'Số tiền',
            dataIndex: 'amount',
            render: (amount: number, record: TutorTransaction) => (
                <span style={{ color: record.amount < 0 ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>
                    {record.amount > 0 ? '+' : ''}{formatCurrency(amount)}
                </span>
            ),
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            ellipsis: true,
        }
    ];

    return (
        <div className="tutor-finance-container">
            <div className="finance-header">
                <h1>Tài chính của tôi</h1>
                <p style={{ color: '#666' }}>Quản lý thu nhập, rút tiền và lịch sử giao dịch của bạn</p>
            </div>

            <FinanceOverviewCards summary={summary} loading={loading} />

            <div className="quick-actions-bar">
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    onClick={() => navigate('/tutor-portal/finance/withdraw')}
                    disabled={!summary || summary.balance < 100000}
                >
                    Rút tiền
                </Button>
                <Button
                    icon={<WalletOutlined />}
                    size="large"
                    style={{ color: '#52c41a', borderColor: '#52c41a' }}
                    onClick={() => toast.info('Tính năng Nạp tiền đang được phát triển. Vui lòng quay lại sau!')}
                >
                    Nạp tiền
                </Button>
                <Button
                    icon={<HistoryOutlined />}
                    size="large"
                    onClick={() => navigate('/tutor-portal/finance/transactions')}
                >
                    Lịch sử giao dịch
                </Button>
                <Button
                    icon={<BankOutlined />}
                    size="large"
                    onClick={() => toast.info('Tính năng Tài khoản ngân hàng đang được phát triển. Vui lòng quay lại sau!')}
                >
                    Tài khoản ngân hàng
                </Button>
            </div>

            <div className="dashboard-grid">
                <EarningsChart />

                <div className="recent-transactions-section">
                    <div className="section-title">
                        <span>Giao dịch gần đây</span>
                        <Button
                            type="link"
                            onClick={() => navigate('/tutor-portal/finance/transactions')}
                            style={{ padding: 0 }}
                        >
                            Xem tất cả <ArrowRightOutlined />
                        </Button>
                    </div>
                    <Table
                        dataSource={recentTransactions}
                        columns={columns}
                        pagination={false}
                        loading={loading}
                        rowKey="transactionId"
                        size="small"
                        scroll={{ x: 'max-content' }}
                    />
                </div>
            </div>
        </div>
    );
};

export default TutorFinanceDashboardPage;

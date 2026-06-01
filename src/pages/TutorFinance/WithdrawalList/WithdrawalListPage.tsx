import React, { useState, useEffect, useCallback } from 'react';
import { Table, Card, Typography, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { EyeOutlined, SyncOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { getWithdrawals } from '../../../services/tutorFinance.service';
import type { WithdrawalItem } from '../../../types/finance.types';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';
import WithdrawalStatusBadge from './components/WithdrawalStatusBadge';
import '../../../styles/pages/tutor-finance.css';
import { toast } from 'react-toastify';

const { Title, Text } = Typography;

const WithdrawalListPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<WithdrawalItem[]>([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const fetchWithdrawals = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getWithdrawals(currentPage, pageSize);
            setData(response.items);
            setTotal(response.total);
        } catch (error) {
            console.error('Failed to fetch withdrawals:', error);
            toast.error('Không thể tải danh sách yêu cầu rút tiền');
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize]);

    useEffect(() => {
        fetchWithdrawals();
    }, [fetchWithdrawals]);

    const columns = [
        {
            title: 'Mã yêu cầu',
            dataIndex: 'withdrawalId',
            key: 'withdrawalId',
            render: (id: string) => <Text strong>#{id}</Text>,
        },
        {
            title: 'Ngày yêu cầu',
            dataIndex: 'requestedAt',
            key: 'requestedAt',
            render: (date: string) => formatDateTime(date),
        },
        {
            title: 'Số tiền',
            dataIndex: 'amount',
            key: 'amount',
            render: (amount: number) => <Text strong>{formatCurrency(amount)}</Text>,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => <WithdrawalStatusBadge status={status} />,
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_: unknown, record: WithdrawalItem) => (
                <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/tutor-portal/finance/withdrawals/${record.withdrawalId}`)}
                >
                    Chi tiết
                </Button>
            ),
        },
    ];

    return (
        <div className="tutor-finance-container">
            <div className="finance-header">
                <div style={{ marginBottom: '16px' }}>
                    <Button 
                        type="text" 
                        icon={<ArrowLeftOutlined />} 
                        onClick={() => navigate('/tutor-portal/finance')}
                        style={{ padding: '4px 8px', marginLeft: '-8px', fontSize: '15px', color: '#4b5563', display: 'inline-flex', alignItems: 'center', fontWeight: 500 }}
                    >
                        Quay lại
                    </Button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <Title level={2}>Lịch sử rút tiền</Title>
                        <Text type="secondary">Theo dõi trạng thái các yêu cầu rút tiền của bạn</Text>
                    </div>
                    <Button icon={<SyncOutlined />} onClick={() => fetchWithdrawals()} loading={loading}>
                        Làm mới
                    </Button>
                </div>
            </div>

            <Card bodyStyle={{ padding: 0 }}>
                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey="withdrawalId"
                    loading={loading}
                    scroll={{ x: 'max-content' }}
                    pagination={{
                        current: currentPage,
                        pageSize: pageSize,
                        total: total,
                        onChange: (page, size) => {
                            setCurrentPage(page);
                            setPageSize(size);
                        },
                        showTotal: (total) => `Tổng cộng ${total} yêu cầu`,
                    }}
                />
            </Card>

        </div>
    );
};

export default WithdrawalListPage;

import React, { useState, useEffect, useCallback } from 'react';
import { Card, DatePicker, Select, Space, Button, Typography } from 'antd';
import { DownloadOutlined, FilterOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { getTransactions } from '../../../services/tutorFinance.service';
import type { TutorTransaction } from '../../../types/finance.types';
import TransactionTable from './components/TransactionTable';
import '../../../styles/pages/tutor-finance.css';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const TransactionHistoryPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<TutorTransaction[]>([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const [filters, setFilters] = useState({
        type: undefined as string | undefined,
        dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null,
    });

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                pageSize,
                type: filters.type,
                from: filters.dateRange ? filters.dateRange[0].startOf('day').toISOString() : undefined,
                to: filters.dateRange ? filters.dateRange[1].endOf('day').toISOString() : undefined,
            };

            const response = await getTransactions(params);
            setData(response.transactions);
            setTotal(response.totalCount);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, filters]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const handleFilterChange = (type: string | undefined) => {
        setFilters(prev => ({ ...prev, type }));
        setCurrentPage(1);
    };

    const handleDateChange = (dates: any) => {
        setFilters(prev => ({ ...prev, dateRange: dates }));
        setCurrentPage(1);
    };

    const handlePageChange = (page: number, size: number) => {
        setCurrentPage(page);
        setPageSize(size);
    };

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <Title level={2}>Lịch sử giao dịch</Title>
                        <Text type="secondary">Danh sách tất cả các biến động số dư trong tài khoản của bạn</Text>
                    </div>
                    <Button icon={<DownloadOutlined />} onClick={() => toast.info('Chức năng xuất CSV đang được phát triển')}>Xuất CSV</Button>
                </div>
            </div>

            <Card style={{ marginBottom: '24px' }} bodyStyle={{ padding: '16px' }}>
                <Space wrap size="middle">
                    <div>
                        <span style={{ marginRight: '8px', fontWeight: 500 }}>Loại:</span>
                        <Select
                            placeholder="Tất cả loại"
                            style={{ width: 160 }}
                            allowClear
                            onChange={handleFilterChange}
                            options={[
                                { label: 'Nạp tiền', value: 'Deposit' },
                                { label: 'Rút tiền', value: 'Withdrawal' },
                                { label: 'Giữ tiền', value: 'EscrowCredit' },
                                { label: 'Giải phóng', value: 'EscrowRelease' },
                                { label: 'Hoàn tiền', value: 'Refund' },
                            ]}
                        />
                    </div>
                    <div>
                        <span style={{ marginRight: '8px', fontWeight: 500 }}>Thời gian:</span>
                        <RangePicker
                            onChange={handleDateChange}
                            placeholder={['Từ ngày', 'Đến ngày']}
                        />
                    </div>
                    <Button icon={<FilterOutlined />} onClick={() => fetchTransactions()}>Lọc</Button>
                </Space>
            </Card>

            <Card bodyStyle={{ padding: 0 }}>
                <TransactionTable
                    transactions={data}
                    loading={loading}
                    total={total}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                />
            </Card>

        </div>
    );
};

export default TransactionHistoryPage;

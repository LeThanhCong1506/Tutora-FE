import React from 'react';
import { Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { formatCurrency, formatDateTime, formatTransactionType } from '../../../../utils/formatters';
import type { TutorTransaction } from '../../../../types/finance.types';

interface Props {
    transactions: TutorTransaction[];
    loading: boolean;
    total: number;
    pageSize: number;
    currentPage: number;
    onPageChange: (page: number, pageSize: number) => void;
}

const TransactionTable: React.FC<Props> = ({
    transactions,
    loading,
    total,
    pageSize,
    currentPage,
    onPageChange
}) => {
    const columns: ColumnsType<TutorTransaction> = [
        {
            title: 'Mã giao dịch',
            dataIndex: 'transactionId',
            key: 'transactionId',
            width: 120,
            render: (id) => <span style={{ fontWeight: 500 }}>#{id}</span>,
        },
        {
            title: 'Ngày giao dịch',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 180,
            render: (date) => formatDateTime(date),
        },
        {
            title: 'Loại',
            dataIndex: 'transactionType',
            key: 'transactionType',
            width: 150,
            render: (type) => {
                let color = 'default';
                if (type === 'Deposit') color = 'green';
                if (type === 'Withdrawal') color = 'volcano';
                if (type === 'Refund') color = 'blue';
                if (type === 'Escrow' || type === 'EscrowCredit') color = 'orange';
                if (type === 'Release' || type === 'EscrowRelease') color = 'cyan';

                return <Tag color={color}>{formatTransactionType(type)}</Tag>;
            },
        },
        {
            title: 'Số tiền',
            dataIndex: 'amount',
            key: 'amount',
            width: 150,
            render: (amount) => (
                <span style={{
                    color: amount < 0 ? '#ff4d4f' : '#52c41a',
                    fontWeight: 600,
                    fontSize: '15px'
                }}>
                    {amount > 0 ? '+' : ''}{formatCurrency(amount)}
                </span>
            ),
        },
        {
            title: 'Nội dung',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
        {
            title: 'Tham chiếu',
            key: 'reference',
            width: 150,
            render: (_, record) => (
                <span style={{ color: '#888', fontSize: '12px' }}>
                    {record.referenceTable ? `${record.referenceTable} #${record.referenceId}` : 'Hệ thống'}
                </span>
            ),
        },
    ];

    return (
        <Table
            columns={columns}
            dataSource={transactions}
            rowKey="transactionId"
            loading={loading}
            scroll={{ x: 'max-content' }}
            pagination={{
                total,
                pageSize,
                current: currentPage,
                onChange: onPageChange,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50'],
                showTotal: (total) => `Tổng cộng ${total} giao dịch`,
            }}
        />
    );
};

export default TransactionTable;

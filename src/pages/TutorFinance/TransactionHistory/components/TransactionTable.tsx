import React from 'react';
import { Empty, Table, Tag } from 'antd';
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

const TransactionTable: React.FC<Props> = ({ transactions, loading, total, pageSize, currentPage, onPageChange }) => {
  const getTransactionTone = (type: string) => {
    if (type === 'Withdrawal') return 'debit';
    if (type === 'Refund') return 'refund';
    if (type === 'Escrow' || type === 'EscrowCredit') return 'pending';
    if (type === 'Release' || type === 'EscrowRelease') return 'release';
    return 'credit';
  };

  const columns: ColumnsType<TutorTransaction> = [
    {
      title: 'Mã giao dịch',
      dataIndex: 'transactionId',
      key: 'transactionId',
      width: 130,
      render: (id) => <span className="finance-table-id">#{id}</span>,
    },
    {
      title: 'Ngày giao dịch',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date) => <span className="finance-table-date">{formatDateTime(date)}</span>,
    },
    {
      title: 'Loại',
      dataIndex: 'transactionType',
      key: 'transactionType',
      width: 150,
      render: (type) => (
        <Tag className={`finance-type-tag finance-type-tag--${getTransactionTone(type)}`}>
          {formatTransactionType(type)}
        </Tag>
      ),
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 170,
      render: (amount) => (
        <span className={`finance-table-amount finance-table-amount--${amount < 0 ? 'debit' : 'credit'}`}>
          {amount > 0 ? '+' : ''}
          {formatCurrency(amount)}
        </span>
      ),
    },
    {
      title: 'Nội dung',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 280,
    },
    {
      title: 'Tham chiếu',
      key: 'reference',
      width: 170,
      responsive: ['lg'],
      render: (_, record) => (
        <span className="finance-table-reference">
          {record.referenceTable ? `${record.referenceTable} #${record.referenceId}` : 'Hệ thống'}
        </span>
      ),
    },
  ];

  return (
    <Table
      className="finance-data-table"
      columns={columns}
      dataSource={transactions}
      rowKey="transactionId"
      loading={loading}
      size="middle"
      scroll={{ x: 900 }}
      locale={{
        emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có giao dịch phù hợp" />,
      }}
      pagination={{
        total,
        pageSize,
        current: currentPage,
        onChange: onPageChange,
        showSizeChanger: total > 10,
        pageSizeOptions: ['10', '20', '50'],
        showTotal: (total) => `Tổng cộng ${total} giao dịch`,
        showLessItems: true,
      }}
    />
  );
};

export default TransactionTable;

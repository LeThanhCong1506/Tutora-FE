import { Empty, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { formatCurrency, formatDateTime, formatTransactionChannel, formatTransactionType } from '../../utils/formatters';

/** Dùng chung cho Tutor (`TutorTransaction`) và Parent/Student (`TransactionHistory`) — cùng field shape. */
export interface FinanceTransactionRow {
  transactionId: number;
  amount: number;
  transactionType: string;
  description: string;
  referenceId: number | null;
  referenceTable: string | null;
  createdAt: string;
  source?: string;
  channel?: string;
  isInformational?: boolean;
  bankName?: string | null;
  accountNumber?: string | null;
}

interface Props<T extends FinanceTransactionRow> {
  transactions: T[];
  loading: boolean;
  total: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number, pageSize: number) => void;
  onRowClick?: (row: T) => void;
  /** Chiều cao vùng cuộn của danh sách, dùng ở trang lịch sử giao dịch đầy đủ. */
  scrollY?: number | string;
}

const TransactionTable = <T extends FinanceTransactionRow>({
  transactions,
  loading,
  total,
  pageSize,
  currentPage,
  onPageChange,
  onRowClick,
  scrollY,
}: Props<T>) => {
  const getTransactionTone = (type: string) => {
    if (type === 'Withdrawal') return 'debit';
    if (type === 'Refund') return 'refund';
    if (type === 'Escrow' || type === 'EscrowCredit') return 'pending';
    if (type === 'Release' || type === 'EscrowRelease') return 'release';
    if (type === 'BankTransfer') return 'bank';
    return 'credit';
  };

  const getRowKey = (row: T) => `${row.source ?? 'Wallet'}-${row.transactionId}`;

  const columns: ColumnsType<T> = [
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
      title: 'Hình thức',
      dataIndex: 'channel',
      key: 'channel',
      width: 130,
      render: (_, record) => (
        <span className="finance-table-channel">{formatTransactionChannel(record.channel)}</span>
      ),
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 170,
      render: (amount, record) =>
        record.isInformational ? (
          <Tooltip title="Số tiền đã được chuyển về tài khoản ngân hàng của bạn. Số dư ví đã trừ từ lúc tạo yêu cầu rút nên dòng này không làm thay đổi số dư.">
            <span className="finance-table-amount finance-table-amount--informational">
              {formatCurrency(amount)}
            </span>
          </Tooltip>
        ) : (
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
      render: (_, record) => {
        if (record.channel === 'Bank' && record.bankName) {
          return (
            <span className="finance-table-reference">
              {record.bankName}
              {record.accountNumber ? ` · ${record.accountNumber}` : ''}
            </span>
          );
        }

        return (
          <span className="finance-table-reference">
            {record.referenceTable ? `${record.referenceTable} #${record.referenceId}` : 'Hệ thống'}
          </span>
        );
      },
    },
  ];

  return (
    <Table
      className="finance-data-table"
      columns={columns}
      dataSource={transactions}
      rowKey={getRowKey}
      loading={loading}
      size="middle"
      scroll={{ x: 900, ...(scrollY ? { y: scrollY } : {}) }}
      onRow={
        onRowClick
          ? (record) => {
              if (record.source === 'Payment') return {};
              return { onClick: () => onRowClick(record), style: { cursor: 'pointer' } };
            }
          : undefined
      }
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

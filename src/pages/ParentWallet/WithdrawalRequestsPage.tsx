import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Empty, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, SyncOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getWithdrawals, type WithdrawalItem } from '../../services/wallet.service';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import FinanceShell from './components/FinanceShell';
import WithdrawalStatusBadge from '../../components/Finance/WithdrawalStatusBadge';
import '../../styles/pages/tutor-finance.css';

const WithdrawalRequestsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const portalBase = useMemo(
    () => (location.pathname.startsWith('/student-portal') ? '/student-portal' : '/parent-portal'),
    [location.pathname],
  );

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WithdrawalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWithdrawals(currentPage, pageSize);
      setData(res.content.items);
      setTotal(res.content.total);
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error);
      toast.error('Không thể tải danh sách yêu cầu rút tiền');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    void fetchWithdrawals();
  }, [fetchWithdrawals]);

  const columns: ColumnsType<WithdrawalItem> = [
    {
      title: 'Mã yêu cầu',
      dataIndex: 'withdrawalId',
      key: 'withdrawalId',
      width: 150,
      render: (id: number) => <span className="finance-table-id">#{id}</span>,
    },
    {
      title: 'Ngày yêu cầu',
      dataIndex: 'requestedAt',
      key: 'requestedAt',
      width: 210,
      render: (date: string) => <span className="finance-table-date">{formatDateTime(date)}</span>,
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 190,
      render: (amount: number) => (
        <span className="finance-table-amount finance-table-amount--neutral">{formatCurrency(amount)}</span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 190,
      render: (status: string) => <WithdrawalStatusBadge status={status} />,
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'right',
      width: 140,
      render: (_: unknown, record: WithdrawalItem) => (
        <Button
          type="link"
          className="finance-text-action"
          icon={<EyeOutlined />}
          onClick={() => navigate(`${portalBase}/wallet/withdrawals/${record.withdrawalId}`)}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <FinanceShell
      title="Lịch sử rút tiền"
      subtitle="Theo dõi tiến độ xét duyệt và chuyển khoản của từng yêu cầu bạn đã gửi."
      actions={
        <Button size="large" icon={<SyncOutlined />} onClick={fetchWithdrawals} loading={loading}>
          Làm mới
        </Button>
      }
    >
      <section className="finance-surface finance-table-surface" aria-label="Danh sách yêu cầu rút tiền">
        <div className="finance-table-heading">
          <div>
            <h2>Các yêu cầu của bạn</h2>
            <p>{total > 0 ? `${total.toLocaleString('vi-VN')} yêu cầu rút tiền` : 'Chưa có yêu cầu rút tiền'}</p>
          </div>
        </div>

        <Table
          className="finance-data-table"
          columns={columns}
          dataSource={data}
          rowKey="withdrawalId"
          loading={loading}
          size="middle"
          scroll={{ x: 820 }}
          locale={{
            emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bạn chưa tạo yêu cầu rút tiền nào" />,
          }}
          pagination={{
            current: currentPage,
            pageSize,
            total,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
            showSizeChanger: total > 10,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (count) => `Tổng cộng ${count} yêu cầu`,
            showLessItems: true,
          }}
        />
      </section>
    </FinanceShell>
  );
};

export default WithdrawalRequestsPage;

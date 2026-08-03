import React, { useCallback, useEffect, useState } from 'react';
import { Button, Empty, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, SyncOutlined, WalletOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getWithdrawals } from '../../../services/tutorFinance.service';
import type { WithdrawalItem } from '../../../types/finance.types';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';
import FinancePageShell from '../components/FinancePageShell';
import WithdrawalStatusBadge from './components/WithdrawalStatusBadge';
import '../../../styles/pages/tutor-finance.css';

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
          onClick={() => navigate(`/tutor-portal/finance/withdrawals/${record.withdrawalId}`)}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <FinancePageShell
      title="Lịch sử rút tiền"
      subtitle="Theo dõi tiến độ xét duyệt và chuyển khoản của từng yêu cầu."
      actions={
        <>
          <Button size="large" icon={<SyncOutlined />} onClick={fetchWithdrawals} loading={loading}>
            Làm mới
          </Button>
          <Button
            type="primary"
            size="large"
            className="finance-primary-action"
            icon={<WalletOutlined />}
            onClick={() => navigate('/tutor-portal/finance/withdraw')}
          >
            Tạo yêu cầu
          </Button>
        </>
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
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bạn chưa tạo yêu cầu rút tiền nào">
                <Button
                  type="primary"
                  className="finance-primary-action"
                  onClick={() => navigate('/tutor-portal/finance/withdraw')}
                >
                  Tạo yêu cầu đầu tiên
                </Button>
              </Empty>
            ),
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
    </FinancePageShell>
  );
};

export default WithdrawalListPage;

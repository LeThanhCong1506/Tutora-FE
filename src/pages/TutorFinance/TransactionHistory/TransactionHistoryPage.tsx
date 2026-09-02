import React, { useCallback, useEffect, useState } from 'react';
import { Button, DatePicker, Select } from 'antd';
import { DownloadOutlined, ReloadOutlined, SyncOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '../../../utils/apiError';
import dayjs, { type Dayjs } from 'dayjs';
import { getTransactions } from '../../../services/tutorFinance.service';
import type { TutorTransaction } from '../../../types/finance.types';
import FinancePageShell from '../components/FinancePageShell';
import TransactionTable from '../../../components/Finance/TransactionTable';
import '../../../styles/pages/tutor-finance.css';

const { RangePicker } = DatePicker;

const TransactionHistoryPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TutorTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [filters, setFilters] = useState<{
    type?: string;
    dateRange: [Dayjs, Dayjs] | null;
  }>({
    type: undefined,
    dateRange: null,
  });

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        pageSize,
        type: filters.type,
        from: filters.dateRange?.[0].startOf('day').toISOString(),
        to: filters.dateRange?.[1].endOf('day').toISOString(),
      };

      const response = await getTransactions(params);
      setData(response.transactions);
      setTotal(response.totalCount);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error(getApiErrorMessage(error, 'Không thể tải lịch sử giao dịch'));
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filters]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleFilterChange = (type: string | undefined) => {
    setFilters((previous) => ({ ...previous, type }));
    setCurrentPage(1);
  };

  const handleDateChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    setFilters((previous) => ({
      ...previous,
      dateRange: dates?.[0] && dates[1] ? [dates[0], dates[1]] : null,
    }));
    setCurrentPage(1);
  };

  const handlePageChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  const clearFilters = () => {
    setFilters({ type: undefined, dateRange: null });
    setCurrentPage(1);
  };

  const hasFilters = Boolean(filters.type || filters.dateRange);

  return (
    <FinancePageShell
      title="Lịch sử giao dịch"
      titleInfo="Tra cứu toàn bộ khoản thu, khoản rút và các biến động số dư trong ví."
      actions={
        <Button
          size="large"
          icon={<DownloadOutlined />}
          onClick={() => toast.info('Chức năng xuất CSV đang được phát triển')}
        >
          Xuất CSV
        </Button>
      }
    >
      <section className="finance-surface finance-table-surface" aria-label="Danh sách giao dịch">
        <div className="finance-table-filter-toolbar" aria-label="Bộ lọc giao dịch">
          <div className="finance-filter-grid">
            <label className="finance-field">
              <span>Loại giao dịch</span>
              <Select
                aria-label="Loại giao dịch"
                value={filters.type}
                placeholder="Tất cả loại giao dịch"
                size="large"
                allowClear
                onChange={handleFilterChange}
                options={[
                  {
                    label: 'Giao dịch ví',
                    title: 'Giao dịch ví',
                    options: [
                      { label: 'Nạp tiền', value: 'Deposit' },
                      { label: 'Rút tiền', value: 'Withdrawal' },
                      { label: 'Giải phóng', value: 'EscrowRelease' },
                      { label: 'Hoàn tiền', value: 'Refund' },
                    ],
                  },
                  {
                    label: 'Ngân hàng',
                    title: 'Ngân hàng',
                    options: [{ label: 'Chuyển tiền ngân hàng', value: 'BankTransfer' }],
                  },
                  {
                    label: 'Escrow (chưa ảnh hưởng số dư ví)',
                    title: 'Escrow (chưa ảnh hưởng số dư ví)',
                    options: [
                      { label: 'Escrow: Đang giữ', value: 'EscrowCredit' },
                      { label: 'Escrow: Hoàn/Hủy', value: 'EscrowReversal' },
                    ],
                  },
                ]}
              />
            </label>

            <label className="finance-field finance-field--date">
              <span>Khoảng thời gian</span>
              <RangePicker
                aria-label="Khoảng thời gian giao dịch"
                value={filters.dateRange}
                size="large"
                onChange={handleDateChange}
                placeholder={['Từ ngày', 'Đến ngày']}
                disabledDate={(current) => current && current > dayjs().endOf('day')}
                format="DD/MM/YYYY"
              />
            </label>
          </div>
          <Button type="text" icon={<ReloadOutlined />} onClick={clearFilters} disabled={!hasFilters}>
            Đặt lại
          </Button>
        </div>

        <div className="finance-table-heading">
          <div>
            <p>
              {total > 0 ? `${total.toLocaleString('vi-VN')} giao dịch được tìm thấy` : 'Chưa có giao dịch phù hợp'}
            </p>
          </div>
          <Button icon={<SyncOutlined />} onClick={fetchTransactions} loading={loading}>
            Làm mới
          </Button>
        </div>

        <TransactionTable
          transactions={data}
          loading={loading}
          total={total}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      </section>
    </FinancePageShell>
  );
};

export default TransactionHistoryPage;

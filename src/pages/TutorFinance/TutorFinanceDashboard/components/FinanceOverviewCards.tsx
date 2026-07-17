import React from 'react';
import { Card, Tooltip } from 'antd';
import { HistoryOutlined, InfoCircleOutlined, LockOutlined, RiseOutlined, WalletOutlined } from '@ant-design/icons';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import type { FinanceSummary } from '../../../../types/finance.types';

interface Props {
  summary: FinanceSummary | null;
  loading: boolean;
}

const FinanceOverviewCards: React.FC<Props> = ({ summary, loading }) => {
  const metrics = [
    {
      key: 'pending',
      label: 'Chờ quyết toán',
      value: summary?.pendingSettlement ?? 0,
      note: 'Thu nhập đang được hệ thống đối soát',
      tooltip: 'Tiền từ các buổi học vừa hoàn thành, đang trong thời gian đối soát',
      icon: <HistoryOutlined />,
      tone: 'amber',
    },
    {
      key: 'frozen',
      label: 'Đang tạm giữ',
      value: summary?.frozenBalance ?? 0,
      note: 'Khoản ký quỹ hoặc tiền đang xử lý',
      tooltip: 'Số tiền đang được giữ theo cơ chế ký quỹ hoặc trong quá trình xử lý khiếu nại',
      icon: <LockOutlined />,
      tone: 'burgundy',
    },
    {
      key: 'earned',
      label: 'Tổng thu nhập',
      value: summary?.totalEarned ?? 0,
      note: 'Tổng tích lũy từ trước đến nay',
      tooltip: 'Tổng số tiền bạn đã kiếm được trên TUTORA',
      icon: <RiseOutlined />,
      tone: 'green',
    },
  ];

  return (
    <section className="finance-overview-grid" aria-label="Tổng quan số dư">
      <Card className="finance-card finance-balance-card" loading={loading}>
        <div className="finance-balance-card__header">
          <div className="finance-balance-card__label">
            <span className="finance-balance-card__icon" aria-hidden="true">
              <WalletOutlined />
            </span>
            <span>Số dư khả dụng</span>
          </div>
          <Tooltip title="Số tiền bạn có thể rút ngay lập tức">
            <InfoCircleOutlined className="finance-info-icon" aria-label="Thông tin số dư khả dụng" />
          </Tooltip>
        </div>

        <div className="finance-balance-card__value">{formatCurrency(summary?.balance ?? 0)}</div>

        <div className="finance-balance-card__footer">
          <span className="finance-live-dot" aria-hidden="true" />
          Cập nhật ngày {formatDate(new Date().toISOString())}
        </div>
      </Card>

      {metrics.map((metric) => (
        <Card
          key={metric.key}
          className={`finance-card finance-metric-card finance-metric-card--${metric.tone}`}
          loading={loading}
        >
          <div className="finance-metric-card__top">
            <span className="finance-metric-card__icon" aria-hidden="true">
              {metric.icon}
            </span>
            <Tooltip title={metric.tooltip}>
              <InfoCircleOutlined className="finance-info-icon" aria-label={`Thông tin ${metric.label}`} />
            </Tooltip>
          </div>
          <span className="finance-metric-card__label">{metric.label}</span>
          <strong className="finance-metric-card__value">{formatCurrency(metric.value)}</strong>
          <span className="finance-metric-card__note">{metric.note}</span>
        </Card>
      ))}
    </section>
  );
};

export default FinanceOverviewCards;

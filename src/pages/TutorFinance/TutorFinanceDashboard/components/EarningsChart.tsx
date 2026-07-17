import React, { useEffect, useState } from 'react';
import { Empty, Segmented, Spin } from 'antd';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getEarnings } from '../../../../services/tutorFinance.service';
import { formatCurrency } from '../../../../utils/formatters';
import type { EarningsItem } from '../../../../types/finance.types';

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
  label?: string;
}

const formatAxisValue = (value: number) => {
  if (Math.abs(value) >= 1000000) return `${Math.round(value / 100000) / 10}tr`;
  if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}k`;
  return `${value}`;
};

const CustomTooltip = (props: unknown) => {
  const { active, payload, label } = props as ChartTooltipProps;
  if (!active || !payload?.length) return null;

  return (
    <div className="finance-chart-tooltip">
      <span>{label}</span>
      <strong>{formatCurrency(Number(payload[0].value ?? 0))}</strong>
    </div>
  );
};

const EarningsChart: React.FC = () => {
  const [period, setPeriod] = useState<string>('week');
  const [data, setData] = useState<EarningsItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getEarnings(period);
        setData(response.items);
      } catch (error) {
        console.error('Failed to fetch earnings data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  const periodTotal = data.reduce((total, item) => total + item.amount, 0);

  return (
    <section className="finance-surface finance-chart-section">
      <div className="finance-chart-header">
        <div>
          <h2>Thu nhập theo thời gian</h2>
          <p>
            Tổng trong kỳ: <strong>{formatCurrency(periodTotal)}</strong>
          </p>
        </div>
        <Segmented
          aria-label="Khoảng thời gian biểu đồ"
          options={[
            { label: 'Tuần', value: 'week' },
            { label: 'Tháng', value: 'month' },
            { label: 'Năm', value: 'year' },
          ]}
          value={period}
          onChange={(value) => setPeriod(value as string)}
        />
      </div>

      <div className="finance-chart-canvas">
        {loading ? (
          <div className="finance-chart-state" aria-label="Đang tải biểu đồ">
            <Spin />
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 12, right: 4, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="financeEarningsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3d4a3e" stopOpacity={1} />
                  <stop offset="100%" stopColor="#7f927d" stopOpacity={0.72} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(26, 34, 56, 0.09)" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'rgba(26, 34, 56, 0.55)' }}
                tickMargin={12}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'rgba(26, 34, 56, 0.55)' }}
                tickFormatter={formatAxisValue}
                width={58}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(26, 34, 56, 0.035)' }} />
              <Bar dataKey="amount" fill="url(#financeEarningsGradient)" radius={[8, 8, 3, 3]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="finance-chart-state">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div className="finance-empty-copy">
                  <strong>Chưa có dữ liệu thu nhập</strong>
                  <span>Dữ liệu sẽ được cập nhật sau khi buổi học được quyết toán.</span>
                </div>
              }
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default EarningsChart;

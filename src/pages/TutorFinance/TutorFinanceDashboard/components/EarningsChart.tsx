import React, { useState, useEffect } from 'react';
import { Segmented, Empty, Spin } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getEarnings } from '../../../../services/tutorFinance.service';
import { formatCurrency } from '../../../../utils/formatters';
import type { EarningsItem } from '../../../../types/finance.types';

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

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-chart-tooltip" style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
                    <p className="label" style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
                    <p className="intro" style={{ margin: 0, color: '#1890ff' }}>
                        Thu nhập: {formatCurrency(payload[0].value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="chart-section">
            <div className="chart-header">
                <h3 style={{ margin: 0, fontWeight: 600 }}>Biểu đồ thu nhập</h3>
                <Segmented
                    options={[
                        { label: 'Tuần này', value: 'week' },
                        { label: 'Tháng này', value: 'month' },
                        { label: 'Năm nay', value: 'year' },
                    ]}
                    value={period}
                    onChange={(value) => setPeriod(value as string)}
                />
            </div>

            <div style={{ height: '300px', width: '100%', position: 'relative' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <Spin size="large" />
                    </div>
                ) : data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#999' }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#999' }}
                                tickFormatter={(value) => `${value / 1000}K`}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f5f5' }} />
                            <Bar dataKey="amount" fill="#1890ff" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <Empty description="Không có dữ liệu thu nhập" style={{ marginTop: '40px' }} />
                )}
            </div>
        </div>
    );
};

export default EarningsChart;

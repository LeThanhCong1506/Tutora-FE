import React from 'react';
import { Card, Result, Button, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../../../utils/formatters';

const { Text } = Typography;

interface Props {
    status: 'success' | 'error' | 'warning';
    amount: number;
    message?: string;
    onClose: () => void;
}

const WithdrawResultCard: React.FC<Props> = ({ status, amount, message }) => {
    const navigate = useNavigate();

    return (
        <Card bordered={false} bodyStyle={{ padding: '40px 0' }}>
            <Result
                status={status}
                title={status === 'success' ? 'Yêu cầu rút tiền đã được ghi nhận' : 'Yêu cầu thất bại'}
                subTitle={
                    status === 'success' ? (
                        <Space direction="vertical">
                            <Text>Số tiền: <Text strong>{formatCurrency(amount)}</Text></Text>
                            <Text type="secondary">Yêu cầu của bạn đang được hệ thống phê duyệt. Thời gian xử lý dự kiến: 1-2 ngày làm việc.</Text>
                        </Space>
                    ) : (
                        message || 'Đã có lỗi xảy ra trong quá trình xử lý yêu cầu. Vui lòng thử lại sau.'
                    )
                }
                extra={[
                    <Button type="primary" key="dashboard" onClick={() => navigate('/tutor-portal/finance')}>
                        Về tổng quan
                    </Button>,
                    <Button key="list" onClick={() => navigate('/tutor-portal/finance/withdrawals')}>
                        Xem lịch sử rút tiền
                    </Button>,
                ]}
            />
        </Card>
    );
};

export default WithdrawResultCard;

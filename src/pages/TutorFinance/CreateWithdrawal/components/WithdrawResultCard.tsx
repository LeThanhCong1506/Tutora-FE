import React from 'react';
import { Button, Card, Result, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../../../utils/formatters';

const { Text } = Typography;

interface Props {
  status: 'success' | 'error' | 'warning';
  amount: number;
  message?: string;
  onClose: () => void;
}

const WithdrawResultCard: React.FC<Props> = ({ status, amount, message, onClose }) => {
  const navigate = useNavigate();

  return (
    <Card className="finance-surface finance-withdraw-result" bordered={false}>
      <Result
        status={status}
        title={status === 'success' ? 'Yêu cầu rút tiền đã được ghi nhận' : 'Yêu cầu thất bại'}
        subTitle={
          status === 'success' ? (
            <Space direction="vertical">
              <Text>
                Số tiền: <Text strong>{formatCurrency(amount)}</Text>
              </Text>
              <Text type="secondary">
                Yêu cầu của bạn đang chờ admin/staff xét duyệt, dự kiến trong vòng 24 giờ. Số tiền đã được tạm trừ khỏi
                số dư khả dụng.
              </Text>
            </Space>
          ) : (
            message || 'Đã có lỗi xảy ra trong quá trình xử lý yêu cầu. Vui lòng thử lại sau.'
          )
        }
        extra={[
          <Button type="primary" size="large" className="finance-primary-action" key="dashboard" onClick={onClose}>
            Về tổng quan
          </Button>,
          <Button size="large" key="list" onClick={() => navigate('/tutor-portal/finance/withdrawals')}>
            Xem lịch sử rút tiền
          </Button>,
        ]}
      />
    </Card>
  );
};

export default WithdrawResultCard;

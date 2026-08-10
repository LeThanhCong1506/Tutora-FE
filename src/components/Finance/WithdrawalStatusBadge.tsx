import React from 'react';
import { Tag } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { formatWithdrawalStatusV2 } from '../../utils/formatters';

interface Props {
  status: string;
}

const WithdrawalStatusBadge: React.FC<Props> = ({ status }) => {
  const label = formatWithdrawalStatusV2(status);
  const lowerStatus = status.toLowerCase();

  let tone = 'default';
  let icon = <ClockCircleOutlined />;

  switch (lowerStatus) {
    case 'pending':
    case 'pending_review':
      tone = 'pending';
      break;
    case 'approved':
    case 'processing':
      tone = 'processing';
      icon = <SyncOutlined spin />;
      break;
    case 'completed':
      tone = 'completed';
      icon = <CheckCircleOutlined />;
      break;
    case 'rejected':
      tone = 'rejected';
      icon = <CloseCircleOutlined />;
      break;
    case 'cancelled':
      tone = 'cancelled';
      icon = <StopOutlined />;
      break;
    case 'delayed':
      tone = 'delayed';
      break;
    default:
      break;
  }

  return (
    <Tag className={`finance-status-tag finance-status-tag--${tone}`} icon={icon}>
      {label}
    </Tag>
  );
};

export default WithdrawalStatusBadge;

import type { ReactNode } from 'react';
import { BankOutlined, DashboardOutlined, HistoryOutlined, SwapOutlined } from '@ant-design/icons';
import SharedFinancePageShell, { type FinanceNavItem } from '../../../components/Finance/FinancePageShell';

interface FinancePageShellProps {
  title: string;
  titleInfo?: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  headerClassName?: string;
  contentClassName?: string;
  backLink?: {
    label: string;
    to: string;
  };
}

const financeNavItems: FinanceNavItem[] = [
  {
    to: '/tutor-portal/finance',
    label: 'Tổng quan',
    icon: <DashboardOutlined />,
    end: true,
  },
  {
    to: '/tutor-portal/finance/transactions',
    label: 'Giao dịch',
    icon: <SwapOutlined />,
    end: true,
  },
  {
    to: '/tutor-portal/finance/withdrawals',
    label: 'Lịch sử rút tiền',
    icon: <HistoryOutlined />,
    end: false,
  },
  {
    to: '/tutor-portal/finance/bank-info',
    label: 'Ngân hàng',
    icon: <BankOutlined />,
    end: true,
  },
];

const FinancePageShell = (props: FinancePageShellProps) => (
  <SharedFinancePageShell {...props} navItems={financeNavItems} />
);

export default FinancePageShell;

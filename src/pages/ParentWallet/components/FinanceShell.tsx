import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { BankOutlined, HistoryOutlined, SwapOutlined } from '@ant-design/icons';
import SharedFinancePageShell, { type FinanceNavItem } from '../../../components/Finance/FinancePageShell';

interface FinanceShellProps {
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

/**
 * Shell 3 tab (Giao dịch/Lịch sử rút tiền/Ngân hàng) cho Parent/Student — không có tab "Tổng quan"
 * vì trang "Ví của tôi" (ParentWallet/StudentWallet) đã đóng vai trò đó, truy cập riêng qua sidebar.
 */
const FinanceShell = ({ title, titleInfo, subtitle, children, actions, headerClassName, contentClassName, backLink }: FinanceShellProps) => {
  const location = useLocation();
  const portalBase = location.pathname.startsWith('/student-portal') ? '/student-portal' : '/parent-portal';

  const navItems: FinanceNavItem[] = [
    {
      to: `${portalBase}/wallet/transactions`,
      label: 'Giao dịch',
      icon: <SwapOutlined />,
      end: true,
    },
    {
      to: `${portalBase}/wallet/withdrawals`,
      label: 'Lịch sử rút tiền',
      icon: <HistoryOutlined />,
      end: false,
    },
    {
      to: `${portalBase}/wallet/bank-account`,
      label: 'Ngân hàng',
      icon: <BankOutlined />,
      end: true,
    },
  ];

  return (
    <SharedFinancePageShell
      title={title}
      titleInfo={titleInfo}
      subtitle={subtitle}
      actions={actions}
      headerClassName={headerClassName}
      contentClassName={contentClassName}
      backLink={backLink ?? { label: 'Quay lại Ví của tôi', to: `${portalBase}/wallet` }}
      navItems={navItems}
    >
      {children}
    </SharedFinancePageShell>
  );
};

export default FinanceShell;

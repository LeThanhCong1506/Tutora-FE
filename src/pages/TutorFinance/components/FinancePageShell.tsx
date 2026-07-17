import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowLeftOutlined, BankOutlined, DashboardOutlined, HistoryOutlined, SwapOutlined } from '@ant-design/icons';

interface FinancePageShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
  contentClassName?: string;
  backLink?: {
    label: string;
    to: string;
  };
}

const financeNavItems = [
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

const FinancePageShell = ({
  title,
  subtitle,
  children,
  actions,
  eyebrow = 'Trung tâm tài chính',
  contentClassName = '',
  backLink,
}: FinancePageShellProps) => {
  return (
    <div className="tutor-finance-container">
      <div className="finance-page-shell">
        <header className="finance-page-header">
          {backLink && (
            <NavLink className="finance-back-link" to={backLink.to}>
              <ArrowLeftOutlined aria-hidden="true" />
              <span>{backLink.label}</span>
            </NavLink>
          )}

          <span className="finance-eyebrow">{eyebrow}</span>

          <div className="finance-title-row">
            <div className="finance-title-block">
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            {actions && <div className="finance-header-actions">{actions}</div>}
          </div>

          <nav className="finance-nav" aria-label="Điều hướng tài chính">
            {financeNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `finance-nav-link${isActive ? ' finance-nav-link--active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </header>

        <main className={`finance-page-content ${contentClassName}`.trim()}>{children}</main>
      </div>
    </div>
  );
};

export default FinancePageShell;

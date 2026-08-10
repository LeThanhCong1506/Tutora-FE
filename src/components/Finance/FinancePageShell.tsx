import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';

export interface FinanceNavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

interface FinancePageShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
  headerClassName?: string;
  contentClassName?: string;
  backLink?: {
    label: string;
    to: string;
  };
  navItems: FinanceNavItem[];
}

/** Shell dùng chung cho trang tài chính của Tutor lẫn Parent/Student — khác nhau ở `navItems` (số tab/đường dẫn). */
const FinancePageShell = ({
  title,
  subtitle,
  children,
  actions,
  eyebrow = 'Trung tâm tài chính',
  headerClassName = '',
  contentClassName = '',
  backLink,
  navItems,
}: FinancePageShellProps) => {
  return (
    <div className="tutor-finance-container">
      <div className="finance-page-shell">
        <header className={`finance-page-header ${headerClassName}`.trim()}>
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
              {subtitle && <p>{subtitle}</p>}
            </div>
            {actions && <div className="finance-header-actions">{actions}</div>}
          </div>

          <nav className="finance-nav" aria-label="Điều hướng tài chính">
            {navItems.map((item) => (
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

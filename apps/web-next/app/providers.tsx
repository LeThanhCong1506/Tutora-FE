'use client';

/**
 * Root client providers cho Next app.
 *
 * - `AntdRegistry` (từ `@ant-design/nextjs-registry`) đảm bảo antd cssinjs SSR
 *   inject CSS vào `<head>` → tránh FOUC khi hydrate.
 * - `ConfigProvider` set default theme + locale Vietnamese.
 * - `ToastContainer` mount 1 lần cho cả app (react-toastify).
 *
 * Layout.tsx gói children vào <RootProviders> này.
 */

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export default function RootProviders({ children }: Props) {
  return (
    <AntdRegistry>
      <ConfigProvider
        locale={viVN}
        theme={{
          token: {
            fontFamily: 'var(--font-sans), Arial, sans-serif',
          },
        }}
      >
        {children}
        <ToastContainer position="top-right" autoClose={5000} style={{ zIndex: 99999 }} />
      </ConfigProvider>
    </AntdRegistry>
  );
}

'use client';

import React from 'react';
import { ConfigProvider, App as AntdApp } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import { AntdRegistry } from '@ant-design/nextjs-registry';

const customTheme = {
  token: {
    colorPrimary: '#f97316', // Laranja vibrante Peça Expressa
    colorInfo: '#0284c7',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    borderRadius: 8,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontSize: 14,
  },
  components: {
    Layout: {
      siderBg: '#0f172a',
      headerBg: '#ffffff',
      bodyBg: '#f8fafc',
    },
    Menu: {
      darkItemBg: '#0f172a',
      darkItemSelectedBg: '#ea580c',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.08)',
      darkItemColor: '#94a3b8',
      darkItemSelectedColor: '#ffffff',
    },
    Card: {
      borderRadiusLG: 12,
      headerFontSize: 16,
      boxShadowTertiary: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
    },
    Button: {
      borderRadius: 8,
      controlHeight: 38,
      fontWeight: 500,
    },
    Table: {
      borderRadius: 10,
      headerBg: '#f1f5f9',
      headerColor: '#334155',
    },
    Statistic: {
      titleFontSize: 13,
      contentFontSize: 24,
    }
  },
};

export default function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider locale={ptBR} theme={customTheme}>
        <AntdApp>
          {children}
        </AntdApp>
      </ConfigProvider>
    </AntdRegistry>
  );
}

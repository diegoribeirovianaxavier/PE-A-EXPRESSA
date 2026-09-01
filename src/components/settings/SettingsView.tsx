'use client';

import React from 'react';
import { Tabs, Typography, Space } from 'antd';
import {
  CalculatorOutlined,
  DatabaseOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { PricingSimulator } from './PricingSimulator';
import { DatabaseSchemaViewer } from './DatabaseSchemaViewer';

const { Title, Text } = Typography;

export const SettingsView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200">
        <Title level={3} className="!mb-0 text-slate-800 flex items-center gap-2">
          <SettingOutlined className="text-orange-500" /> Configurações, Taxas & Banco de Dados
        </Title>
        <Text type="secondary" className="text-sm">
          Simulador das regras de negócio, tabelas de precificação e conexão com o Supabase.
        </Text>
      </div>

      <Tabs
        defaultActiveKey="simulator"
        type="card"
        items={[
          {
            key: 'simulator',
            label: (
              <Space>
                <CalculatorOutlined />
                <span>Simulador de Preços & Regras</span>
              </Space>
            ),
            children: <PricingSimulator />,
          },
          {
            key: 'database',
            label: (
              <Space>
                <DatabaseOutlined />
                <span>Banco de Dados & Supabase SQL</span>
              </Space>
            ),
            children: <DatabaseSchemaViewer />,
          },
        ]}
      />
    </div>
  );
};

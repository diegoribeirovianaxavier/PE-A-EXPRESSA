'use client';

import React, { useState } from 'react';
import {
  Layout,
  Menu,
  Button,
  Avatar,
  Space,
  Tag,
  Typography,
  Tooltip,
  Drawer,
} from 'antd';
import {
  PieChartOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  WhatsAppOutlined,
  CarOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { isSupabaseConfigured } from '@/lib/supabase/client';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

export type NavigationKey = 'dashboard' | 'new-sale' | 'sales-history' | 'settings';

interface AppLayoutProps {
  currentTab: NavigationKey;
  onTabChange: (key: NavigationKey) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  onTabChange,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const menuItems = [
    {
      key: 'dashboard',
      icon: <PieChartOutlined className="text-base" />,
      label: 'Dashboard Financeira',
    },
    {
      key: 'new-sale',
      icon: <ThunderboltOutlined className="text-base text-orange-400" />,
      label: 'Nova Venda & OCR',
    },
    {
      key: 'sales-history',
      icon: <HistoryOutlined className="text-base" />,
      label: 'Histórico & Garantias',
    },
    {
      key: 'settings',
      icon: <SettingOutlined className="text-base" />,
      label: 'Configurações & Taxas',
    },
  ];

  const handleMenuClick = (info: { key: string }) => {
    onTabChange(info.key as NavigationKey);
    setMobileDrawerOpen(false);
  };

  return (
    <Layout className="min-h-screen">
      {/* Sidebar Desktop */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={260}
        collapsedWidth={80}
        className="hidden md:block !bg-slate-900 border-r border-slate-800 shadow-xl fixed left-0 top-0 bottom-0 z-20"
      >
        <div className="flex flex-col h-full justify-between">
          <div>
            {/* Logo e Marca */}
            <div className="h-16 flex items-center px-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => onTabChange('dashboard')}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md flex-shrink-0">
                  <ThunderboltOutlined className="text-xl" />
                </div>
                {!collapsed && (
                  <div className="flex flex-col">
                    <span className="font-black text-white text-base tracking-wider leading-none">
                      PEÇA <span className="text-orange-500">EXPRESSA</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase mt-1">
                      Venda Online
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Menu de Navegação */}
            <div className="py-4">
              <Menu
                theme="dark"
                mode="inline"
                selectedKeys={[currentTab]}
                onClick={handleMenuClick}
                items={menuItems}
                className="!bg-transparent text-sm font-medium"
              />
            </div>
          </div>

          {/* Rodapé da Sidebar */}
          {!collapsed ? (
            <div className="p-4 border-t border-slate-800 bg-slate-950/40">
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-300 font-semibold flex items-center gap-1">
                    <SafetyCertificateOutlined className="text-emerald-400" /> Vendas Online
                  </span>
                  <Tag color="orange" className="text-[10px] m-0">v1.0</Tag>
                </div>
                <div className="text-[11px] text-slate-400">
                  Integração Loja Física (Nova Peças) & Supabase
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 text-center border-t border-slate-800">
              <CarOutlined className="text-slate-500 text-lg" />
            </div>
          )}
        </div>
      </Sider>

      {/* Drawer Mobile */}
      <Drawer
        placement="left"
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen}
        bodyStyle={{ padding: 0, backgroundColor: '#0f172a' }}
        width={260}
      >
        <div className="h-16 flex items-center px-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white">
              <ThunderboltOutlined className="text-lg" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-white text-base tracking-wider leading-none">
                PEÇA <span className="text-orange-500">EXPRESSA</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase mt-1">
                Venda Online
              </span>
            </div>
          </div>
        </div>
        <div className="py-4">
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[currentTab]}
            onClick={handleMenuClick}
            items={menuItems}
            className="!bg-transparent text-sm font-medium"
          />
        </div>
      </Drawer>

      {/* Conteúdo Principal com Offset para a Sidebar */}
      <Layout className={`transition-all duration-200 ${collapsed ? 'md:ml-[80px]' : 'md:ml-[260px]'}`}>
        {/* Header Superior */}
        <Header className="!bg-white border-b border-slate-200 !px-4 sm:!px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs h-16">
          <div className="flex items-center gap-3">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex text-slate-600 hover:text-slate-900"
            />
            <Button
              type="text"
              icon={<MenuUnfoldOutlined />}
              onClick={() => setMobileDrawerOpen(true)}
              className="flex md:hidden text-slate-600"
            />

            <div className="hidden sm:flex items-center gap-2">
              <Tag
                color={isSupabaseConfigured ? 'success' : 'processing'}
                className="font-medium text-xs flex items-center gap-1"
              >
                <DatabaseOutlined />
                {isSupabaseConfigured ? 'Supabase Conectado' : 'Modo Demonstração Local'}
              </Tag>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentTab !== 'new-sale' && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => onTabChange('new-sale')}
                className="!bg-orange-500 hover:!bg-orange-600 font-bold"
              >
                <span className="hidden sm:inline">Nova Venda</span>
              </Button>
            )}

            <Tooltip title="Atendimento WhatsApp Peça Expressa">
              <Button
                icon={<WhatsAppOutlined />}
                href="https://wa.me/5521976904912"
                target="_blank"
                className="border-emerald-500 text-emerald-700 hover:bg-emerald-50 hidden sm:flex items-center"
              >
                (21) 97690-4912
              </Button>
            </Tooltip>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <Avatar
                style={{ backgroundColor: '#f97316' }}
                icon={<CarOutlined />}
              />
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-slate-800 leading-tight">
                  PEÇA EXPRESSA
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  Operador Online
                </div>
              </div>
            </div>
          </div>
        </Header>

        {/* Corpo da Aplicação */}
        <Content className="p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </Content>

        {/* Rodapé */}
        <Footer className="text-center text-xs text-slate-400 border-t border-slate-200 !bg-white py-4">
          PEÇA EXPRESSA &copy; {new Date().getFullYear()} — Venda Online de Autopeças. Sistema ERP & Precificação Integrada.
        </Footer>
      </Layout>
    </Layout>
  );
};

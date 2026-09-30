'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Tag, message, Alert, Input, Form, Divider, Spin } from 'antd';
import {
  CopyOutlined,
  CheckOutlined,
  DatabaseOutlined,
  CloudUploadOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RocketOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  getSupabaseConfig,
  getSupabaseClient,
  saveLocalSupabaseConfig,
  clearLocalSupabaseConfig,
  testSupabaseConnection,
} from '@/lib/supabase/client';

const { Text, Paragraph } = Typography;

const SQL_SCHEMA = `-- ==============================================================================
-- SISTEMA ERP & DASHBOARD FINANCEIRO - PEÇA EXPRESSA
-- Script SQL Completo para Supabase (PostgreSQL + Storage + Permissões)
-- ==============================================================================

-- 1. Habilitar extensão pgcrypto para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabela de Vendas / Ordens
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  original_invoice_number VARCHAR(100),
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50),
  car_model VARCHAR(255),
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('PIX', 'CARTAO', 'DINHEIRO')),
  installments_count INT DEFAULT 1,
  
  -- Valores Financeiros
  original_cost_total NUMERIC(10,2) NOT NULL,
  profit_margin_percent NUMERIC(5,2) NOT NULL,
  freight_cost NUMERIC(10,2) DEFAULT 20.00,
  card_fee_percent NUMERIC(5,2) DEFAULT 0.00,
  pix_discount_percent NUMERIC(5,2) DEFAULT 0.00,
  final_sale_total NUMERIC(10,2) NOT NULL,
  net_profit NUMERIC(10,2) NOT NULL,
  
  -- Garantia e Anexos
  warranty_deadline DATE NOT NULL,
  invoice_file_url TEXT,
  status VARCHAR(50) DEFAULT 'CONCLUIDO',
  notes TEXT
);

-- 3. Tabela de Itens da Venda
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  item_code VARCHAR(100),
  item_name TEXT NOT NULL,
  brand VARCHAR(100),
  quantity INT NOT NULL DEFAULT 1,
  original_unit_cost NUMERIC(10,2) NOT NULL,
  final_unit_price NUMERIC(10,2) NOT NULL,
  final_total_price NUMERIC(10,2) NOT NULL
);

-- 4. Habilitar Permissões Públicas (Permite leitura e gravação sem necessidade de login)
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items DISABLE ROW LEVEL SECURITY;

-- 5. Bucket no Supabase Storage: 'invoices' (Público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Habilitar Realtime para as tabelas (Sincronização entre múltiplos computadores)
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_items;`;

export const DatabaseSchemaViewer: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    source: string;
  }>({ tested: false, success: false, message: '', source: '' });

  const [form] = Form.useForm();
  const config = getSupabaseConfig();

  useEffect(() => {
    form.setFieldsValue({
      url: config.url,
      anonKey: config.anonKey,
    });
    // Testa automaticamente se já houver config
    if (config.isConfigured) {
      handleTestConnection();
    }
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopied(true);
    message.success('Script SQL copiado com sucesso! Cole no SQL Editor do Supabase.');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await testSupabaseConnection();
      setTestResult({
        tested: true,
        success: res.success,
        message: res.message,
        source: res.source,
      });
      if (res.success) {
        message.success('Banco de Dados Supabase conectado e operacional!');
      } else {
        message.warning(res.message);
      }
    } catch (err: any) {
      setTestResult({
        tested: true,
        success: false,
        message: err.message || 'Erro ao conectar.',
        source: 'error',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveCredentials = async (values: { url: string; anonKey: string }) => {
    if (!values.url || !values.anonKey) {
      message.error('Preencha a URL e a Chave Anon.');
      return;
    }

    saveLocalSupabaseConfig(values.url, values.anonKey);
    message.success('Credenciais salvas com sucesso neste navegador!');
    await handleTestConnection();
    window.location.reload();
  };

  const handleClearCredentials = () => {
    clearLocalSupabaseConfig();
    form.resetFields();
    setTestResult({ tested: false, success: false, message: '', source: '' });
    message.info('Credenciais locais removidas. O sistema retornou ao modo padrão.');
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Diagnóstico de Conexão e Status */}
      <Card
        title={
          <Space>
            <KeyOutlined className="text-orange-500" />
            <span className="font-bold text-slate-800">Conexão Oficial com o Supabase (@supabase/supabase-js)</span>
          </Space>
        }
        className="border-slate-200 shadow-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800 flex items-center gap-2">
                <DatabaseOutlined className="text-emerald-600" /> Supabase Database & Realtime
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {testResult.success
                  ? `Conectado via ${testResult.source === 'env' ? 'Variáveis Vercel' : 'Configuração Direta'}`
                  : config.isConfigured
                  ? 'Configurado, aguardando verificação de conexão...'
                  : 'Modo Local Storage (Apenas neste computador)'}
              </div>
            </div>
            <Tag color={testResult.success ? 'success' : config.isConfigured ? 'warning' : 'processing'}>
              {testResult.success ? 'Conectado (Nuvem)' : config.isConfigured ? 'Verificando' : 'Modo Local'}
            </Tag>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800 flex items-center gap-2">
                <SafetyCertificateOutlined className="text-orange-500" /> Sincronização em Tempo Real
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {testResult.success
                  ? 'Ativo: Vendas salvas em um PC aparecem no outro instantaneamente'
                  : 'Desconectado: Requer Supabase para sincronizar entre PCs'}
              </div>
            </div>
            <Tag color={testResult.success ? 'cyan' : 'default'}>
              {testResult.success ? 'Realtime Ativo' : 'Aguardando Banco'}
            </Tag>
          </div>
        </div>

        {testResult.tested && (
          <div className="mt-4">
            <Alert
              type={testResult.success ? 'success' : 'error'}
              showIcon
              icon={testResult.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              message={testResult.success ? 'Banco de Dados Conectado com Sucesso!' : 'Atenção com a Conexão'}
              description={testResult.message}
            />
          </div>
        )}
      </Card>

      {/* Formulário de Conexão Rápida Direta */}
      <Card
        title={
          <Space>
            <RocketOutlined className="text-orange-500" />
            <span className="font-bold text-slate-800">Configuração Rápida de Chaves do Supabase</span>
          </Space>
        }
        className="border-slate-200 shadow-sm"
      >
        <Text type="secondary" className="text-xs block mb-4">
          Cole suas credenciais do Supabase abaixo para conectar imediatamente ou configure como variáveis de ambiente na Vercel (<code className="bg-slate-100 px-1 py-0.5 rounded text-orange-600 font-semibold">NEXT_PUBLIC_SUPABASE_URL</code> e <code className="bg-slate-100 px-1 py-0.5 rounded text-orange-600 font-semibold">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>).
        </Text>

        <Form form={form} layout="vertical" onFinish={handleSaveCredentials}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="url"
              label={<span className="text-xs font-bold text-slate-700">Project URL (Supabase)</span>}
              rules={[{ required: true, message: 'Informe a Project URL do Supabase' }]}
            >
              <Input
                placeholder="https://abcdefghijklm.supabase.co"
                className="font-mono text-xs"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="anonKey"
              label={<span className="text-xs font-bold text-slate-700">Anon Public Key (API Key)</span>}
              rules={[{ required: true, message: 'Informe a chave Anon Public do Supabase' }]}
            >
              <Input.Password
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="font-mono text-xs"
                size="large"
              />
            </Form.Item>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                className="!bg-orange-500 hover:!bg-orange-600 font-bold"
                size="large"
              >
                Salvar & Conectar Agora
              </Button>

              <Button
                icon={<SyncOutlined spin={testing} />}
                onClick={handleTestConnection}
                loading={testing}
                size="large"
              >
                Testar Conexão
              </Button>
            </Space>

            {config.source === 'localStorage' && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleClearCredentials}
                size="large"
              >
                Limpar Chaves Salvas
              </Button>
            )}
          </div>
        </Form>
      </Card>

      {/* Visualizador de Script SQL Completo */}
      <Card
        title={
          <div className="flex items-center justify-between">
            <Space>
              <DatabaseOutlined className="text-orange-500" />
              <span className="font-bold text-slate-800">Script SQL com Permissões e Realtime</span>
            </Space>
            <Button
              type="primary"
              icon={copied ? <CheckOutlined /> : <CopyOutlined />}
              onClick={handleCopySql}
              className="!bg-orange-500 hover:!bg-orange-600"
            >
              {copied ? 'Copiado!' : 'Copiar Script SQL'}
            </Button>
          </div>
        }
        className="border-slate-200 shadow-sm"
      >
        <Alert
          message="Como aplicar o Script no Supabase (Em 30 segundos):"
          description="1. Acesse https://supabase.com no seu projeto. 2. Vá em 'SQL Editor' no menu lateral esquerdo. 3. Clique em 'New Query', cole o código abaixo e clique em 'Run'."
          type="info"
          showIcon
          className="mb-4"
        />

        <pre className="bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed max-h-[380px]">
          {SQL_SCHEMA}
        </pre>
      </Card>
    </div>
  );
};

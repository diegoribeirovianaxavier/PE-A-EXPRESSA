'use client';

import React, { useState } from 'react';
import { Card, Button, Space, Typography, Tag, message, Alert, Divider } from 'antd';
import {
  CopyOutlined,
  CheckOutlined,
  DatabaseOutlined,
  CloudUploadOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { isSupabaseConfigured } from '@/lib/supabase/client';

const { Text, Paragraph } = Typography;

const SQL_SCHEMA = `-- ==============================================================================
-- SISTEMA ERP & DASHBOARD FINANCEIRO - PEÇA EXPRESSA
-- Script SQL Completo para Supabase (PostgreSQL + Storage)
-- ==============================================================================

-- 1. Habilitar extensão pgcrypto
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
  freight_cost NUMERIC(10,2) DEFAULT 15.00,
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

-- 4. Bucket no Supabase Storage: 'invoices' (Público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;`;

export const DatabaseSchemaViewer: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopied(true);
    message.success('Script SQL copiado! Cole no SQL Editor do Supabase.');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Diagnóstico de Conexão */}
      <Card
        title={
          <Space>
            <KeyOutlined className="text-orange-500" />
            <span className="font-bold text-slate-800">Status dos Serviços & BaaS</span>
          </Space>
        }
        className="border-slate-200 shadow-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800 flex items-center gap-2">
                <DatabaseOutlined className="text-emerald-600" /> Supabase Database & Storage
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {isSupabaseConfigured
                  ? 'Conectado às variáveis NEXT_PUBLIC_SUPABASE_URL'
                  : 'Modo Offline / Demonstração Ativo (Persistência Local)'}
              </div>
            </div>
            <Tag color={isSupabaseConfigured ? 'success' : 'processing'}>
              {isSupabaseConfigured ? 'Ativo (Supabase)' : 'Local Storage Demo'}
            </Tag>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800 flex items-center gap-2">
                <SafetyCertificateOutlined className="text-orange-500" /> Google Gemini Vision OCR
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Rota Serverless /api/gemini/ocr configurada com Gemini 1.5 Flash
              </div>
            </div>
            <Tag color="cyan">Gemini 1.5 Flash</Tag>
          </div>
        </div>
      </Card>

      {/* Visualizador de Script SQL */}
      <Card
        title={
          <div className="flex items-center justify-between">
            <Space>
              <DatabaseOutlined className="text-orange-500" />
              <span className="font-bold text-slate-800">Script SQL para Criação no Supabase</span>
            </Space>
            <Button
              type="primary"
              icon={copied ? <CheckOutlined /> : <CopyOutlined />}
              onClick={handleCopySql}
              className="!bg-orange-500 hover:!bg-orange-600"
            >
              {copied ? 'Copiado!' : 'Copiar SQL'}
            </Button>
          </div>
        }
        className="border-slate-200 shadow-sm"
      >
        <Alert
          message="Como configurar o Supabase gratuitamente em 1 minuto:"
          description="1. Acesse https://supabase.com e crie um projeto gratuito. 2. Abra a aba 'SQL Editor' no menu lateral do Supabase. 3. Cole o script abaixo e clique em 'Run'. 4. Cole as chaves no seu arquivo .env.local!"
          type="info"
          showIcon
          className="mb-4"
        />

        <pre className="bg-slate-950 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed max-h-[400px]">
          {SQL_SCHEMA}
        </pre>
      </Card>
    </div>
  );
};

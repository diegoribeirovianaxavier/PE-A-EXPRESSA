-- ==============================================================================
-- SISTEMA ERP & DASHBOARD FINANCEIRO - PEÇA EXPRESSA
-- Script SQL Completo para Supabase (PostgreSQL + Storage)
-- ==============================================================================

-- 1. Habilitar extensão para geração de UUID
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
  original_cost_total NUMERIC(10,2) NOT NULL,    -- Custo original na loja física
  profit_margin_percent NUMERIC(5,2) NOT NULL,   -- % Margem da Etapa A
  freight_cost NUMERIC(10,2) DEFAULT 15.00,      -- Frete fixo R$ 15,00
  card_fee_percent NUMERIC(5,2) DEFAULT 0.00,    -- % Taxa Maquininha Etapa C
  pix_discount_percent NUMERIC(5,2) DEFAULT 0.00,-- % Desconto PIX
  final_sale_total NUMERIC(10,2) NOT NULL,       -- Valor final pago pelo cliente
  net_profit NUMERIC(10,2) NOT NULL,             -- Lucro Líquido Real
  
  -- Garantia e Anexos
  warranty_deadline DATE NOT NULL,               -- Data da compra + 90 dias
  invoice_file_url TEXT,                         -- URL pública/assinada no Supabase Storage
  status VARCHAR(50) DEFAULT 'CONCLUIDO',        -- CONCLUIDO, CANCELADO, PENDENTE
  notes TEXT
);

-- 3. Tabela de Itens da Venda
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  item_code VARCHAR(100),                        -- Código real (sem prefixo NP)
  item_name TEXT NOT NULL,
  brand VARCHAR(100),                            -- Fabricante/Marca
  quantity INT NOT NULL DEFAULT 1,
  original_unit_cost NUMERIC(10,2) NOT NULL,     -- Custo unitário original
  final_unit_price NUMERIC(10,2) NOT NULL,       -- Preço unitário repassado
  final_total_price NUMERIC(10,2) NOT NULL       -- Preço total do item
);

-- 4. Índices para Otimização de Performance
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_client ON public.sales(client_name);
CREATE INDEX IF NOT EXISTS idx_sales_warranty ON public.sales(warranty_deadline);
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON public.sales(original_invoice_number);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_code ON public.sale_items(item_code);

-- 5. Configuração de Row Level Security (RLS)
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso livre para leitura e escrita (ou autenticado dependendo do caso)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acesso total a sales') THEN
    CREATE POLICY "Permitir acesso total a sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir acesso total a sale_items') THEN
    CREATE POLICY "Permitir acesso total a sale_items" ON public.sale_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 6. Configuração do Supabase Storage Bucket 'invoices'
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para upload e download no bucket 'invoices'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir leitura publica de invoices') THEN
    CREATE POLICY "Permitir leitura publica de invoices"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'invoices');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir upload em invoices') THEN
    CREATE POLICY "Permitir upload em invoices"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'invoices');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir update em invoices') THEN
    CREATE POLICY "Permitir update em invoices"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'invoices');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir delete em invoices') THEN
    CREATE POLICY "Permitir delete em invoices"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'invoices');
  END IF;
END $$;

-- 7. Dados Iniciais de Exemplo (Seed Data para Demonstração da PEÇA EXPRESSA)
INSERT INTO public.sales (
  id, sale_date, original_invoice_number, client_name, client_phone, car_model,
  payment_method, installments_count, original_cost_total, profit_margin_percent,
  freight_cost, card_fee_percent, pix_discount_percent, final_sale_total, net_profit,
  warranty_deadline, status, notes
) VALUES 
(
  'a0000001-0000-0000-0000-000000000001',
  CURRENT_DATE - INTERVAL '5 days',
  'NF-89421',
  'Carlos Eduardo Silva',
  '(21) 98765-4321',
  'Civic 2.0 2018',
  'PIX',
  1,
  180.00,
  13.00,
  15.00,
  6.12,
  7.01,
  215.75,
  20.75,
  CURRENT_DATE - INTERVAL '5 days' + INTERVAL '90 days',
  'CONCLUIDO',
  'Entrega expressa realizada via motoboy.'
),
(
  'a0000002-0000-0000-0000-000000000002',
  CURRENT_DATE - INTERVAL '2 days',
  'NF-89455',
  'Mariana Costa Ramos',
  '(21) 99123-8877',
  'Corolla 1.8 2016',
  'CARTAO',
  3,
  350.00,
  8.50,
  15.00,
  6.12,
  7.01,
  419.00,
  28.36,
  CURRENT_DATE - INTERVAL '2 days' + INTERVAL '90 days',
  'CONCLUIDO',
  'Parcelado em 3x sem juros no cartão.'
),
(
  'a0000003-0000-0000-0000-000000000003',
  CURRENT_DATE - INTERVAL '80 days',
  'NF-88102',
  'Roberto Mendes',
  '(21) 97555-1234',
  'Onix 1.0 Turbo 2021',
  'PIX',
  1,
  85.00,
  17.00,
  15.00,
  5.39,
  6.09,
  113.10,
  13.10,
  CURRENT_DATE - INTERVAL '80 days' + INTERVAL '90 days',
  'CONCLUIDO',
  'Garantia próxima do vencimento (10 dias restantes).'
),
(
  'a0000004-0000-0000-0000-000000000004',
  CURRENT_DATE - INTERVAL '95 days',
  'NF-87320',
  'Fernanda Oliveira',
  '(21) 98111-9988',
  'HB20 1.6 2019',
  'CARTAO',
  5,
  520.00,
  6.50,
  15.00,
  7.57,
  8.80,
  611.88,
  30.50,
  CURRENT_DATE - INTERVAL '95 days' + INTERVAL '90 days',
  'CONCLUIDO',
  'Garantia de 90 dias expirada.'
)
ON CONFLICT (id) DO NOTHING;

-- Itens das Vendas de Exemplo
INSERT INTO public.sale_items (
  sale_id, item_code, item_name, brand, quantity, original_unit_cost, final_unit_price, final_total_price
) VALUES 
(
  'a0000001-0000-0000-0000-000000000001',
  'BD4120',
  'Jogo de Pastilhas de Freio Dianteiras',
  'Fras-le',
  1,
  180.00,
  215.75,
  215.75
),
(
  'a0000002-0000-0000-0000-000000000002',
  'AM8920',
  'Amortecedor Dianteiro Direito',
  'Cofap',
  1,
  250.00,
  299.28,
  299.28
),
(
  'a0000002-0000-0000-0000-000000000002',
  'KT441',
  'Kit Coxim e Batente do Amortecedor',
  'Sampel',
  1,
  100.00,
  119.72,
  119.72
),
(
  'a0000003-0000-0000-0000-000000000003',
  'FL550',
  'Filtro de Óleo Lubrificante',
  'Mann Filter',
  1,
  85.00,
  113.10,
  113.10
),
(
  'a0000004-0000-0000-0000-000000000004',
  'EM901',
  'Kit de Embreagem Platô e Disco',
  'Valeo',
  1,
  520.00,
  611.88,
  611.88
)
ON CONFLICT (id) DO NOTHING;

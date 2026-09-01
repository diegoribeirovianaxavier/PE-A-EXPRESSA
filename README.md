# PEÇA EXPRESSA — Sistema ERP & Dashboard Financeiro

Aplicação web moderna, responsiva e pronta para produção para **PEÇA EXPRESSA (Venda Online de Autopeças)**, construída com **Next.js 14 (App Router)**, **TypeScript**, **Ant Design (v5)**, **Tailwind CSS**, **Supabase** e **Google Gemini 1.5 Flash Vision OCR**.

---

## 🚀 Funcionalidades Principais

1. **Upload & OCR com Inteligência Artificial (Gemini 1.5 Flash)**
   - Upload arrastar-e-soltar de Fotos (JPG, PNG, WebP) ou PDFs de notas e cupons da loja física (*"NOVA PEÇAS"*).
   - Extração automática do número da NF, dados do cliente, veículo e itens.
   - Limpeza automática de prefixos de loja física como `NP` ou `NP-` nos códigos dos produtos.

2. **Motor de Regras de Precificação e Lucro Líquido Real (`PricingEngine.ts`)**
   - **Etapa A:** Margem Bruta progressiva (+17% até +6% sobre o custo original).
   - **Etapa B:** Rateio proporcional do frete fixo de **R$ 15,00** por item.
   - **Etapa C:** Taxa da maquininha de cartão (+5.39% até +11.06%).
   - **Etapa D:** Cálculo dinâmico do limite de parcelamento sem juros (até 2x até 10x).
   - **Etapa E:** Desconto exclusivo no PIX (-6.09% até -10.00% sobre o total do cartão).
   - **Etapa F:** Cálculo do **Lucro Líquido Real** (descontando custo da peça, frete e taxa de maquininha).
   - **Etapa G:** Rateio proporcional nos itens para fechamento de conta perfeito.

3. **Gerador Oficial de Orçamento para WhatsApp**
   - Botão de 1 clique para copiar o texto formatado no padrão exigido pela Peça Expressa.
   - Botão direto para abrir a conversa no WhatsApp Web com a mensagem pré-preenchida.

4. **Dashboard Financeiro Completo**
   - Filtros de período (Hoje, Esta Semana, Este Mês, Últimos 30 Dias, Range Customizado).
   - Cards de estatísticas com Faturamento Bruto, Lucro Líquido Real, Margem Média (%) e Ticket Médio.
   - Gráfico de evolução diária de Faturamento vs Lucro Líquido (`Recharts`).
   - Gráfico de barras com o **Top 5 Autopeças Mais Vendidas**.
   - Comparativo e distribuição de vendas PIX vs Cartão de Crédito.

5. **Histórico de Vendas & Gestão de Garantias (90 Dias)**
   - Busca global rápida por Cliente, Telefone, Carro, Nº da Nota ou Código da Peça.
   - Tags de garantia em tempo real (🟢 Ativa com contagem regressiva de dias, 🟡 Expirando em breve &le; 15 dias, 🔴 Expirada).
   - Modal para visualização de Foto/PDF da nota fiscal anexada.
   - Drawer com raio-X completo e auditoria da venda e das peças.
   - Exportação completa para planilha CSV.

6. **Simulador de Preços & Guia SQL Supabase**
   - Simulador interativo nas configurações para testar qualquer valor de custo e visualizar todas as 7 etapas.
   - Script SQL pronto para rodar no Supabase.

---

## 🛠️ Stack Tecnológica

- **Framework:** Next.js 14+ (App Router)
- **Linguagem:** TypeScript
- **UI & Componentes:** Ant Design v5 (`antd`, `@ant-design/icons`, `@ant-design/nextjs-registry`) + Tailwind CSS
- **Gráficos:** Recharts
- **BaaS / Database:** Supabase (`@supabase/supabase-js`) com fallback local resiliente
- **Visão Computacional / OCR:** Google Gemini 1.5 Flash (`@google/generative-ai`)
- **Datas:** Day.js (localizado em pt-BR)

---

## 📦 Como Rodar Localmente

### 1. Clonar ou navegar até a pasta
```bash
cd peca-expressa-erp
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
Crie um arquivo `.env.local` baseado no `.env.example`:
```env
# Supabase (Opcional - caso não configurado, o app usa modo demonstração local)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui

# Google Gemini API Key (para OCR de Notas Fiscais)
GEMINI_API_KEY=sua-chave-gemini-aqui
```

### 4. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```
Acesse em: `http://localhost:3000`

---

## 🗄️ Configuração do Banco de Dados no Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com).
2. Vá em **SQL Editor** no painel do Supabase.
3. Execute o script contido em `src/supabase/schema.sql`.
4. Copie a **URL** e **anon public key** em *Project Settings &rarr; API* e adicione ao `.env.local` ou nas variáveis da Vercel.

---

## 🚀 Deploy Gratuito na Vercel

1. Envie o projeto para o seu repositório no GitHub.
2. Acesse [vercel.com](https://vercel.com) e importe o repositório.
3. Adicione as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
4. Clique em **Deploy**!

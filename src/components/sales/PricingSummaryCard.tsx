'use client';

import React from 'react';
import { Card, Tag, Typography, Divider, Space } from 'antd';
import {
  DollarOutlined,
  ThunderboltOutlined,
  CreditCardOutlined,
  SafetyCertificateOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  ShopOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { PricingCalculationResult, PaymentMethod } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';

const { Text } = Typography;

interface PricingSummaryCardProps {
  calculation: PricingCalculationResult;
  paymentMethod: PaymentMethod;
}

export const PricingSummaryCard: React.FC<PricingSummaryCardProps> = ({
  calculation,
  paymentMethod,
}) => {
  const isPix = paymentMethod === 'PIX' || paymentMethod === 'DINHEIRO';
  const markupAmount = calculation.final_sale_total - calculation.original_cost_total;
  const markupPercent =
    calculation.original_cost_total > 0
      ? (markupAmount / calculation.original_cost_total) * 100
      : 0;

  return (
    <Card
      title={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Space size={8}>
            <DollarOutlined className="text-orange-500 text-lg" />
            <span className="font-bold text-slate-800 text-sm sm:text-base">
              Motor de Precificação
            </span>
          </Space>
          <Tag
            color={isPix ? 'green' : 'blue'}
            className="px-2.5 py-0.5 font-semibold text-xs rounded-full m-0"
          >
            {isPix ? '⚡ PIX (À Vista)' : '💳 Cartão de Crédito'}
          </Tag>
        </div>
      }
      className="shadow-sm border-slate-200 overflow-hidden"
      bodyStyle={{ padding: '16px 18px' }}
    >
      {/* 3 Blocos Principais de Métricas com Design Moderno e Alinhado */}
      <div className="flex flex-col gap-2.5 mb-4">
        {/* Bloco 1: Custo Original */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[11px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
              <ShopOutlined /> 1. Custo Loja Física
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {calculation.total_items_count}{' '}
              {calculation.total_items_count === 1 ? 'item' : 'itens'} na nota
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-lg sm:text-xl font-extrabold text-slate-700">
              {formatCurrency(calculation.original_cost_total)}
            </div>
          </div>
        </div>

        {/* Bloco 2: Orçamento Convertido */}
        <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-xl flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[11px] uppercase font-bold text-orange-800 tracking-wider flex items-center gap-1">
              <ThunderboltOutlined className="text-orange-500" /> 2. Orçamento Convertido
            </div>
            <div className="text-xs text-orange-700/90 mt-0.5 font-medium flex items-center gap-1.5">
              <span>Acréscimo: +{formatCurrency(markupAmount)}</span>
              <Tag color="orange" className="text-[10px] font-mono m-0 px-1 py-0">
                +{markupPercent.toFixed(1)}%
              </Tag>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-lg sm:text-xl font-black text-orange-950">
              {formatCurrency(calculation.final_sale_total)}
            </div>
          </div>
        </div>

        {/* Bloco 3: Lucro Líquido Real */}
        <div className="p-3 bg-emerald-50/80 border border-emerald-300 rounded-xl flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[11px] uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1">
              <RiseOutlined className="text-emerald-600" /> 3. Lucro Líquido Real
            </div>
            <div className="text-xs text-emerald-600 mt-0.5">
              Livre no seu bolso (pós custo, frete e taxas)
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xl sm:text-2xl font-black text-emerald-700 flex items-center justify-end gap-1.5">
              {formatCurrency(calculation.net_profit)}
              <Tag color="success" className="text-[11px] font-bold m-0 px-1 py-0">
                <ArrowUpOutlined /> {calculation.net_margin_percent.toFixed(1)}%
              </Tag>
            </div>
          </div>
        </div>
      </div>

      <Divider className="my-3 border-slate-200" />

      {/* Detalhamento Passo a Passo das Etapas (Sem quebra de linha feia) */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between py-1 border-b border-slate-100">
          <span className="text-slate-500">Subtotal com Margem (Etapa A):</span>
          <span className="font-semibold text-slate-700">
            {formatCurrency(calculation.subtotal_with_margin)}
          </span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-slate-100">
          <span className="text-slate-500">Frete Fixo Rateado (Etapa B):</span>
          <span className="font-semibold text-slate-700">
            {formatCurrency(calculation.freight_cost)}{' '}
            <span className="text-slate-400 font-normal">
              ({formatCurrency(calculation.freight_per_item)}/peça)
            </span>
          </span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-slate-100">
          <span className="text-slate-500">Preço Tabela no Cartão (Etapa C):</span>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-blue-700">
              {formatCurrency(calculation.card_sale_total)}
            </span>
            <Tag color="blue" className="text-[10px] m-0 px-1 py-0 font-medium">
              Até {calculation.max_installments}x
            </Tag>
          </div>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-slate-100">
          <span className="text-slate-500">
            {isPix
              ? 'Taxa da Maquininha (PIX):'
              : `Taxa da Maquininha (${calculation.installments_count || 1}x):`}
          </span>
          {isPix ? (
            <Tag color="green" className="text-[11px] font-semibold m-0 px-1.5 py-0">
              0.00% (Isento no PIX)
            </Tag>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-red-600">
                -{formatCurrency(calculation.applied_card_fee_amount || calculation.card_fee_amount)}
              </span>
              <Tag color="volcano" className="text-[10px] m-0 font-bold px-1 py-0">
                {calculation.applied_card_fee_percent || calculation.card_fee_percent}%
              </Tag>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between py-1 border-b border-slate-100">
          <span className="text-slate-500">Condição de Parcelamento (Etapa D):</span>
          <span className="font-bold text-slate-800">
            Até {calculation.max_installments}x de {formatCurrency(calculation.max_installment_value || (calculation.card_sale_total / (calculation.max_installments || 1)))} sem juros
          </span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-slate-100">
          <span className="text-slate-500">Desconto no PIX (Etapa E):</span>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-emerald-700">
              -{formatCurrency(calculation.pix_discount_amount)}
            </span>
            <Tag color="green" className="text-[10px] m-0 font-bold px-1 py-0">
              -{calculation.pix_discount_percent}%
            </Tag>
          </div>
        </div>

        <div className="flex items-center justify-between py-1">
          <span className="text-slate-500">Garantia Padrão:</span>
          <Tag
            color="geekblue"
            icon={<SafetyCertificateOutlined />}
            className="text-xs m-0 px-2 py-0.5 font-medium"
          >
            90 Dias Corridos
          </Tag>
        </div>
      </div>

      {/* Destaque do Valor Final a Cobrar */}
      <div className="mt-4 p-3.5 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Valor a Cobrar do Cliente ({isPix ? 'PIX' : 'Cartão'})
          </div>
          <div className="text-2xl sm:text-3xl font-black text-orange-400 mt-0.5">
            {formatCurrency(calculation.final_sale_total)}
          </div>
        </div>
        <div className="w-full sm:w-auto text-left sm:text-right">
          {isPix ? (
            <div className="bg-emerald-950/80 border border-emerald-600/50 rounded-lg px-2.5 py-1.5 text-emerald-400 text-xs inline-block sm:block">
              <span className="font-bold flex items-center gap-1">
                <CheckCircleOutlined /> Desconto de {calculation.pix_discount_percent}%
              </span>
              <span className="text-[11px] block text-emerald-300">
                Economia: {formatCurrency(calculation.pix_discount_amount)}
              </span>
            </div>
          ) : (
            <div className="bg-blue-950/80 border border-blue-600/50 rounded-lg px-2.5 py-1.5 text-blue-300 text-xs inline-block sm:block">
              <span className="font-bold block">
                {calculation.installments_count || 1}x de{' '}
                {formatCurrency(
                  calculation.card_sale_total / (calculation.installments_count || 1)
                )}
              </span>
              <span className="text-[10px] text-blue-400 block">
                Sem juros no cartão
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

'use client';

import React from 'react';
import { Card, Descriptions, Tag, Typography, Divider, Alert, Space } from 'antd';
import {
  DollarOutlined,
  ThunderboltOutlined,
  CreditCardOutlined,
  CarOutlined,
  SafetyCertificateOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { PricingCalculationResult, PaymentMethod } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';

const { Text, Title } = Typography;

interface PricingSummaryCardProps {
  calculation: PricingCalculationResult;
  paymentMethod: PaymentMethod;
}

export const PricingSummaryCard: React.FC<PricingSummaryCardProps> = ({
  calculation,
  paymentMethod,
}) => {
  const isPix = paymentMethod === 'PIX' || paymentMethod === 'DINHEIRO';

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <Space>
            <DollarOutlined className="text-orange-500 text-lg" />
            <span className="font-bold text-slate-800">Motor de Precificação (PEÇA EXPRESSA)</span>
          </Space>
          <Tag color={isPix ? 'green' : 'blue'} className="px-3 py-1 font-semibold text-xs rounded-full">
            {isPix ? '⚡ Pagamento no PIX / À Vista' : '💳 Pagamento no Cartão'}
          </Tag>
        </div>
      }
      className="shadow-sm border-slate-200"
      bodyStyle={{ padding: '18px 20px' }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Card 1: Custo Original */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <Text type="secondary" className="text-xs uppercase font-medium">
            1. Custo Original (Loja Física)
          </Text>
          <div className="text-xl font-bold text-slate-700 mt-1">
            {formatCurrency(calculation.original_cost_total)}
          </div>
          <Text className="text-xs text-slate-500 mt-0.5 block">
            {calculation.total_items_count} {calculation.total_items_count === 1 ? 'item' : 'itens'} na nota
          </Text>
        </div>

        {/* Card 2: Margem + Frete */}
        <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-xl">
          <div className="flex items-center justify-between">
            <Text type="secondary" className="text-xs uppercase font-medium text-orange-800">
              2. Margem & Frete Fixo
            </Text>
            <Tag color="orange" className="text-[11px] font-mono m-0">
              +{calculation.profit_margin_percent}%
            </Tag>
          </div>
          <div className="text-xl font-bold text-orange-950 mt-1">
            {formatCurrency(calculation.subtotal_with_freight)}
          </div>
          <div className="text-xs text-orange-700 mt-0.5 flex justify-between">
            <span>Margem: +{formatCurrency(calculation.margin_amount)}</span>
            <span>Frete: +R$ 15,00</span>
          </div>
        </div>

        {/* Card 3: Lucro Líquido Real */}
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl">
          <div className="flex items-center justify-between">
            <Text className="text-xs uppercase font-bold text-emerald-800">
              Lucro Líquido Real
            </Text>
            <Tag color="success" className="text-[11px] font-bold m-0 flex items-center gap-1">
              <ArrowUpOutlined /> {calculation.net_margin_percent.toFixed(1)}%
            </Tag>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {formatCurrency(calculation.net_profit)}
          </div>
          <Text className="text-xs text-emerald-600 mt-0.5 block">
            Líquido já descontado frete e taxas
          </Text>
        </div>
      </div>

      <Divider className="my-3 border-slate-200" />

      {/* Detalhamento das Etapas */}
      <Descriptions size="small" column={{ xs: 1, sm: 2, md: 2 }} className="text-xs">
        <Descriptions.Item label="Subtotal com Margem (Etapa A)">
          <span className="font-semibold text-slate-700">{formatCurrency(calculation.subtotal_with_margin)}</span>
        </Descriptions.Item>
        <Descriptions.Item label="Frete Fixo Rateado (Etapa B)">
          <span className="font-semibold text-slate-700">{formatCurrency(calculation.freight_cost)} ({formatCurrency(calculation.freight_per_item)}/peça)</span>
        </Descriptions.Item>
        <Descriptions.Item label="Total no Cartão (Etapa C)">
          <Space size={4}>
            <span className="font-semibold text-blue-700">{formatCurrency(calculation.card_sale_total)}</span>
            <Tag color="blue" className="text-[10px] m-0">+{calculation.card_fee_percent}% Maquininha</Tag>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Condição de Parcelamento (Etapa D)">
          <span className="font-semibold text-slate-800">
            Até {calculation.max_installments}x de {formatCurrency(calculation.installment_value)} sem juros
          </span>
        </Descriptions.Item>
        <Descriptions.Item label="Desconto PIX Aplicado (Etapa E)">
          <Space size={4}>
            <span className="font-semibold text-emerald-700">-{formatCurrency(calculation.pix_discount_amount)}</span>
            <Tag color="green" className="text-[10px] m-0">-{calculation.pix_discount_percent}%</Tag>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Garantia Padrão PEÇA EXPRESSA">
          <Tag color="geekblue" icon={<SafetyCertificateOutlined />} className="text-xs">
            90 Dias Corridos
          </Tag>
        </Descriptions.Item>
      </Descriptions>

      {/* Destaque do Valor Final */}
      <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
            Valor Final a Cobrar do Cliente ({paymentMethod})
          </div>
          <div className="text-2xl sm:text-3xl font-black text-orange-400 mt-0.5">
            {formatCurrency(calculation.final_sale_total)}
          </div>
        </div>
        <div className="text-right">
          {isPix ? (
            <div className="bg-emerald-950/80 border border-emerald-600/50 rounded-lg px-3 py-1.5 text-emerald-400 text-xs">
              <span className="font-bold flex items-center gap-1">
                <CheckCircleOutlined /> Desconto de {calculation.pix_discount_percent}% aplicado
              </span>
              <span>Economia de {formatCurrency(calculation.pix_discount_amount)}</span>
            </div>
          ) : (
            <div className="bg-blue-950/80 border border-blue-600/50 rounded-lg px-3 py-1.5 text-blue-300 text-xs">
              <span className="font-bold">
                {calculation.max_installments}x de {formatCurrency(calculation.installment_value)}
              </span>
              <span className="block text-[11px] text-blue-400">Sem juros no cartão de crédito</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

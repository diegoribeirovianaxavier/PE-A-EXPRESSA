'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  InputNumber,
  Radio,
  Row,
  Col,
  Table,
  Typography,
  Tag,
  Descriptions,
  Space,
  Divider,
} from 'antd';
import {
  CalculatorOutlined,
  ThunderboltOutlined,
  CreditCardOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { PaymentMethod } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';

const { Title, Text, Paragraph } = Typography;

export const PricingSimulator: React.FC = () => {
  const [costInput, setCostInput] = useState<number>(250);
  const [itemsCount, setItemsCount] = useState<number>(1);
  const [method, setMethod] = useState<PaymentMethod>('PIX');

  const calculation = useMemo(() => {
    return PricingEngine.calculate(
      [
        {
          item_code: 'SIMULACAO',
          item_name: 'Item de Teste para Simulação',
          brand: 'Marca Teste',
          quantity: itemsCount,
          original_unit_cost: itemsCount > 0 ? costInput / itemsCount : costInput,
        },
      ],
      method
    );
  }, [costInput, itemsCount, method]);

  // Tabela de Margens de Referência
  const marginColumns = [
    { title: 'Faixa de Custo Bruto (NF)', dataIndex: 'range', key: 'range' },
    {
      title: 'Margem Etapa A',
      dataIndex: 'margin',
      key: 'margin',
      render: (v: string) => <Tag color="orange" className="font-bold">{v}</Tag>,
    },
  ];

  const marginData = [
    { key: '1', range: 'Até R$ 100,00', margin: '+17.0%' },
    { key: '2', range: 'R$ 100,01 até R$ 200,00', margin: '+13.0%' },
    { key: '3', range: 'R$ 200,01 até R$ 300,00', margin: '+10.0%' },
    { key: '4', range: 'R$ 300,01 até R$ 400,00', margin: '+8.5%' },
    { key: '5', range: 'R$ 400,01 até R$ 500,00', margin: '+7.0%' },
    { key: '6', range: 'R$ 500,01 até R$ 600,00', margin: '+6.5%' },
    { key: '7', range: 'Acima de R$ 600,00', margin: '+6.0%' },
  ];

  // Tabela de Taxas de Cartão & Parcelamento
  const cardFeeColumns = [
    { title: 'Subtotal Etapa A', dataIndex: 'range', key: 'range' },
    {
      title: 'Taxa Maquininha (Etapa C)',
      dataIndex: 'fee',
      key: 'fee',
      render: (v: string) => <Tag color="blue" className="font-bold">{v}</Tag>,
    },
    {
      title: 'Parcelamento Sem Juros (Etapa D)',
      dataIndex: 'installments',
      key: 'installments',
      render: (v: string) => <Tag color="cyan">{v}</Tag>,
    },
    {
      title: 'Desconto PIX (Etapa E)',
      dataIndex: 'pixDiscount',
      key: 'pixDiscount',
      render: (v: string) => <Tag color="green" className="font-bold">{v}</Tag>,
    },
  ];

  const cardFeeData = [
    { key: '1', range: 'Até R$ 149,99', fee: '+5.39%', installments: 'Até 2x', pixDiscount: '6.09%' },
    { key: '2', range: 'R$ 150,00 a R$ 399,99', fee: '+6.12%', installments: 'Até 3x', pixDiscount: '7.01%' },
    { key: '3', range: 'R$ 400,00 a R$ 499,99', fee: '+6.85%', installments: 'Até 4x', pixDiscount: '7.91%' },
    { key: '4', range: 'R$ 500,00 a R$ 599,99', fee: '+7.57%', installments: 'Até 5x', pixDiscount: '8.80%' },
    { key: '5', range: 'R$ 600,00 a R$ 999,99', fee: '+8.28%', installments: 'Até 6x', pixDiscount: '9.67%' },
    { key: '6', range: 'A partir de R$ 1.000,00', fee: '+11.06%', installments: 'Até 10x', pixDiscount: '10.00%' },
  ];

  return (
    <div className="space-y-6">
      <Row gutter={[20, 20]}>
        {/* Painel Interativo de Simulação */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <CalculatorOutlined className="text-orange-500 text-lg" />
                <span className="font-bold text-slate-800">Simulador de Precificação em Tempo Real</span>
              </Space>
            }
            className="border-slate-200 shadow-sm"
          >
            <div className="space-y-4">
              <div>
                <Text strong className="text-slate-700 block mb-1 text-sm">
                  Custo Bruto Total na Loja Física (R$)
                </Text>
                <InputNumber
                  min={1}
                  max={50000}
                  step={10}
                  precision={2}
                  prefix="R$"
                  value={costInput}
                  onChange={(v) => setCostInput(v || 0)}
                  className="w-full text-lg font-bold"
                  size="large"
                />
              </div>

              <Row gutter={16}>
                <Col span={12}>
                  <Text strong className="text-slate-700 block mb-1 text-xs">
                    Quantidade de Peças
                  </Text>
                  <InputNumber
                    min={1}
                    max={100}
                    value={itemsCount}
                    onChange={(v) => setItemsCount(v || 1)}
                    className="w-full"
                  />
                </Col>

                <Col span={12}>
                  <Text strong className="text-slate-700 block mb-1 text-xs">
                    Forma de Pagamento
                  </Text>
                  <Radio.Group
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    buttonStyle="solid"
                    className="w-full flex"
                  >
                    <Radio.Button value="PIX" className="flex-1 text-center font-semibold">
                      PIX
                    </Radio.Button>
                    <Radio.Button value="CARTAO" className="flex-1 text-center font-semibold">
                      Cartão
                    </Radio.Button>
                  </Radio.Group>
                </Col>
              </Row>

              <Divider className="my-2" />

              {/* Roteiro Passo a Passo do Cálculo */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">1. Custo Original (Loja Física):</span>
                  <span className="font-bold text-slate-800">{formatCurrency(calculation.original_cost_total)}</span>
                </div>
                <div className="flex justify-between items-center text-orange-800">
                  <span>2. Margem Etapa A (+{calculation.profit_margin_percent}%):</span>
                  <span className="font-bold">+{formatCurrency(calculation.margin_amount)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>3. Subtotal com Margem:</span>
                  <span className="font-semibold">{formatCurrency(calculation.subtotal_with_margin)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>4. Frete Fixo (Etapa B):</span>
                  <span className="font-semibold">+R$ 15,00 ({formatCurrency(calculation.freight_per_item)}/peça)</span>
                </div>
                <div className="flex justify-between items-center text-blue-700">
                  <span>5. Total no Cartão (Etapa C / +{calculation.card_fee_percent}%):</span>
                  <span className="font-bold">{formatCurrency(calculation.card_sale_total)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>6. Parcelamento Permitido (Etapa D):</span>
                  <span className="font-semibold">Até {calculation.max_installments}x de {formatCurrency(calculation.installment_value)}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-700">
                  <span>7. Desconto no PIX (Etapa E / -{calculation.pix_discount_percent}%):</span>
                  <span className="font-bold">-{formatCurrency(calculation.pix_discount_amount)}</span>
                </div>
              </div>

              {/* Card Destaque de Resultado */}
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Valor Final ao Cliente ({method}):</span>
                  <span className="text-2xl font-black text-orange-400">{formatCurrency(calculation.final_sale_total)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-xs text-emerald-400 font-bold uppercase">Lucro Líquido Real:</span>
                  <span className="text-lg font-black text-emerald-400">
                    +{formatCurrency(calculation.net_profit)} ({calculation.net_margin_percent.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* Tabelas de Referência das Regras da PEÇA EXPRESSA */}
        <Col xs={24} lg={12} className="space-y-6">
          {/* Tabela de Margens */}
          <Card
            title={<span className="font-bold text-slate-800 text-sm">Tabela 1: Margem Bruta (Etapa A)</span>}
            className="border-slate-200 shadow-sm"
            bodyStyle={{ padding: 0 }}
          >
            <Table
              dataSource={marginData}
              columns={marginColumns}
              pagination={false}
              size="small"
            />
          </Card>

          {/* Tabela de Taxas e Descontos */}
          <Card
            title={<span className="font-bold text-slate-800 text-sm">Tabela 2: Taxas de Cartão, Parcelamento e PIX (Etapas C, D, E)</span>}
            className="border-slate-200 shadow-sm"
            bodyStyle={{ padding: 0 }}
          >
            <Table
              dataSource={cardFeeData}
              columns={cardFeeColumns}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

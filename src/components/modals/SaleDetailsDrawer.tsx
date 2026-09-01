'use client';

import React, { useState } from 'react';
import { Drawer, Descriptions, Tag, Table, Button, Space, Typography, Divider, Alert, Tooltip, message } from 'antd';
import {
  WhatsAppOutlined,
  CopyOutlined,
  FileImageOutlined,
  SafetyCertificateOutlined,
  CheckOutlined,
  CarOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { Sale, SaleItem } from '@/lib/types';
import {
  formatCurrency,
  formatPhone,
  calculateWarrantyStatus,
  generateWhatsAppQuoteText,
  getWhatsAppUrl,
  dayjs,
} from '@/lib/formatters';
import { PricingEngine } from '@/lib/pricing/PricingEngine';

const { Text, Title } = Typography;

interface SaleDetailsDrawerProps {
  visible: boolean;
  onClose: () => void;
  sale: Sale | null;
  onViewInvoice?: (url?: string, invoiceNum?: string, clientName?: string) => void;
}

export const SaleDetailsDrawer: React.FC<SaleDetailsDrawerProps> = ({
  visible,
  onClose,
  sale,
  onViewInvoice,
}) => {
  const [copied, setCopied] = useState(false);

  if (!sale) return null;

  const warranty = calculateWarrantyStatus(sale.warranty_deadline || sale.sale_date);

  // Recalcula o orçamento WhatsApp baseado nos itens gravados
  const itemsForCalc = (sale.items || []).map((it) => ({
    item_code: it.item_code,
    item_name: it.item_name,
    brand: it.brand,
    quantity: it.quantity,
    original_unit_cost: it.original_unit_cost,
  }));

  const calcResult = PricingEngine.calculate(itemsForCalc, sale.payment_method);
  const quoteText = generateWhatsAppQuoteText(calcResult, sale.original_invoice_number || 'S/N');

  const handleCopyQuote = async () => {
    try {
      await navigator.clipboard.writeText(quoteText);
      setCopied(true);
      message.success('Orçamento copiado para o WhatsApp!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      message.error('Erro ao copiar.');
    }
  };

  const handleOpenWhatsApp = () => {
    if (!sale.client_phone) {
      message.warning('Cliente sem telefone cadastrado.');
      return;
    }
    const url = getWhatsAppUrl(sale.client_phone, quoteText);
    window.open(url, '_blank');
  };

  const itemColumns = [
    {
      title: 'Código',
      dataIndex: 'item_code',
      key: 'item_code',
      width: 100,
      render: (val: string) => <span className="font-mono text-xs font-semibold">{val || '-'}</span>,
    },
    {
      title: 'Descrição da Peça',
      dataIndex: 'item_name',
      key: 'item_name',
      render: (val: string, record: SaleItem) => (
        <div>
          <div className="font-medium text-slate-800">{val}</div>
          <div className="text-xs text-slate-400">Marca: {record.brand || 'Original'}</div>
        </div>
      ),
    },
    {
      title: 'Qtd',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 60,
      align: 'center' as const,
    },
    {
      title: 'Custo Unit.',
      dataIndex: 'original_unit_cost',
      key: 'original_unit_cost',
      width: 110,
      align: 'right' as const,
      render: (v: number) => <span className="text-slate-500 text-xs">{formatCurrency(v)}</span>,
    },
    {
      title: 'Preço Venda Unit.',
      dataIndex: 'final_unit_price',
      key: 'final_unit_price',
      width: 130,
      align: 'right' as const,
      render: (v: number) => <span className="font-medium text-slate-800">{formatCurrency(v)}</span>,
    },
    {
      title: 'Total Final',
      dataIndex: 'final_total_price',
      key: 'final_total_price',
      width: 120,
      align: 'right' as const,
      render: (v: number) => <span className="font-bold text-orange-600">{formatCurrency(v)}</span>,
    },
  ];

  return (
    <Drawer
      open={visible}
      onClose={onClose}
      width={720}
      title={
        <div className="flex items-center justify-between">
          <Space>
            <span className="font-bold text-slate-800">Detalhes da Venda</span>
            <Tag color="orange" className="font-mono">
              {sale.original_invoice_number || 'Sem NF'}
            </Tag>
          </Space>
          <Tag color={warranty.badgeColor} className="font-medium text-xs">
            {warranty.badgeText}
          </Tag>
        </div>
      }
      extra={
        <Space>
          {sale.invoice_file_url && (
            <Button
              icon={<FileImageOutlined />}
              onClick={() => onViewInvoice && onViewInvoice(sale.invoice_file_url, sale.original_invoice_number, sale.client_name)}
            >
              Ver Nota/Foto
            </Button>
          )}
          <Button
            type="primary"
            icon={copied ? <CheckOutlined /> : <CopyOutlined />}
            onClick={handleCopyQuote}
            className="!bg-emerald-600 hover:!bg-emerald-700"
          >
            {copied ? 'Copiado!' : 'Copiar Orçamento'}
          </Button>
        </Space>
      }
    >
      <div className="space-y-6">
        {/* Status de Garantia */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          warranty.isExpired 
            ? 'bg-red-50 border-red-200 text-red-900' 
            : warranty.isExpiringSoon
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <div className="flex items-center gap-3">
            <SafetyCertificateOutlined className="text-2xl" />
            <div>
              <div className="font-bold text-sm">
                Status da Garantia: {warranty.badgeText}
              </div>
              <div className="text-xs opacity-80">
                Prazo limite de 90 dias até: <strong>{warranty.deadlineFormatted}</strong>
              </div>
            </div>
          </div>
          {sale.client_phone && (
            <Button
              type="primary"
              size="small"
              icon={<WhatsAppOutlined />}
              onClick={handleOpenWhatsApp}
              className="!bg-emerald-600 hover:!bg-emerald-700"
            >
              Chamar Cliente
            </Button>
          )}
        </div>

        {/* Informações do Cliente e Veículo */}
        <div>
          <Title level={5} className="!text-slate-800 !mb-3 flex items-center gap-2">
            <UserOutlined className="text-orange-500" /> Dados do Cliente & Veículo
          </Title>
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Cliente">
              <strong>{sale.client_name}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Telefone / WhatsApp">
              <Space>
                <span>{formatPhone(sale.client_phone) || '-'}</span>
                {sale.client_phone && (
                  <Button
                    type="link"
                    size="small"
                    icon={<WhatsAppOutlined className="text-emerald-600" />}
                    onClick={handleOpenWhatsApp}
                    className="p-0 h-auto"
                  />
                )}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Veículo / Modelo">
              <Space>
                <CarOutlined className="text-slate-400" />
                <span>{sale.car_model || 'Não especificado'}</span>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Data da Venda">
              <Space>
                <ClockCircleOutlined className="text-slate-400" />
                <span>{dayjs(sale.sale_date).format('DD/MM/YYYY')} ({dayjs(sale.sale_date).fromNow()})</span>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Forma de Pagamento">
              <Tag color={sale.payment_method === 'PIX' ? 'green' : 'blue'}>
                {sale.payment_method} {sale.installments_count > 1 ? `(${sale.installments_count}x)` : ''}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status da Ordem">
              <Tag color="cyan">{sale.status}</Tag>
            </Descriptions.Item>
            {sale.notes && (
              <Descriptions.Item label="Observações" span={2}>
                <span className="text-slate-600 italic">{sale.notes}</span>
              </Descriptions.Item>
            )}
          </Descriptions>
        </div>

        {/* Tabela de Itens */}
        <div>
          <Title level={5} className="!text-slate-800 !mb-3">
            Peças e Autopeças da Venda ({(sale.items || []).length})
          </Title>
          <Table
            dataSource={sale.items || []}
            columns={itemColumns}
            rowKey="id"
            pagination={false}
            size="small"
            bordered
            className="bg-white rounded-lg border border-slate-200"
          />
        </div>

        {/* Resumo Financeiro */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="text-xs uppercase font-bold text-slate-500 tracking-wider">
            Auditoria Financeira da Venda
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500 uppercase">Custo Bruto (NF)</div>
              <div className="text-sm font-bold text-slate-700 mt-0.5">
                {formatCurrency(sale.original_cost_total)}
              </div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500 uppercase">Margem Aplicada</div>
              <div className="text-sm font-bold text-orange-600 mt-0.5">
                +{sale.profit_margin_percent}%
              </div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500 uppercase">Total Pago Cliente</div>
              <div className="text-base font-black text-slate-900 mt-0.5">
                {formatCurrency(sale.final_sale_total)}
              </div>
            </div>
            <div className="bg-emerald-100/80 p-2.5 rounded-lg border border-emerald-300">
              <div className="text-[11px] text-emerald-800 uppercase font-bold">Lucro Líquido Real</div>
              <div className="text-base font-black text-emerald-700 mt-0.5">
                {formatCurrency(sale.net_profit)}
              </div>
            </div>
          </div>
        </div>

        {/* Visualizador do Orçamento Formatado */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Title level={5} className="!text-slate-800 !mb-0">
              Orçamento WhatsApp
            </Title>
            <Button
              size="small"
              icon={copied ? <CheckOutlined /> : <CopyOutlined />}
              onClick={handleCopyQuote}
            >
              {copied ? 'Copiado' : 'Copiar Texto'}
            </Button>
          </div>
          <pre className="whatsapp-preview-box p-3 rounded-lg font-mono text-xs text-slate-800 border border-[#d2c8bc] whitespace-pre-wrap select-all">
            {quoteText}
          </pre>
        </div>
      </div>
    </Drawer>
  );
};

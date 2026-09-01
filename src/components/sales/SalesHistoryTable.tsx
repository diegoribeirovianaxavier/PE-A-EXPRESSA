'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  Card,
  Input,
  Select,
  Tag,
  Button,
  Space,
  Typography,
  Tooltip,
  Popconfirm,
  Badge,
  DatePicker,
  Row,
  Col,
  message,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  DeleteOutlined,
  FileImageOutlined,
  WhatsAppOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CarOutlined,
  UserOutlined,
  FileTextOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Sale } from '@/lib/types';
import {
  formatCurrency,
  formatPhone,
  calculateWarrantyStatus,
  generateWhatsAppQuoteText,
  getWhatsAppUrl,
  dayjs,
} from '@/lib/formatters';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { InvoiceViewerModal } from '../modals/InvoiceViewerModal';
import { SaleDetailsDrawer } from '../modals/SaleDetailsDrawer';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

interface SalesHistoryTableProps {
  sales: Sale[];
  loading?: boolean;
  onRefresh?: () => void;
  onDeleteSale?: (saleId: string) => void;
  onNewSaleClick?: () => void;
}

export const SalesHistoryTable: React.FC<SalesHistoryTableProps> = ({
  sales,
  loading = false,
  onRefresh,
  onDeleteSale,
  onNewSaleClick,
}) => {
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [warrantyFilter, setWarrantyFilter] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<any>(null);

  // Modais e Drawers
  const [selectedSaleForDrawer, setSelectedSaleForDrawer] = useState<Sale | null>(null);
  const [invoiceModalData, setInvoiceModalData] = useState<{
    visible: boolean;
    fileUrl?: string;
    invoiceNumber?: string;
    clientName?: string;
  }>({
    visible: false,
  });

  // Filtragem dos dados
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // 1. Busca textual global
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const client = (sale.client_name || '').toLowerCase();
        const phone = (sale.client_phone || '').replace(/\D/g, '');
        const car = (sale.car_model || '').toLowerCase();
        const inv = (sale.original_invoice_number || '').toLowerCase();
        const itemsMatch = (sale.items || []).some(
          it =>
            (it.item_name || '').toLowerCase().includes(term) ||
            (it.item_code || '').toLowerCase().includes(term) ||
            (it.brand || '').toLowerCase().includes(term)
        );

        if (
          !client.includes(term) &&
          !phone.includes(term.replace(/\D/g, '')) &&
          !car.includes(term) &&
          !inv.includes(term) &&
          !itemsMatch
        ) {
          return false;
        }
      }

      // 2. Filtro de forma de pagamento
      if (paymentFilter !== 'ALL' && sale.payment_method !== paymentFilter) {
        return false;
      }

      // 3. Filtro de garantia
      if (warrantyFilter !== 'ALL') {
        const w = calculateWarrantyStatus(sale.warranty_deadline || sale.sale_date);
        if (warrantyFilter === 'ACTIVE' && (w.isExpired || w.isExpiringSoon)) return false;
        if (warrantyFilter === 'EXPIRING' && !w.isExpiringSoon) return false;
        if (warrantyFilter === 'EXPIRED' && !w.isExpired) return false;
      }

      // 4. Filtro de Data
      if (dateRange && dateRange[0] && dateRange[1]) {
        const saleDate = dayjs(sale.sale_date);
        const start = dateRange[0].startOf('day');
        const end = dateRange[1].endOf('day');
        if (saleDate.isBefore(start) || saleDate.isAfter(end)) {
          return false;
        }
      }

      return true;
    });
  }, [sales, searchTerm, paymentFilter, warrantyFilter, dateRange]);

  const handleCopyQuote = (sale: Sale) => {
    const itemsForCalc = (sale.items || []).map((it) => ({
      item_code: it.item_code,
      item_name: it.item_name,
      brand: it.brand,
      quantity: it.quantity,
      original_unit_cost: it.original_unit_cost,
    }));

    const calc = PricingEngine.calculate(itemsForCalc, sale.payment_method);
    const text = generateWhatsAppQuoteText(calc, sale.original_invoice_number || 'S/N');

    navigator.clipboard.writeText(text);
    message.success(`Orçamento da venda ${sale.original_invoice_number || ''} copiado com sucesso!`);
  };

  const handleExportCSV = () => {
    const headers = [
      'Data Venda',
      'NF Original',
      'Cliente',
      'Telefone',
      'Veiculo',
      'Pagamento',
      'Custo Bruto (R$)',
      'Total Venda (R$)',
      'Lucro Liquido (R$)',
      'Garantia Ate',
    ];

    const rows = filteredSales.map(s => [
      dayjs(s.sale_date).format('DD/MM/YYYY'),
      s.original_invoice_number || 'S/N',
      `"${s.client_name}"`,
      s.client_phone || '',
      `"${s.car_model || ''}"`,
      s.payment_method,
      s.original_cost_total.toFixed(2),
      s.final_sale_total.toFixed(2),
      s.net_profit.toFixed(2),
      dayjs(s.warranty_deadline).format('DD/MM/YYYY'),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vendas_peca_expressa_${dayjs().format('YYYY-MM-DD')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Relatório CSV exportado com sucesso!');
  };

  const columns = [
    {
      title: 'Data & NF',
      key: 'date_nf',
      width: 140,
      render: (_: any, record: Sale) => (
        <div>
          <div className="font-semibold text-slate-800 text-xs">
            {dayjs(record.sale_date).format('DD/MM/YYYY')}
          </div>
          <Tag color="orange" className="font-mono text-[11px] mt-0.5 m-0">
            {record.original_invoice_number || 'Sem NF'}
          </Tag>
        </div>
      ),
      sorter: (a: Sale, b: Sale) => dayjs(a.sale_date).unix() - dayjs(b.sale_date).unix(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Cliente & Contato',
      key: 'client',
      render: (_: any, record: Sale) => (
        <div>
          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <UserOutlined className="text-slate-400 text-xs" />
            {record.client_name}
          </div>
          {record.client_phone && (
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <a
                href={getWhatsAppUrl(record.client_phone)}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
              >
                <WhatsAppOutlined /> {formatPhone(record.client_phone)}
              </a>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Veículo',
      dataIndex: 'car_model',
      key: 'car_model',
      render: (val: string) => (
        <div className="text-slate-700 text-xs flex items-center gap-1">
          <CarOutlined className="text-slate-400" />
          <span>{val || '-'}</span>
        </div>
      ),
    },
    {
      title: 'Valor & Pagamento',
      key: 'total',
      align: 'right' as const,
      render: (_: any, record: Sale) => (
        <div className="text-right">
          <div className="font-black text-slate-900 text-sm">
            {formatCurrency(record.final_sale_total)}
          </div>
          <Tag
            color={record.payment_method === 'PIX' ? 'green' : 'blue'}
            className="text-[10px] mt-0.5 m-0 font-semibold"
          >
            {record.payment_method} {record.installments_count > 1 ? `${record.installments_count}x` : ''}
          </Tag>
        </div>
      ),
      sorter: (a: Sale, b: Sale) => a.final_sale_total - b.final_sale_total,
    },
    {
      title: (
        <Space size={2}>
          <span>Lucro Líquido</span>
          <Tooltip title="Lucro líquido real apurado após custo de compra, frete R$15 e taxas">
            <span className="text-slate-400 text-xs cursor-help">ℹ️</span>
          </Tooltip>
        </Space>
      ),
      key: 'net_profit',
      align: 'right' as const,
      width: 140,
      render: (_: any, record: Sale) => (
        <div className="text-right">
          <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-xs border border-emerald-200">
            +{formatCurrency(record.net_profit)}
          </span>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Custo: {formatCurrency(record.original_cost_total)}
          </div>
        </div>
      ),
      sorter: (a: Sale, b: Sale) => a.net_profit - b.net_profit,
    },
    {
      title: 'Garantia (90 Dias)',
      key: 'warranty',
      width: 170,
      render: (_: any, record: Sale) => {
        const warranty = calculateWarrantyStatus(record.warranty_deadline || record.sale_date);
        return (
          <div>
            <Tag color={warranty.badgeColor} className="font-semibold text-[11px] m-0">
              {warranty.badgeText}
            </Tag>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Até: {warranty.deadlineFormatted}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Ações',
      key: 'actions',
      align: 'center' as const,
      width: 160,
      render: (_: any, record: Sale) => (
        <Space size="small">
          {/* Visualizar Foto/PDF */}
          <Tooltip title={record.invoice_file_url ? 'Visualizar Comprovante / NF' : 'Sem anexo'}>
            <Button
              type="text"
              size="small"
              icon={<FileImageOutlined />}
              disabled={!record.invoice_file_url}
              onClick={() =>
                setInvoiceModalData({
                  visible: true,
                  fileUrl: record.invoice_file_url,
                  invoiceNumber: record.original_invoice_number,
                  clientName: record.client_name,
                })
              }
              className="text-slate-600 hover:text-orange-500"
            />
          </Tooltip>

          {/* Ver Detalhes */}
          <Tooltip title="Ver Detalhes e Peças">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => setSelectedSaleForDrawer(record)}
              className="text-blue-600 hover:text-blue-700"
            />
          </Tooltip>

          {/* Copiar WhatsApp */}
          <Tooltip title="Copiar Orçamento WhatsApp">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyQuote(record)}
              className="text-emerald-600 hover:text-emerald-700"
            />
          </Tooltip>

          {/* Excluir Venda */}
          {onDeleteSale && (
            <Popconfirm
              title="Excluir Venda"
              description="Tem certeza que deseja remover esta venda do histórico?"
              okText="Sim, excluir"
              cancelText="Cancelar"
              okButtonProps={{ danger: true }}
              onConfirm={() => onDeleteSale(record.id)}
            >
              <Tooltip title="Excluir Venda">
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Barra Superior de Filtros */}
      <Card className="border-slate-200 shadow-sm" bodyStyle={{ padding: '16px 20px' }}>
        <Row gutter={[16, 16]} align="middle">
          {/* Busca Global */}
          <Col xs={24} md={8}>
            <Input
              placeholder="Buscar cliente, carro, NF ou código de peça..."
              prefix={<SearchOutlined className="text-slate-400" />}
              allowClear
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </Col>

          {/* Filtro de Pagamento */}
          <Col xs={12} sm={6} md={4}>
            <Select
              value={paymentFilter}
              onChange={(v) => setPaymentFilter(v)}
              className="w-full"
              options={[
                { value: 'ALL', label: 'Todos Pagamentos' },
                { value: 'PIX', label: '⚡ PIX / À Vista' },
                { value: 'CARTAO', label: '💳 Cartão de Crédito' },
              ]}
            />
          </Col>

          {/* Filtro de Garantia */}
          <Col xs={12} sm={6} md={4}>
            <Select
              value={warrantyFilter}
              onChange={(v) => setWarrantyFilter(v)}
              className="w-full"
              options={[
                { value: 'ALL', label: 'Todas Garantias' },
                { value: 'ACTIVE', label: '🟢 Garantia Ativa' },
                { value: 'EXPIRING', label: '🟡 Expira em Breve' },
                { value: 'EXPIRED', label: '🔴 Garantia Expirada' },
              ]}
            />
          </Col>

          {/* Range de Datas */}
          <Col xs={24} sm={12} md={5}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates)}
              format="DD/MM/YYYY"
              placeholder={['Início', 'Fim']}
              className="w-full"
            />
          </Col>

          {/* Ações */}
          <Col xs={24} sm={12} md={3} className="flex justify-end gap-2">
            <Tooltip title="Atualizar Dados">
              <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading} />
            </Tooltip>
            <Tooltip title="Exportar para Planilha CSV">
              <Button icon={<DownloadOutlined />} onClick={handleExportCSV}>
                CSV
              </Button>
            </Tooltip>
          </Col>
        </Row>
      </Card>

      {/* Tabela de Vendas */}
      <Card
        title={
          <div className="flex items-center justify-between">
            <Space>
              <FileTextOutlined className="text-orange-500" />
              <span className="font-bold text-slate-800">
                Histórico de Vendas & Controle de Garantias ({filteredSales.length})
              </span>
            </Space>
            {onNewSaleClick && (
              <Button
                type="primary"
                onClick={onNewSaleClick}
                className="!bg-orange-500 hover:!bg-orange-600 font-semibold"
              >
                + Nova Venda
              </Button>
            )}
          </div>
        }
        className="border-slate-200 shadow-sm"
        bodyStyle={{ padding: 0 }}
      >
        <Table
          dataSource={filteredSales}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} vendas`,
          }}
          className="overflow-x-auto"
        />
      </Card>

      {/* Modal de Foto/PDF da NF */}
      <InvoiceViewerModal
        visible={invoiceModalData.visible}
        onClose={() => setInvoiceModalData({ visible: false })}
        fileUrl={invoiceModalData.fileUrl}
        invoiceNumber={invoiceModalData.invoiceNumber}
        clientName={invoiceModalData.clientName}
      />

      {/* Drawer de Detalhes da Venda */}
      <SaleDetailsDrawer
        visible={Boolean(selectedSaleForDrawer)}
        onClose={() => setSelectedSaleForDrawer(null)}
        sale={selectedSaleForDrawer}
        onViewInvoice={(url, num, client) => {
          setInvoiceModalData({
            visible: true,
            fileUrl: url,
            invoiceNumber: num,
            clientName: client,
          });
        }}
      />
    </div>
  );
};

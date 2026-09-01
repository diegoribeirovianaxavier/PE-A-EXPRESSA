'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Radio,
  DatePicker,
  Button,
  Space,
  Typography,
  Tag,
  Progress,
  Tooltip,
  Divider,
} from 'antd';
import {
  DollarOutlined,
  RiseOutlined,
  PercentageOutlined,
  ShoppingCartOutlined,
  ThunderboltOutlined,
  CreditCardOutlined,
  SafetyCertificateOutlined,
  CalendarOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Sale, DailyFinancialData, TopSellingItem, DashboardMetrics } from '@/lib/types';
import { formatCurrency, dayjs, calculateWarrantyStatus } from '@/lib/formatters';
import { RevenueProfitChart } from './RevenueProfitChart';
import { TopPartsChart } from './TopPartsChart';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type PeriodType = 'TODAY' | 'WEEK' | 'MONTH' | '30DAYS' | 'CUSTOM';

interface FinancialDashboardProps {
  sales: Sale[];
  loading?: boolean;
  onNewSaleClick?: () => void;
  onViewHistoryClick?: () => void;
}

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  sales,
  loading = false,
  onNewSaleClick,
  onViewHistoryClick,
}) => {
  const [period, setPeriod] = useState<PeriodType>('MONTH');
  const [customRange, setCustomRange] = useState<any>(null);

  // Filtra as vendas com base no período selecionado
  const filteredSales = useMemo(() => {
    const now = dayjs();

    return sales.filter((sale) => {
      const saleDate = dayjs(sale.sale_date);

      if (period === 'TODAY') {
        return saleDate.isSame(now, 'day');
      }
      if (period === 'WEEK') {
        return saleDate.isAfter(now.startOf('week')) || saleDate.isSame(now.startOf('week'), 'day');
      }
      if (period === 'MONTH') {
        return saleDate.isAfter(now.startOf('month')) || saleDate.isSame(now.startOf('month'), 'day');
      }
      if (period === '30DAYS') {
        return saleDate.isAfter(now.subtract(30, 'day'));
      }
      if (period === 'CUSTOM' && customRange && customRange[0] && customRange[1]) {
        return (
          (saleDate.isAfter(customRange[0].startOf('day')) || saleDate.isSame(customRange[0].startOf('day'), 'day')) &&
          (saleDate.isBefore(customRange[1].endOf('day')) || saleDate.isSame(customRange[1].endOf('day'), 'day'))
        );
      }
      return true;
    });
  }, [sales, period, customRange]);

  // Cálculo de Métricas Agregadas
  const metrics: DashboardMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalNetProfit = 0;
    let pixSalesCount = 0;
    let pixRevenue = 0;
    let cardSalesCount = 0;
    let cardRevenue = 0;
    let activeWarrantiesCount = 0;
    let expiringSoonWarrantiesCount = 0;
    let expiredWarrantiesCount = 0;

    filteredSales.forEach((s) => {
      totalRevenue += Number(s.final_sale_total) || 0;
      totalNetProfit += Number(s.net_profit) || 0;

      if (s.payment_method === 'PIX' || s.payment_method === 'DINHEIRO') {
        pixSalesCount += 1;
        pixRevenue += Number(s.final_sale_total) || 0;
      } else {
        cardSalesCount += 1;
        cardRevenue += Number(s.final_sale_total) || 0;
      }

      const w = calculateWarrantyStatus(s.warranty_deadline || s.sale_date);
      if (w.isExpired) {
        expiredWarrantiesCount += 1;
      } else if (w.isExpiringSoon) {
        expiringSoonWarrantiesCount += 1;
      } else {
        activeWarrantiesCount += 1;
      }
    });

    const salesCount = filteredSales.length;
    const averageMarginPercent = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;
    const averageTicket = salesCount > 0 ? totalRevenue / salesCount : 0;

    return {
      totalRevenue,
      totalNetProfit,
      averageMarginPercent,
      salesCount,
      averageTicket,
      pixSalesCount,
      pixRevenue,
      cardSalesCount,
      cardRevenue,
      activeWarrantiesCount,
      expiredWarrantiesCount,
      expiringSoonWarrantiesCount,
    };
  }, [filteredSales]);

  // Evolução Diária para o Gráfico
  const dailyChartData: DailyFinancialData[] = useMemo(() => {
    const map = new Map<string, { revenue: number; netProfit: number; salesCount: number }>();

    // Ordena do mais antigo para o mais recente
    const sorted = [...filteredSales].sort(
      (a, b) => dayjs(a.sale_date).unix() - dayjs(b.sale_date).unix()
    );

    sorted.forEach((sale) => {
      const dateKey = sale.sale_date;
      const current = map.get(dateKey) || { revenue: 0, netProfit: 0, salesCount: 0 };
      map.set(dateKey, {
        revenue: current.revenue + (Number(sale.final_sale_total) || 0),
        netProfit: current.netProfit + (Number(sale.net_profit) || 0),
        salesCount: current.salesCount + 1,
      });
    });

    return Array.from(map.entries()).map(([date, vals]) => ({
      date,
      formattedDate: dayjs(date).format('DD/MM'),
      revenue: Number(vals.revenue.toFixed(2)),
      netProfit: Number(vals.netProfit.toFixed(2)),
      salesCount: vals.salesCount,
    }));
  }, [filteredSales]);

  // Top 5 Peças Mais Vendidas
  const topItems: TopSellingItem[] = useMemo(() => {
    const itemsMap = new Map<string, { name: string; brand: string; code: string; quantity: number; totalRevenue: number }>();

    filteredSales.forEach((s) => {
      (s.items || []).forEach((it) => {
        const key = `${it.item_name}_${it.item_code || ''}`;
        const current = itemsMap.get(key) || {
          name: it.item_name,
          brand: it.brand || 'Original',
          code: it.item_code || '',
          quantity: 0,
          totalRevenue: 0,
        };

        itemsMap.set(key, {
          ...current,
          quantity: current.quantity + (Number(it.quantity) || 1),
          totalRevenue: current.totalRevenue + (Number(it.final_total_price) || 0),
        });
      });
    });

    return Array.from(itemsMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [filteredSales]);

  const pixPercent = metrics.totalRevenue > 0 ? (metrics.pixRevenue / metrics.totalRevenue) * 100 : 0;
  const cardPercent = metrics.totalRevenue > 0 ? (metrics.cardRevenue / metrics.totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Barra de Filtro de Período e Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <Title level={3} className="!mb-0 text-slate-800 flex items-center gap-2">
            <RiseOutlined className="text-orange-500" /> Dashboard Financeiro
          </Title>
          <Text type="secondary" className="text-sm">
            Faturamento bruto, lucro líquido real e controle das autopeças vendidas.
          </Text>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Radio.Group
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="TODAY">Hoje</Radio.Button>
            <Radio.Button value="WEEK">Esta Semana</Radio.Button>
            <Radio.Button value="MONTH">Este Mês</Radio.Button>
            <Radio.Button value="30DAYS">30 Dias</Radio.Button>
            <Radio.Button value="CUSTOM">Customizado</Radio.Button>
          </Radio.Group>

          {period === 'CUSTOM' && (
            <RangePicker
              value={customRange}
              onChange={(dates) => setCustomRange(dates)}
              format="DD/MM/YYYY"
              placeholder={['Início', 'Fim']}
              className="w-56"
            />
          )}

          {onNewSaleClick && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onNewSaleClick}
              className="!bg-orange-500 hover:!bg-orange-600 font-bold"
            >
              Nova Venda
            </Button>
          )}
        </div>
      </div>

      {/* Cards de Métricas Principais (AntD Statistics) */}
      <Row gutter={[16, 16]}>
        {/* 1. Faturamento Bruto */}
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover-card-glow border-slate-200 shadow-sm border-t-4 border-t-orange-500">
            <Statistic
              title={
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-600">💵 Faturamento Bruto</span>
                  <Tag color="orange" className="font-mono text-xs m-0">Vendido</Tag>
                </div>
              }
              value={metrics.totalRevenue}
              precision={2}
              prefix="R$"
              valueStyle={{ color: '#0f172a', fontWeight: 800 }}
            />
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
              <span>{metrics.salesCount} {metrics.salesCount === 1 ? 'venda' : 'vendas'}</span>
              <span>Ticket Médio: <strong>{formatCurrency(metrics.averageTicket)}</strong></span>
            </div>
          </Card>
        </Col>

        {/* 2. Lucro Líquido Real */}
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover-card-glow border-slate-200 shadow-sm border-t-4 border-t-emerald-500 bg-emerald-50/30">
            <Statistic
              title={
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-800">📈 Lucro Líquido Real</span>
                  <Tag color="success" className="font-bold text-xs m-0 flex items-center gap-0.5">
                    <RiseOutlined /> Lucro
                  </Tag>
                </div>
              }
              value={metrics.totalNetProfit}
              precision={2}
              prefix="R$"
              valueStyle={{ color: '#047857', fontWeight: 900 }}
            />
            <div className="mt-3 flex items-center justify-between text-xs text-emerald-700 border-t border-emerald-100 pt-2">
              <span>Margem Líquida Real:</span>
              <strong className="text-emerald-800">{metrics.averageMarginPercent.toFixed(1)}%</strong>
            </div>
          </Card>
        </Col>

        {/* 3. Margem Líquida Média */}
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover-card-glow border-slate-200 shadow-sm border-t-4 border-t-blue-500">
            <Statistic
              title={
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-600">🏷️ Margem Líquida Média</span>
                  <Tag color="blue" className="font-mono text-xs m-0">% Lucro</Tag>
                </div>
              }
              value={metrics.averageMarginPercent}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#0284c7', fontWeight: 800 }}
            />
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
              <span>Retorno s/ Faturamento:</span>
              <span className="text-blue-700 font-semibold">{formatCurrency(metrics.totalNetProfit)}</span>
            </div>
          </Card>
        </Col>

        {/* 4. Garantias e Pós-Venda */}
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover-card-glow border-slate-200 shadow-sm border-t-4 border-t-purple-500">
            <Statistic
              title={
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-600">🛡️ Garantias (90 Dias)</span>
                  <Tag color="purple" className="font-mono text-xs m-0">Ativas</Tag>
                </div>
              }
              value={metrics.activeWarrantiesCount}
              suffix={`/ ${metrics.salesCount}`}
              valueStyle={{ color: '#7e22ce', fontWeight: 800 }}
            />
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
              <span className="text-amber-600 font-medium">⚠️ {metrics.expiringSoonWarrantiesCount} expirando</span>
              <span className="text-slate-400">{metrics.expiredWarrantiesCount} expiradas</span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Gráficos Interativos */}
      <Row gutter={[20, 20]}>
        {/* Gráfico 1: Evolução Diária de Faturamento vs Lucro Líquido */}
        <Col xs={24} lg={15}>
          <Card
            title={
              <div className="flex items-center justify-between">
                <Space>
                  <DollarOutlined className="text-orange-500" />
                  <span className="font-bold text-slate-800">Evolução de Faturamento vs Lucro Líquido</span>
                </Space>
                <Tag color="default" className="text-xs">
                  {dailyChartData.length} dias apurados
                </Tag>
              </div>
            }
            className="border-slate-200 shadow-sm"
          >
            <RevenueProfitChart data={dailyChartData} />
          </Card>
        </Col>

        {/* Gráfico 2: Top 5 Peças Mais Vendidas */}
        <Col xs={24} lg={9}>
          <Card
            title={
              <Space>
                <ShoppingCartOutlined className="text-orange-500" />
                <span className="font-bold text-slate-800">Top 5 Peças Mais Vendidas</span>
              </Space>
            }
            className="border-slate-200 shadow-sm"
          >
            <TopPartsChart data={topItems} />
          </Card>
        </Col>
      </Row>

      {/* Distribuição de Meios de Pagamento e Resumo Rápido */}
      <Row gutter={[20, 20]}>
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <ThunderboltOutlined className="text-emerald-500" />
                <span className="font-bold text-slate-800">Distribuição: PIX vs Cartão de Crédito</span>
              </Space>
            }
            className="border-slate-200 shadow-sm"
          >
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-emerald-700 flex items-center gap-1">
                    <ThunderboltOutlined /> PIX ({metrics.pixSalesCount} vendas)
                  </span>
                  <span className="text-slate-800">{formatCurrency(metrics.pixRevenue)} ({pixPercent.toFixed(1)}%)</span>
                </div>
                <Progress percent={Math.round(pixPercent)} strokeColor="#10b981" showInfo={false} />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-blue-700 flex items-center gap-1">
                    <CreditCardOutlined /> Cartão ({metrics.cardSalesCount} vendas)
                  </span>
                  <span className="text-slate-800">{formatCurrency(metrics.cardRevenue)} ({cardPercent.toFixed(1)}%)</span>
                </div>
                <Progress percent={Math.round(cardPercent)} strokeColor="#3b82f6" showInfo={false} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <SafetyCertificateOutlined className="text-orange-500" />
                <span className="font-bold text-slate-800">Status Geral de Garantias</span>
              </Space>
            }
            extra={
              onViewHistoryClick && (
                <Button type="link" size="small" onClick={onViewHistoryClick}>
                  Ver Histórico Completo &rarr;
                </Button>
              )
            }
            className="border-slate-200 shadow-sm"
          >
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="text-2xl font-black text-emerald-700">{metrics.activeWarrantiesCount}</div>
                <div className="text-xs font-semibold text-emerald-800 mt-1">Garantia Ativa</div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="text-2xl font-black text-amber-600">{metrics.expiringSoonWarrantiesCount}</div>
                <div className="text-xs font-semibold text-amber-800 mt-1">&le; 15 Dias Restantes</div>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <div className="text-2xl font-black text-red-600">{metrics.expiredWarrantiesCount}</div>
                <div className="text-xs font-semibold text-red-800 mt-1">Garantia Expirada</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

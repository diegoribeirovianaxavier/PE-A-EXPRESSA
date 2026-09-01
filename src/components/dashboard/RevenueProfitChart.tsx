'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, Empty } from 'antd';
import { DailyFinancialData } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';

interface RevenueProfitChartProps {
  data: DailyFinancialData[];
  height?: number;
}

export const RevenueProfitChart: React.FC<RevenueProfitChartProps> = ({
  data,
  height = 320,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-[320px] flex items-center justify-center">
        <Empty description="Nenhum dado financeiro no período selecionado" />
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs font-sans">
          <div className="font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1">
            Data: {label}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between gap-4 text-orange-400">
              <span>💵 Faturamento:</span>
              <span className="font-bold">{formatCurrency(payload[0]?.value)}</span>
            </div>
            <div className="flex justify-between gap-4 text-emerald-400">
              <span>📈 Lucro Líquido:</span>
              <span className="font-bold">{formatCurrency(payload[1]?.value)}</span>
            </div>
            {payload[0]?.payload?.salesCount !== undefined && (
              <div className="flex justify-between gap-4 text-slate-400 border-t border-slate-800 pt-1 mt-1">
                <span>🛒 Vendas:</span>
                <span className="font-bold">{payload[0]?.payload?.salesCount}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="formattedDate"
            tickLine={false}
            stroke="#94a3b8"
            fontSize={11}
          />
          <YAxis
            tickLine={false}
            stroke="#94a3b8"
            fontSize={11}
            tickFormatter={(val) => `R$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            height={36}
            formatter={(value) => (
              <span className="text-xs font-semibold text-slate-700">
                {value === 'revenue' ? '💵 Faturamento Bruto' : '📈 Lucro Líquido Real'}
              </span>
            )}
          />

          <Area
            type="monotone"
            dataKey="revenue"
            name="revenue"
            stroke="#f97316"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#revenueGrad)"
          />
          <Area
            type="monotone"
            dataKey="netProfit"
            name="netProfit"
            stroke="#10b981"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#profitGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

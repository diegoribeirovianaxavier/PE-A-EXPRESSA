'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Empty } from 'antd';
import { TopSellingItem } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';

interface TopPartsChartProps {
  data: TopSellingItem[];
  height?: number;
}

const COLORS = ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa'];

export const TopPartsChart: React.FC<TopPartsChartProps> = ({
  data,
  height = 320,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-[320px] flex items-center justify-center">
        <Empty description="Nenhuma peça registrada no período" />
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item: TopSellingItem = payload[0]?.payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs">
          <div className="font-bold text-orange-400 mb-1">{item.name}</div>
          <div className="text-slate-300">Marca: {item.brand}</div>
          <div className="text-slate-300">Código: {item.code || 'S/C'}</div>
          <div className="border-t border-slate-700 my-1 pt-1">
            <div className="text-slate-200">Quantidade Vendida: <strong>{item.quantity} un</strong></div>
            <div className="text-emerald-400">Total Faturado: <strong>{formatCurrency(item.totalRevenue)}</strong></div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis
            type="number"
            tickLine={false}
            stroke="#94a3b8"
            fontSize={11}
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            stroke="#94a3b8"
            fontSize={11}
            width={120}
            tickFormatter={(val) => val.length > 16 ? `${val.substring(0, 16)}...` : val}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="quantity"
            name="Quantidade Vendida"
            radius={[0, 6, 6, 0]}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

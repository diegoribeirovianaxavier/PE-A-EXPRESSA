'use client';

import React from 'react';
import { Table, Button, Input, InputNumber, Space, Typography, Tooltip, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { CalculatedSaleItem, SaleItemInput } from '@/lib/types';
import { formatCurrency, cleanProductCode } from '@/lib/formatters';

const { Text } = Typography;

interface ItemsEditableTableProps {
  items: SaleItemInput[];
  calculatedItems: CalculatedSaleItem[];
  onChange: (items: SaleItemInput[]) => void;
  disabled?: boolean;
}

export const ItemsEditableTable: React.FC<ItemsEditableTableProps> = ({
  items,
  calculatedItems,
  onChange,
  disabled = false,
}) => {
  const handleAddItem = () => {
    const newItem: SaleItemInput = {
      id: `item-${Date.now()}`,
      item_code: '',
      item_name: '',
      brand: 'Original',
      quantity: 1,
      original_unit_cost: 0,
    };
    onChange([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, idx) => idx !== index);
    onChange(updated.length > 0 ? updated : [
      {
        id: `item-${Date.now()}`,
        item_code: '',
        item_name: '',
        brand: 'Original',
        quantity: 1,
        original_unit_cost: 0,
      }
    ]);
  };

  const handleFieldChange = (index: number, field: keyof SaleItemInput, value: any) => {
    const updated = [...items];
    if (field === 'item_code') {
      // Limpa automaticamente prefixos como NP
      updated[index] = {
        ...updated[index],
        item_code: cleanProductCode(value),
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
    }
    onChange(updated);
  };

  const columns = [
    {
      title: '#',
      key: 'index',
      width: 45,
      render: (_: any, __: any, index: number) => (
        <span className="text-slate-400 font-mono text-xs">{index + 1}</span>
      ),
    },
    {
      title: (
        <Space size={4}>
          <span>Código Real</span>
          <Tooltip title="Código do fabricante/peça limpo (sem o prefixo 'NP' da loja física)">
            <InfoCircleOutlined className="text-orange-500 text-xs" />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'item_code',
      key: 'item_code',
      width: 140,
      render: (val: string, _: any, index: number) => (
        <Input
          placeholder="Ex: BD4120"
          value={val}
          disabled={disabled}
          onChange={(e) => handleFieldChange(index, 'item_code', e.target.value)}
          className="font-mono text-sm uppercase"
        />
      ),
    },
    {
      title: 'Descrição do Produto / Peça',
      dataIndex: 'item_name',
      key: 'item_name',
      render: (val: string, _: any, index: number) => (
        <Input
          placeholder="Ex: Jogo de Pastilhas de Freio Dianteiras"
          value={val}
          disabled={disabled}
          onChange={(e) => handleFieldChange(index, 'item_name', e.target.value)}
        />
      ),
    },
    {
      title: 'Marca / Fabricante',
      dataIndex: 'brand',
      key: 'brand',
      width: 150,
      render: (val: string, _: any, index: number) => (
        <Input
          placeholder="Ex: Fras-le / Cofap"
          value={val}
          disabled={disabled}
          onChange={(e) => handleFieldChange(index, 'brand', e.target.value)}
        />
      ),
    },
    {
      title: 'Qtd',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
      render: (val: number, _: any, index: number) => (
        <InputNumber
          min={1}
          max={999}
          value={val || 1}
          disabled={disabled}
          onChange={(v) => handleFieldChange(index, 'quantity', v || 1)}
          className="w-full"
        />
      ),
    },
    {
      title: (
        <Space size={4}>
          <span>Custo Bruto (NF)</span>
          <Tooltip title="Custo unitário original na loja física (Nova Peças)">
            <InfoCircleOutlined className="text-slate-400 text-xs" />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'original_unit_cost',
      key: 'original_unit_cost',
      width: 150,
      render: (val: number, _: any, index: number) => (
        <InputNumber
          min={0}
          step={0.5}
          precision={2}
          prefix="R$"
          value={val}
          disabled={disabled}
          onChange={(v) => handleFieldChange(index, 'original_unit_cost', v || 0)}
          className="w-full"
        />
      ),
    },
    {
      title: 'Preço Venda Unit.',
      key: 'final_unit_price',
      width: 150,
      render: (_: any, __: any, index: number) => {
        const calculated = calculatedItems[index];
        return (
          <div className="text-right font-medium text-slate-800">
            {formatCurrency(calculated?.final_unit_price || 0)}
          </div>
        );
      },
    },
    {
      title: 'Total Final',
      key: 'final_total_price',
      width: 150,
      render: (_: any, __: any, index: number) => {
        const calculated = calculatedItems[index];
        return (
          <div className="text-right font-bold text-orange-600">
            {formatCurrency(calculated?.final_total_price || 0)}
          </div>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: any, __: any, index: number) => (
        <Popconfirm
          title="Remover este item?"
          okText="Sim"
          cancelText="Não"
          disabled={items.length <= 1 || disabled}
          onConfirm={() => handleRemoveItem(index)}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            disabled={items.length <= 1 || disabled}
            size="small"
          />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Text strong className="text-base text-slate-800">
            Itens e Peças da Venda
          </Text>
          <Text type="secondary" className="block text-xs">
            Custos originais da loja física com rateio inteligente de frete e margem.
          </Text>
        </div>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAddItem}
          disabled={disabled}
          className="border-orange-300 text-orange-600 hover:text-orange-700 hover:border-orange-500"
        >
          Adicionar Item
        </Button>
      </div>

      <Table
        dataSource={items}
        columns={columns}
        rowKey={(record, idx) => record.id || `item-row-${idx}`}
        pagination={false}
        size="middle"
        bordered
        className="bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm"
      />
    </div>
  );
};

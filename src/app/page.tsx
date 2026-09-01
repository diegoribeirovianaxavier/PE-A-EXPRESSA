'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout, NavigationKey } from '@/components/layout/AppLayout';
import { FinancialDashboard } from '@/components/dashboard/FinancialDashboard';
import { NewSaleView } from '@/components/sales/NewSaleView';
import { SalesHistoryTable } from '@/components/sales/SalesHistoryTable';
import { SettingsView } from '@/components/settings/SettingsView';
import { SalesService } from '@/lib/supabase/salesService';
import { Sale } from '@/lib/types';
import { message, Spin } from 'antd';

export default function HomePage() {
  const [currentTab, setCurrentTab] = useState<NavigationKey>('dashboard');
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Carrega as vendas do Supabase ou Local Storage
  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const data = await SalesService.getAllSales();
      setSales(data);
    } catch (err) {
      console.error('Erro ao carregar vendas:', err);
      message.error('Erro ao carregar dados de vendas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  // Callback chamado quando uma nova venda é salva
  const handleSaleSaved = () => {
    loadSales();
    // Alterna para o histórico de vendas para que o usuário veja a nova venda imediatamente
    setCurrentTab('sales-history');
  };

  // Exclusão de venda
  const handleDeleteSale = async (saleId: string) => {
    try {
      const success = await SalesService.deleteSale(saleId);
      if (success) {
        message.success('Venda removida com sucesso!');
        loadSales();
      } else {
        message.error('Não foi possível excluir a venda.');
      }
    } catch (err) {
      message.error('Erro ao excluir venda.');
    }
  };

  return (
    <AppLayout currentTab={currentTab} onTabChange={setCurrentTab}>
      {loading && sales.length === 0 ? (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
          <Spin size="large" />
          <span className="text-slate-500 font-medium text-sm">
            Carregando Sistema PEÇA EXPRESSA...
          </span>
        </div>
      ) : (
        <>
          {currentTab === 'dashboard' && (
            <FinancialDashboard
              sales={sales}
              loading={loading}
              onNewSaleClick={() => setCurrentTab('new-sale')}
              onViewHistoryClick={() => setCurrentTab('sales-history')}
            />
          )}

          {currentTab === 'new-sale' && (
            <NewSaleView onSaleSaved={handleSaleSaved} />
          )}

          {currentTab === 'sales-history' && (
            <SalesHistoryTable
              sales={sales}
              loading={loading}
              onRefresh={loadSales}
              onDeleteSale={handleDeleteSale}
              onNewSaleClick={() => setCurrentTab('new-sale')}
            />
          )}

          {currentTab === 'settings' && <SettingsView />}
        </>
      )}
    </AppLayout>
  );
}

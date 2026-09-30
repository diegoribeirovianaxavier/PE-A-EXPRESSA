import { getSupabaseClient, getSupabaseConfig } from './client';
import { Sale, SaleItem, CalculatedSaleItem } from '../types';
import dayjs from 'dayjs';

const LOCAL_STORAGE_SALES_KEY = 'peca_expressa_sales_v1';

// Dados de demonstração offline somente quando o banco NÃO estiver configurado
const INITIAL_DEMO_SALES: Sale[] = [
  {
    id: 'a0000001-0000-0000-0000-000000000001',
    created_at: dayjs().subtract(5, 'day').toISOString(),
    sale_date: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
    original_invoice_number: 'NF-89421',
    client_name: 'Carlos Eduardo Silva',
    client_phone: '(21) 98765-4321',
    car_model: 'Civic 2.0 2018',
    payment_method: 'PIX',
    installments_count: 1,
    original_cost_total: 180.00,
    profit_margin_percent: 13.00,
    freight_cost: 20.00,
    card_fee_percent: 6.12,
    pix_discount_percent: 6.45,
    final_sale_total: 215.75,
    net_profit: 20.75,
    warranty_deadline: dayjs().subtract(5, 'day').add(90, 'day').format('YYYY-MM-DD'),
    invoice_file_url: 'https://images.unsplash.com/photo-1554415707-9e49019eeb61?w=800&auto=format&fit=crop&q=80',
    status: 'CONCLUIDO',
    notes: 'Entrega expressa realizada via motoboy no Centro.',
    items: [
      {
        id: '10000000-0000-0000-0000-000000000001',
        sale_id: 'a0000001-0000-0000-0000-000000000001',
        item_code: 'BD4120',
        item_name: 'Jogo de Pastilhas de Freio Dianteiras',
        brand: 'Fras-le',
        quantity: 1,
        original_unit_cost: 180.00,
        final_unit_price: 215.75,
        final_total_price: 215.75,
      }
    ]
  }
];

function getLocalStorageSales(): Sale[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_SALES;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SALES_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalStorageSales(sales: Sale[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_SALES_KEY, JSON.stringify(sales));
  } catch (err) {
    console.error('Erro ao salvar no localStorage:', err);
  }
}

export class SalesService {
  /**
   * Busca todas as vendas com seus respectivos itens diretamente do Supabase oficial
   */
  public static async getAllSales(): Promise<Sale[]> {
    const config = getSupabaseConfig();
    const supabase = getSupabaseClient();
    
    if (config.isConfigured && supabase) {
      const { data: sales, error: salesErr } = await supabase
        .from('sales')
        .select(`
          *,
          items:sale_items(*)
        `)
        .order('sale_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (salesErr) {
        console.error('Erro ao buscar vendas no Supabase:', salesErr);
        throw new Error(`Falha no Supabase: ${salesErr.message} (Código: ${salesErr.code})`);
      }

      return (sales || []) as Sale[];
    }

    // Modo offline local quando Supabase não estiver configurado
    return getLocalStorageSales();
  }

  /**
   * Cria uma nova venda com seus itens e anexo no Supabase oficial via .insert()
   */
  public static async createSale(
    saleData: Omit<Sale, 'id' | 'created_at'>,
    items: CalculatedSaleItem[],
    file?: File
  ): Promise<Sale> {
    const config = getSupabaseConfig();
    const supabase = getSupabaseClient();
    let invoiceFileUrl = saleData.invoice_file_url || '';

    // 1. Upload de anexo/comprovante para o Supabase Storage se arquivo presente
    if (file && config.isConfigured && supabase) {
      try {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${Date.now()}_${cleanName}`;
        const filePath = `invoices/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from('invoices')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (!uploadErr) {
          const { data: publicUrlData } = supabase.storage
            .from('invoices')
            .getPublicUrl(filePath);

          if (publicUrlData?.publicUrl) {
            invoiceFileUrl = publicUrlData.publicUrl;
          }
        } else {
          console.warn('Aviso no upload do Supabase Storage:', uploadErr.message);
        }
      } catch (err) {
        console.warn('Erro durante upload de imagem para o Supabase Storage:', err);
      }
    }

    // Fallback de URL local caso não haja storage na nuvem
    if (file && !invoiceFileUrl) {
      try {
        invoiceFileUrl = URL.createObjectURL(file);
      } catch {
        invoiceFileUrl = '';
      }
    }

    // 2. Gravação Oficial no Supabase
    if (config.isConfigured && supabase) {
      const saleRowToInsert = {
        sale_date: saleData.sale_date || dayjs().format('YYYY-MM-DD'),
        original_invoice_number: saleData.original_invoice_number || '',
        client_name: saleData.client_name || 'Cliente Sem Nome',
        client_phone: saleData.client_phone || '',
        car_model: saleData.car_model || '',
        payment_method: saleData.payment_method || 'PIX',
        installments_count: Number(saleData.installments_count) || 1,
        original_cost_total: Number(saleData.original_cost_total) || 0,
        profit_margin_percent: Number(saleData.profit_margin_percent) || 0,
        freight_cost: Number(saleData.freight_cost) || 20,
        card_fee_percent: Number(saleData.card_fee_percent) || 0,
        pix_discount_percent: Number(saleData.pix_discount_percent) || 0,
        final_sale_total: Number(saleData.final_sale_total) || 0,
        net_profit: Number(saleData.net_profit) || 0,
        warranty_deadline: saleData.warranty_deadline || dayjs().add(90, 'day').format('YYYY-MM-DD'),
        invoice_file_url: invoiceFileUrl,
        status: saleData.status || 'CONCLUIDO',
        notes: saleData.notes || '',
      };

      // Inserção da venda principal retornando o registro criado com seu UUID gerado pelo PostgreSQL
      const { data: insertedSale, error: saleInsertErr } = await supabase
        .from('sales')
        .insert(saleRowToInsert)
        .select()
        .single();

      if (saleInsertErr || !insertedSale) {
        console.error('Erro ao inserir venda no Supabase:', saleInsertErr);
        throw new Error(`Erro ao salvar venda no Supabase: ${saleInsertErr?.message || 'Sem resposta do banco'}`);
      }

      // Inserção dos itens filhos vinculados ao sale_id retornado
      let insertedItems: SaleItem[] = [];
      if (items && items.length > 0) {
        const itemsToInsert = items.map(it => ({
          sale_id: insertedSale.id,
          item_code: (it.item_code || '').replace(/^NP/i, '').trim(),
          item_name: it.item_name || 'Peça Automotiva',
          brand: it.brand || 'Original',
          quantity: Number(it.quantity) || 1,
          original_unit_cost: Number(it.original_unit_cost) || 0,
          final_unit_price: Number(it.final_unit_price) || 0,
          final_total_price: Number(it.final_total_price) || 0,
        }));

        const { data: dbItems, error: itemsInsertErr } = await supabase
          .from('sale_items')
          .insert(itemsToInsert)
          .select();

        if (itemsInsertErr) {
          console.error('Erro ao inserir itens no Supabase:', itemsInsertErr);
        } else if (dbItems) {
          insertedItems = dbItems as SaleItem[];
        }
      }

      return {
        ...insertedSale,
        items: insertedItems,
      } as Sale;
    }

    // 3. Fallback Offline Local Storage se banco não estiver configurado
    const newSaleId = `sale-${Date.now()}`;
    const completeSale: Sale = {
      ...saleData,
      id: newSaleId,
      created_at: new Date().toISOString(),
      invoice_file_url: invoiceFileUrl,
      items: items.map((it, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        sale_id: newSaleId,
        item_code: it.item_code || '',
        item_name: it.item_name,
        brand: it.brand || 'Original',
        quantity: it.quantity,
        original_unit_cost: it.original_unit_cost,
        final_unit_price: it.final_unit_price,
        final_total_price: it.final_total_price,
      })),
    };

    const existing = getLocalStorageSales();
    const updated = [completeSale, ...existing];
    saveLocalStorageSales(updated);
    return completeSale;
  }

  /**
   * Exclui uma venda e seus itens no Supabase oficial
   */
  public static async deleteSale(saleId: string): Promise<boolean> {
    const config = getSupabaseConfig();
    const supabase = getSupabaseClient();
    
    if (config.isConfigured && supabase) {
      const { error } = await supabase.from('sales').delete().eq('id', saleId);
      if (error) {
        throw new Error(`Erro ao excluir venda no Supabase: ${error.message}`);
      }
      return true;
    }

    const existing = getLocalStorageSales();
    const updated = existing.filter(s => s.id !== saleId);
    saveLocalStorageSales(updated);
    return true;
  }

  /**
   * Inscrição Realtime no canal do Supabase (atualiza todos os computadores instantaneamente)
   */
  public static subscribeToSales(onChange: () => void): () => void {
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};

    try {
      const channel = supabase
        .channel('sales_realtime_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sales' },
          (payload) => {
            console.log('Realtime update recebido em sales:', payload.eventType);
            onChange();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sale_items' },
          (payload) => {
            console.log('Realtime update recebido em sale_items:', payload.eventType);
            onChange();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Erro ao configurar canal realtime do Supabase:', err);
      return () => {};
    }
  }

  /**
   * Reseta os dados locais para demonstração
   */
  public static resetToDemoData(): Sale[] {
    saveLocalStorageSales(INITIAL_DEMO_SALES);
    return INITIAL_DEMO_SALES;
  }
}

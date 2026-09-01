import { getSupabaseClient, isSupabaseConfigured } from './client';
import { Sale, SaleItem, CalculatedSaleItem } from '../types';
import dayjs from 'dayjs';

const LOCAL_STORAGE_SALES_KEY = 'peca_expressa_sales_v1';

// Dados de exemplo iniciais para testes imediatos
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
    freight_cost: 15.00,
    card_fee_percent: 6.12,
    pix_discount_percent: 7.01,
    final_sale_total: 215.75,
    net_profit: 20.75,
    warranty_deadline: dayjs().subtract(5, 'day').add(90, 'day').format('YYYY-MM-DD'),
    invoice_file_url: 'https://images.unsplash.com/photo-1554415707-9e49019eeb61?w=800&auto=format&fit=crop&q=80',
    status: 'CONCLUIDO',
    notes: 'Entrega expressa realizada via motoboy no Centro.',
    items: [
      {
        id: 'item-101',
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
  },
  {
    id: 'a0000002-0000-0000-0000-000000000002',
    created_at: dayjs().subtract(2, 'day').toISOString(),
    sale_date: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
    original_invoice_number: 'NF-89455',
    client_name: 'Mariana Costa Ramos',
    client_phone: '(21) 99123-8877',
    car_model: 'Corolla 1.8 2016',
    payment_method: 'CARTAO',
    installments_count: 3,
    original_cost_total: 350.00,
    profit_margin_percent: 8.50,
    freight_cost: 15.00,
    card_fee_percent: 6.12,
    pix_discount_percent: 7.01,
    final_sale_total: 419.00,
    net_profit: 28.36,
    warranty_deadline: dayjs().subtract(2, 'day').add(90, 'day').format('YYYY-MM-DD'),
    invoice_file_url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop&q=80',
    status: 'CONCLUIDO',
    notes: 'Parcelado em 3x sem juros na maquininha.',
    items: [
      {
        id: 'item-201',
        sale_id: 'a0000002-0000-0000-0000-000000000002',
        item_code: 'AM8920',
        item_name: 'Amortecedor Dianteiro Direito',
        brand: 'Cofap',
        quantity: 1,
        original_unit_cost: 250.00,
        final_unit_price: 299.28,
        final_total_price: 299.28,
      },
      {
        id: 'item-202',
        sale_id: 'a0000002-0000-0000-0000-000000000002',
        item_code: 'KT441',
        item_name: 'Kit Coxim e Batente do Amortecedor',
        brand: 'Sampel',
        quantity: 1,
        original_unit_cost: 100.00,
        final_unit_price: 119.72,
        final_total_price: 119.72,
      }
    ]
  },
  {
    id: 'a0000003-0000-0000-0000-000000000003',
    created_at: dayjs().subtract(78, 'day').toISOString(),
    sale_date: dayjs().subtract(78, 'day').format('YYYY-MM-DD'),
    original_invoice_number: 'NF-88102',
    client_name: 'Roberto Mendes',
    client_phone: '(21) 97555-1234',
    car_model: 'Onix 1.0 Turbo 2021',
    payment_method: 'PIX',
    installments_count: 1,
    original_cost_total: 85.00,
    profit_margin_percent: 17.00,
    freight_cost: 15.00,
    card_fee_percent: 5.39,
    pix_discount_percent: 6.09,
    final_sale_total: 113.10,
    net_profit: 13.10,
    warranty_deadline: dayjs().subtract(78, 'day').add(90, 'day').format('YYYY-MM-DD'),
    status: 'CONCLUIDO',
    notes: 'Garantia próxima do vencimento (restam ~12 dias).',
    items: [
      {
        id: 'item-301',
        sale_id: 'a0000003-0000-0000-0000-000000000003',
        item_code: 'FL550',
        item_name: 'Filtro de Óleo Lubrificante',
        brand: 'Mann Filter',
        quantity: 1,
        original_unit_cost: 85.00,
        final_unit_price: 113.10,
        final_total_price: 113.10,
      }
    ]
  },
  {
    id: 'a0000004-0000-0000-0000-000000000004',
    created_at: dayjs().subtract(95, 'day').toISOString(),
    sale_date: dayjs().subtract(95, 'day').format('YYYY-MM-DD'),
    original_invoice_number: 'NF-87320',
    client_name: 'Fernanda Oliveira',
    client_phone: '(21) 98111-9988',
    car_model: 'HB20 1.6 2019',
    payment_method: 'CARTAO',
    installments_count: 5,
    original_cost_total: 520.00,
    profit_margin_percent: 6.50,
    freight_cost: 15.00,
    card_fee_percent: 7.57,
    pix_discount_percent: 8.80,
    final_sale_total: 611.88,
    net_profit: 30.50,
    warranty_deadline: dayjs().subtract(95, 'day').add(90, 'day').format('YYYY-MM-DD'),
    status: 'CONCLUIDO',
    notes: 'Garantia de 90 dias expirada.',
    items: [
      {
        id: 'item-401',
        sale_id: 'a0000004-0000-0000-0000-000000000004',
        item_code: 'EM901',
        item_name: 'Kit de Embreagem Platô e Disco',
        brand: 'Valeo',
        quantity: 1,
        original_unit_cost: 520.00,
        final_unit_price: 611.88,
        final_total_price: 611.88,
      }
    ]
  }
];

function getLocalStorageSales(): Sale[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_SALES;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SALES_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_SALES_KEY, JSON.stringify(INITIAL_DEMO_SALES));
      return INITIAL_DEMO_SALES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_SALES;
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
   * Busca todas as vendas com seus respectivos itens
   */
  public static async getAllSales(): Promise<Sale[]> {
    const supabase = getSupabaseClient();
    
    if (supabase) {
      try {
        const { data: sales, error: salesErr } = await supabase
          .from('sales')
          .select(`
            *,
            items:sale_items(*)
          `)
          .order('sale_date', { ascending: false });

        if (!salesErr && sales) {
          return sales as Sale[];
        }
        console.warn('Falha na consulta do Supabase, utilizando fallback local:', salesErr?.message);
      } catch (err) {
        console.warn('Erro ao conectar com Supabase, utilizando fallback local:', err);
      }
    }

    return getLocalStorageSales();
  }

  /**
   * Cria uma nova venda com seus itens e anexo
   */
  public static async createSale(
    saleData: Omit<Sale, 'id' | 'created_at'>,
    items: CalculatedSaleItem[],
    file?: File
  ): Promise<Sale> {
    const supabase = getSupabaseClient();
    let invoiceFileUrl = saleData.invoice_file_url || '';

    // Upload de arquivo para o bucket 'invoices' do Supabase Storage
    if (file && supabase) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `invoices/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from('invoices')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (!uploadErr) {
          const { data: publicUrlData } = supabase.storage
            .from('invoices')
            .getPublicUrl(filePath);

          if (publicUrlData?.publicUrl) {
            invoiceFileUrl = publicUrlData.publicUrl;
          }
        } else {
          console.warn('Erro ao fazer upload para o Supabase Storage:', uploadErr.message);
        }
      } catch (err) {
        console.warn('Erro durante upload de imagem:', err);
      }
    }

    // Se o arquivo foi enviado localmente e não há Supabase Storage, converte para base64/blob url
    if (file && !invoiceFileUrl) {
      try {
        invoiceFileUrl = URL.createObjectURL(file);
      } catch {
        invoiceFileUrl = '';
      }
    }

    const newSaleId = crypto.randomUUID ? crypto.randomUUID() : `sale-${Date.now()}`;
    const createdAt = new Date().toISOString();

    const completeSale: Sale = {
      ...saleData,
      id: newSaleId,
      created_at: createdAt,
      invoice_file_url: invoiceFileUrl,
      items: items.map((it, idx) => ({
        id: it.id || `item-${Date.now()}-${idx}`,
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

    if (supabase) {
      try {
        const { error: saleInsertErr } = await supabase.from('sales').insert({
          id: completeSale.id,
          sale_date: completeSale.sale_date,
          original_invoice_number: completeSale.original_invoice_number,
          client_name: completeSale.client_name,
          client_phone: completeSale.client_phone,
          car_model: completeSale.car_model,
          payment_method: completeSale.payment_method,
          installments_count: completeSale.installments_count,
          original_cost_total: completeSale.original_cost_total,
          profit_margin_percent: completeSale.profit_margin_percent,
          freight_cost: completeSale.freight_cost,
          card_fee_percent: completeSale.card_fee_percent,
          pix_discount_percent: completeSale.pix_discount_percent,
          final_sale_total: completeSale.final_sale_total,
          net_profit: completeSale.net_profit,
          warranty_deadline: completeSale.warranty_deadline,
          invoice_file_url: completeSale.invoice_file_url,
          status: completeSale.status,
          notes: completeSale.notes,
        });

        if (saleInsertErr) {
          throw new Error(`Erro ao salvar venda no Supabase: ${saleInsertErr.message}`);
        }

        if (completeSale.items && completeSale.items.length > 0) {
          const { error: itemsInsertErr } = await supabase.from('sale_items').insert(
            completeSale.items.map(it => ({
              id: it.id,
              sale_id: completeSale.id,
              item_code: it.item_code,
              item_name: it.item_name,
              brand: it.brand,
              quantity: it.quantity,
              original_unit_cost: it.original_unit_cost,
              final_unit_price: it.final_unit_price,
              final_total_price: it.final_total_price,
            }))
          );

          if (itemsInsertErr) {
            console.warn('Erro ao inserir itens no Supabase:', itemsInsertErr.message);
          }
        }

        return completeSale;
      } catch (err) {
        console.warn('Falha ao gravar no Supabase, salvando localmente:', err);
      }
    }

    // Fallback Local Storage
    const existing = getLocalStorageSales();
    const updated = [completeSale, ...existing];
    saveLocalStorageSales(updated);
    return completeSale;
  }

  /**
   * Exclui uma venda
   */
  public static async deleteSale(saleId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    
    if (supabase) {
      try {
        const { error } = await supabase.from('sales').delete().eq('id', saleId);
        if (!error) return true;
      } catch (err) {
        console.warn('Erro ao deletar no Supabase:', err);
      }
    }

    const existing = getLocalStorageSales();
    const updated = existing.filter(s => s.id !== saleId);
    saveLocalStorageSales(updated);
    return true;
  }

  /**
   * Reseta os dados locais para os dados de demonstração iniciais
   */
  public static resetToDemoData(): Sale[] {
    saveLocalStorageSales(INITIAL_DEMO_SALES);
    return INITIAL_DEMO_SALES;
  }
}

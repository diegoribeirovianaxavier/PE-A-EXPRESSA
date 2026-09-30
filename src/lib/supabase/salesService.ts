import { getSupabaseClient, getSupabaseConfig } from './client';
import { Sale, SaleItem, CalculatedSaleItem } from '../types';
import dayjs from 'dayjs';

export class SalesService {
  /**
   * Busca todas as vendas com seus respectivos itens diretamente da tabela sales e sale_items do Supabase
   */
  public static async getAllSales(): Promise<Sale[]> {
    const config = getSupabaseConfig();
    const supabase = getSupabaseClient();
    
    if (!config.isConfigured || !supabase) {
      console.warn('Supabase não configurado. Retornando lista vazia.');
      return [];
    }

    const { data: sales, error: salesErr } = await supabase
      .from('sales')
      .select(`
        *,
        items:sale_items(*)
      `)
      .order('sale_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (salesErr) {
      console.error('Erro na consulta .from("sales").select() do Supabase:', salesErr);
      throw new Error(`Erro ao buscar vendas do Supabase: ${salesErr.message}`);
    }

    return (sales || []) as Sale[];
  }

  /**
   * Cria uma nova venda executando .insert() direto na tabela sales e sale_items do Supabase
   */
  public static async createSale(
    saleData: Omit<Sale, 'id' | 'created_at'>,
    items: CalculatedSaleItem[],
    file?: File
  ): Promise<Sale> {
    const config = getSupabaseConfig();
    const supabase = getSupabaseClient();

    if (!config.isConfigured || !supabase) {
      throw new Error(
        'Banco de dados Supabase não conectado. Acesse o menu Configurações > Banco de Dados e configure a Project URL e a Anon Key.'
      );
    }

    let invoiceFileUrl = saleData.invoice_file_url || '';

    // 1. Upload opcional de anexo para o bucket 'invoices' do Supabase Storage
    if (file) {
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
          console.warn('Aviso no upload do anexo para o Supabase Storage:', uploadErr.message);
        }
      } catch (err) {
        console.warn('Erro durante upload de imagem para o Supabase Storage:', err);
      }
    }

    // 2. Inserção direta na tabela 'sales' (.insert().select().single())
    const saleInsertPayload = {
      sale_date: saleData.sale_date || dayjs().format('YYYY-MM-DD'),
      original_invoice_number: saleData.original_invoice_number || '',
      client_name: saleData.client_name || 'Cliente PEÇA EXPRESSA',
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
      invoice_file_url: invoiceFileUrl || null,
      status: saleData.status || 'CONCLUIDO',
      notes: saleData.notes || '',
    };

    console.log('Executando supabase.from("sales").insert():', saleInsertPayload);

    const { data: insertedSale, error: saleInsertErr } = await supabase
      .from('sales')
      .insert(saleInsertPayload)
      .select()
      .single();

    if (saleInsertErr || !insertedSale) {
      console.error('Falha no .insert() da tabela sales:', saleInsertErr);
      throw new Error(
        `Erro retornado pelo Supabase ao gravar venda: ${saleInsertErr?.message || 'Sem resposta do banco'}`
      );
    }

    console.log('Venda gravada com sucesso no Supabase! ID:', insertedSale.id);

    // 3. Inserção dos itens na tabela 'sale_items'
    let insertedItems: SaleItem[] = [];
    if (items && items.length > 0) {
      const itemsPayload = items.map(it => ({
        sale_id: insertedSale.id,
        item_code: (it.item_code || '').replace(/^NP/i, '').trim(),
        item_name: it.item_name || 'Peça Automotiva',
        brand: it.brand || 'Original',
        quantity: Number(it.quantity) || 1,
        original_unit_cost: Number(it.original_unit_cost) || 0,
        final_unit_price: Number(it.final_unit_price) || 0,
        final_total_price: Number(it.final_total_price) || 0,
      }));

      console.log('Executando supabase.from("sale_items").insert():', itemsPayload);

      const { data: dbItems, error: itemsInsertErr } = await supabase
        .from('sale_items')
        .insert(itemsPayload)
        .select();

      if (itemsInsertErr) {
        console.error('Erro ao inserir sale_items no Supabase:', itemsInsertErr);
        throw new Error(`Erro ao gravar itens no Supabase: ${itemsInsertErr.message}`);
      } else if (dbItems) {
        insertedItems = dbItems as SaleItem[];
      }
    }

    return {
      ...insertedSale,
      items: insertedItems,
    } as Sale;
  }

  /**
   * Exclui uma venda e seus itens no Supabase via .delete()
   */
  public static async deleteSale(saleId: string): Promise<boolean> {
    const config = getSupabaseConfig();
    const supabase = getSupabaseClient();
    
    if (!config.isConfigured || !supabase) {
      throw new Error('Supabase não configurado.');
    }

    const { error } = await supabase.from('sales').delete().eq('id', saleId);
    if (error) {
      console.error('Erro ao deletar venda no Supabase:', error);
      throw new Error(`Erro ao excluir venda no Supabase: ${error.message}`);
    }
    return true;
  }

  /**
   * Inscrição Realtime no canal do Supabase
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
}

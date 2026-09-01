export type PaymentMethod = 'PIX' | 'CARTAO' | 'DINHEIRO';
export type SaleStatus = 'CONCLUIDO' | 'CANCELADO' | 'PENDENTE';

export interface SaleItemInput {
  id?: string;
  item_code?: string;
  item_name: string;
  brand?: string;
  quantity: number;
  original_unit_cost: number;
}

export interface CalculatedSaleItem extends SaleItemInput {
  id: string;
  final_unit_price: number;
  final_total_price: number;
  freight_portion: number;
  margin_amount: number;
}

export interface PricingCalculationResult {
  // Inputs
  original_cost_total: number;
  payment_method: PaymentMethod;
  total_items_count: number;

  // Etapa A
  profit_margin_percent: number;
  margin_amount: number;
  subtotal_with_margin: number;

  // Etapa B
  freight_cost: number;
  subtotal_with_freight: number;
  freight_per_item: number;

  // Etapa C
  card_fee_percent: number;
  card_fee_amount: number;
  card_sale_total: number;

  // Etapa D
  max_installments: number;
  installment_value: number;

  // Etapa E
  pix_discount_percent: number;
  pix_discount_amount: number;
  pix_sale_total: number;

  // Final Results based on selected payment method
  final_sale_total: number;
  net_profit: number;
  net_margin_percent: number;
  installments_count?: number;
  applied_card_fee_percent?: number;
  applied_card_fee_amount?: number;

  // Items with calculated unit/total prices
  items: CalculatedSaleItem[];
}

export interface Sale {
  id: string;
  created_at: string;
  sale_date: string;
  original_invoice_number?: string;
  client_name: string;
  client_phone?: string;
  car_model?: string;
  payment_method: PaymentMethod;
  installments_count: number;

  // Financial values
  original_cost_total: number;
  profit_margin_percent: number;
  freight_cost: number;
  card_fee_percent: number;
  pix_discount_percent: number;
  final_sale_total: number;
  net_profit: number;

  // Warranty & Attachments
  warranty_deadline: string;
  invoice_file_url?: string;
  status: SaleStatus;
  notes?: string;

  // Relations
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  item_code?: string;
  item_name: string;
  brand?: string;
  quantity: number;
  original_unit_cost: number;
  final_unit_price: number;
  final_total_price: number;
}

export interface OcrExtractedData {
  original_invoice_number?: string;
  client_name?: string;
  client_phone?: string;
  car_model?: string;
  payment_method?: PaymentMethod;
  items: Array<{
    item_code?: string;
    item_name: string;
    brand?: string;
    quantity: number;
    original_unit_cost: number;
  }>;
  total_original_cost?: number;
  notes?: string;
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalNetProfit: number;
  averageMarginPercent: number;
  salesCount: number;
  averageTicket: number;
  pixSalesCount: number;
  pixRevenue: number;
  cardSalesCount: number;
  cardRevenue: number;
  activeWarrantiesCount: number;
  expiredWarrantiesCount: number;
  expiringSoonWarrantiesCount: number;
}

export interface DailyFinancialData {
  date: string;
  formattedDate: string;
  revenue: number;
  netProfit: number;
  salesCount: number;
}

export interface TopSellingItem {
  name: string;
  brand: string;
  code: string;
  quantity: number;
  totalRevenue: number;
}

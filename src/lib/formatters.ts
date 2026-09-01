import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import relativeTime from 'dayjs/plugin/relativeTime';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { PricingCalculationResult, Sale } from './types';

dayjs.locale('pt-br');
dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);

export { dayjs };

/**
 * Formata valor numérico como moeda brasileira (BRL)
 */
export function formatCurrency(value: number | string | null | undefined): string {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

/**
 * Formata número puro como moeda sem o símbolo R$ (ex: "1.250,50")
 */
export function formatNumberBR(value: number | string | null | undefined): string {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formata telefone com máscara brasileira (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }
  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
  return phone;
}

/**
 * Limpa código de produto removendo prefixos como NP, NP-, etc.
 */
export function cleanProductCode(code: string | null | undefined): string {
  if (!code) return '';
  return code.replace(/^NP[-_\s]*/i, '').trim();
}

/**
 * Gera URL de mensagem direta do WhatsApp
 */
export function getWhatsAppUrl(phone: string, messageText?: string): string {
  const digits = phone.replace(/\D/g, '');
  const fullPhone = digits.startsWith('55') ? digits : `55${digits}`;
  const encodedText = messageText ? encodeURIComponent(messageText) : '';
  return `https://wa.me/${fullPhone}${encodedText ? `?text=${encodedText}` : ''}`;
}

/**
 * Gera o texto formatado oficial do Orçamento para envio no WhatsApp
 */
export function generateWhatsAppQuoteText(
  calc: PricingCalculationResult,
  invoiceNumber: string = 'S/N',
  sellerContact: string = '(21) 97690-4912'
): string {
  const invoiceDisplay = invoiceNumber || 'S/N';
  
  // Monta blocos de itens
  const itemsText = calc.items
    .map((item) => {
      const code = cleanProductCode(item.item_code) || 'N/A';
      const brand = item.brand || 'ORIGINAL';
      const name = (item.item_name || 'PEÇA AUTOMOTIVA').toUpperCase();
      const qty = item.quantity || 1;
      const unitPriceStr = formatNumberBR(item.final_unit_price);
      const totalPriceStr = formatNumberBR(item.final_total_price);

      return `PRODUTO: ${code}\nMARCA: ${brand}\n${name}\n  ${qty} x   R$ ${unitPriceStr} =   R$ ${totalPriceStr}\n..........................`;
    })
    .join('\n');

  const cardTotalStr = formatNumberBR(calc.card_sale_total);
  const maxInstallments = calc.max_installments;
  const installmentValueStr = formatNumberBR(calc.installment_value);
  const pixTotalStr = formatNumberBR(calc.pix_sale_total);

  return `-----ORÇAMENTO VENDA------
PEÇA EXPRESSA
VENDA ONLINE
${sellerContact}
--------------------------
NUMERO..: ${invoiceDisplay}
VENDEDOR: PEÇA EXPRESSA
--------------------------
${itemsText}
--------------------------
TOTAL NO CARTÃO: R$ ${cardTotalStr}
💳 Parcelamento: Até ${maxInstallments}x de R$ ${installmentValueStr} sem juros no cartão

⚡ Pagamento via PIX (Com desconto):
💰 TOTAL NO PIX: R$ ${pixTotalStr}`;
}

/**
 * Informações de garantia calculadas
 */
export interface WarrantyStatus {
  isExpired: boolean;
  isExpiringSoon: boolean; // <= 15 dias
  daysRemaining: number;
  deadlineFormatted: string;
  badgeColor: string;
  badgeText: string;
}

export function calculateWarrantyStatus(saleDateOrDeadline: string): WarrantyStatus {
  const today = dayjs();
  let deadline = dayjs(saleDateOrDeadline);
  
  // Se for uma data de venda em vez de deadline, adiciona 90 dias
  if (deadline.isBefore(today.subtract(90, 'days'))) {
    // Already calculated or old date
  }

  const daysRemaining = deadline.diff(today, 'day');
  const isExpired = daysRemaining < 0;
  const isExpiringSoon = !isExpired && daysRemaining <= 15;

  let badgeColor = 'green';
  let badgeText = `Garantia Ativa (${daysRemaining} dias)`;

  if (isExpired) {
    badgeColor = 'red';
    badgeText = `Garantia Expirada (${Math.abs(daysRemaining)} dias atrás)`;
  } else if (isExpiringSoon) {
    badgeColor = 'orange';
    badgeText = `Expira em breve (${daysRemaining} dias)`;
  }

  return {
    isExpired,
    isExpiringSoon,
    daysRemaining,
    deadlineFormatted: deadline.format('DD/MM/YYYY'),
    badgeColor,
    badgeText,
  };
}

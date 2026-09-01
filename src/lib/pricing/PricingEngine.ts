import { CalculatedSaleItem, PaymentMethod, PricingCalculationResult, SaleItemInput } from '../types';

export class PricingEngine {
  public static readonly FIXED_FREIGHT = 15.00;

  /**
   * Etapa A: Retorna a % de margem bruta baseada no custo original total
   */
  public static getMarginPercent(originalCostTotal: number): number {
    if (originalCostTotal <= 100.00) return 17.0;
    if (originalCostTotal <= 200.00) return 13.0;
    if (originalCostTotal <= 300.00) return 10.0;
    if (originalCostTotal <= 400.00) return 8.5;
    if (originalCostTotal <= 500.00) return 7.0;
    if (originalCostTotal <= 600.00) return 6.5;
    return 6.0;
  }

  /**
   * Etapa C: Retorna a % de taxa de maquininha de cartão baseada no Subtotal com Margem (Etapa A)
   */
  public static getCardFeePercent(subtotalWithMargin: number): number {
    if (subtotalWithMargin <= 149.99) return 5.39;
    if (subtotalWithMargin <= 399.99) return 6.12;
    if (subtotalWithMargin <= 499.99) return 6.85;
    if (subtotalWithMargin <= 599.99) return 7.57;
    if (subtotalWithMargin <= 999.99) return 8.28;
    return 11.06;
  }

  /**
   * Etapa D: Retorna o número máximo de parcelas sem juros permitidas
   */
  public static getMaxInstallments(subtotalWithMargin: number): number {
    if (subtotalWithMargin <= 149.99) return 2;
    if (subtotalWithMargin <= 399.99) return 3;
    if (subtotalWithMargin <= 499.99) return 4;
    if (subtotalWithMargin <= 599.99) return 5;
    if (subtotalWithMargin <= 999.99) return 6;
    return 10;
  }

  /**
   * Etapa E: Retorna a % de desconto do PIX baseada no valor acumulado
   */
  public static getPixDiscountPercent(subtotalWithMargin: number): number {
    if (subtotalWithMargin <= 149.99) return 6.09;
    if (subtotalWithMargin <= 399.99) return 7.01;
    if (subtotalWithMargin <= 499.99) return 7.91;
    if (subtotalWithMargin <= 599.99) return 8.80;
    if (subtotalWithMargin <= 999.99) return 9.67;
    return 10.00;
  }

  /**
   * Executa o cálculo financeiro completo e rateio por item
   */
  public static calculate(
    items: SaleItemInput[],
    paymentMethod: PaymentMethod = 'PIX'
  ): PricingCalculationResult {
    // 1. Custo Original Total
    const totalOriginalCost = items.reduce(
      (sum, item) => sum + (Number(item.original_unit_cost) || 0) * (Number(item.quantity) || 1),
      0
    );

    const totalQuantity = items.reduce(
      (sum, item) => sum + (Number(item.quantity) || 1),
      0
    ) || 1;

    // Etapa A: Margem Bruta
    const profitMarginPercent = this.getMarginPercent(totalOriginalCost);
    const marginAmount = totalOriginalCost * (profitMarginPercent / 100);
    const subtotalWithMargin = totalOriginalCost + marginAmount;

    // Etapa B: Rateio de Frete Fixo R$ 15,00
    const freightCost = totalOriginalCost > 0 ? this.FIXED_FREIGHT : 0;
    const subtotalWithFreight = subtotalWithMargin + freightCost;
    const freightPerUnit = totalQuantity > 0 ? freightCost / totalQuantity : 0;

    // Etapa C: Taxa do Cartão / Maquininha (%)
    const cardFeePercent = this.getCardFeePercent(subtotalWithMargin);
    const cardSaleTotal = subtotalWithFreight * (1 + cardFeePercent / 100);
    const cardFeeAmount = cardSaleTotal * (cardFeePercent / 100);

    // Etapa D: Parcelamento no Cartão
    const maxInstallments = this.getMaxInstallments(subtotalWithMargin);
    const installmentValue = maxInstallments > 0 ? cardSaleTotal / maxInstallments : cardSaleTotal;

    // Etapa E: Desconto e Valor no PIX (aplicado sobre o Total no Cartão)
    const pixDiscountPercent = this.getPixDiscountPercent(subtotalWithMargin);
    const pixSaleTotal = cardSaleTotal * (1 - pixDiscountPercent / 100);
    const pixDiscountAmount = cardSaleTotal - pixSaleTotal;

    // Determina valor final e lucro com base na forma de pagamento
    let finalSaleTotal = 0;
    let netProfit = 0;

    if (paymentMethod === 'CARTAO') {
      finalSaleTotal = cardSaleTotal;
      // Lucro Líquido = Valor Total no Cartão - Custo Original - R$ 15,00 (frete) - Custo da Taxa
      netProfit = cardSaleTotal - totalOriginalCost - freightCost - cardFeeAmount;
    } else {
      // PIX ou DINHEIRO
      finalSaleTotal = pixSaleTotal;
      // Lucro Líquido = Valor Total no PIX - Custo Original - R$ 15,00 (frete)
      netProfit = pixSaleTotal - totalOriginalCost - freightCost;
    }

    const netMarginPercent = finalSaleTotal > 0 ? (netProfit / finalSaleTotal) * 100 : 0;

    // Rateio proporcional dos itens para a forma de pagamento selecionada
    const multiplier = totalOriginalCost > 0 ? finalSaleTotal / totalOriginalCost : 1;

    const calculatedItems: CalculatedSaleItem[] = items.map((item, idx) => {
      const unitCost = Number(item.original_unit_cost) || 0;
      const qty = Number(item.quantity) || 1;
      
      // Preço unitário ajustado proporcionalmente
      let finalUnitPrice = unitCost * multiplier;
      // Se tiver apenas 1 item total, garante que case exatamente com finalSaleTotal
      if (items.length === 1 && qty === 1) {
        finalUnitPrice = finalSaleTotal;
      }
      
      const finalTotalPrice = finalUnitPrice * qty;

      return {
        ...item,
        id: item.id || `item-${idx + 1}`,
        item_code: (item.item_code || '').replace(/^NP/i, '').trim(),
        item_name: item.item_name || 'Peça Automotiva',
        brand: item.brand || 'Original',
        quantity: qty,
        original_unit_cost: unitCost,
        final_unit_price: Number(finalUnitPrice.toFixed(2)),
        final_total_price: Number(finalTotalPrice.toFixed(2)),
        freight_portion: Number((freightPerUnit * qty).toFixed(2)),
        margin_amount: Number(((unitCost * (profitMarginPercent / 100)) * qty).toFixed(2)),
      };
    });

    return {
      original_cost_total: Number(totalOriginalCost.toFixed(2)),
      payment_method: paymentMethod,
      total_items_count: totalQuantity,

      profit_margin_percent: profitMarginPercent,
      margin_amount: Number(marginAmount.toFixed(2)),
      subtotal_with_margin: Number(subtotalWithMargin.toFixed(2)),

      freight_cost: freightCost,
      subtotal_with_freight: Number(subtotalWithFreight.toFixed(2)),
      freight_per_item: Number(freightPerUnit.toFixed(2)),

      card_fee_percent: cardFeePercent,
      card_fee_amount: Number(cardFeeAmount.toFixed(2)),
      card_sale_total: Number(cardSaleTotal.toFixed(2)),

      max_installments: maxInstallments,
      installment_value: Number(installmentValue.toFixed(2)),

      pix_discount_percent: pixDiscountPercent,
      pix_discount_amount: Number(pixDiscountAmount.toFixed(2)),
      pix_sale_total: Number(pixSaleTotal.toFixed(2)),

      final_sale_total: Number(finalSaleTotal.toFixed(2)),
      net_profit: Number(netProfit.toFixed(2)),
      net_margin_percent: Number(netMarginPercent.toFixed(2)),

      items: calculatedItems,
    };
  }
}

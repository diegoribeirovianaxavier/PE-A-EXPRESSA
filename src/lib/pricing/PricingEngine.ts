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
   * Retorna a taxa real cobrada pela operadora da maquininha de acordo com o número exato de parcelas
   */
  public static getCardFeePercentByInstallments(installments: number = 1): number {
    const inst = Math.max(1, Math.min(12, Math.floor(installments)));
    switch (inst) {
      case 1:
        return 4.39; // 1x no crédito / à vista
      case 2:
        return 5.39;
      case 3:
        return 6.12;
      case 4:
        return 6.85;
      case 5:
        return 7.57;
      case 6:
        return 8.28;
      case 7:
        return 8.99;
      case 8:
        return 9.68;
      case 9:
        return 10.37;
      case 10:
        return 11.06;
      case 11:
        return 11.75;
      case 12:
        return 12.44;
      default:
        return 11.06;
    }
  }

  /**
   * Determina a faixa de precificação (Taxa teto de cartão, parcelas máximas e desconto PIX)
   * Baseado no VALOR FINAL CONVERTIDO com frete e margem
   */
  public static getPricingTier(subtotalWithFreight: number): {
    cardFeePercent: number;
    maxInstallments: number;
    pixDiscountPercent: number;
  } {
    // Avalia as faixas pelo valor final já convertido:
    // Faixa 6: A partir de R$ 1.000,00 -> Até 10x | Taxa: 11.06% | PIX: 10.00%
    if (subtotalWithFreight * 1.1106 >= 1000.00) {
      return { cardFeePercent: 11.06, maxInstallments: 10, pixDiscountPercent: 10.00 };
    }
    // Faixa 5: R$ 600,00 até R$ 999,99 -> Até 6x | Taxa: 8.28% | PIX: 9.67%
    if (subtotalWithFreight * 1.0828 >= 600.00) {
      return { cardFeePercent: 8.28, maxInstallments: 6, pixDiscountPercent: 9.67 };
    }
    // Faixa 4: R$ 500,00 até R$ 599,99 -> Até 5x | Taxa: 7.57% | PIX: 8.80%
    if (subtotalWithFreight * 1.0757 >= 500.00) {
      return { cardFeePercent: 7.57, maxInstallments: 5, pixDiscountPercent: 8.80 };
    }
    // Faixa 3: R$ 400,00 até R$ 499,99 -> Até 4x | Taxa: 6.85% | PIX: 7.91%
    if (subtotalWithFreight * 1.0685 >= 400.00) {
      return { cardFeePercent: 6.85, maxInstallments: 4, pixDiscountPercent: 7.91 };
    }
    // Faixa 2: R$ 150,00 até R$ 399,99 -> Até 3x | Taxa: 6.12% | PIX: 7.01%
    if (subtotalWithFreight * 1.0612 >= 150.00) {
      return { cardFeePercent: 6.12, maxInstallments: 3, pixDiscountPercent: 7.01 };
    }
    // Faixa 1: Até R$ 149,99 -> Até 2x | Taxa: 5.39% | PIX: 6.09%
    return { cardFeePercent: 5.39, maxInstallments: 2, pixDiscountPercent: 6.09 };
  }

  /**
   * Helper para Etapa C
   */
  public static getCardFeePercent(subtotalWithFreight: number): number {
    return this.getPricingTier(subtotalWithFreight).cardFeePercent;
  }

  /**
   * Helper para Etapa D
   */
  public static getMaxInstallments(subtotalWithFreight: number): number {
    return this.getPricingTier(subtotalWithFreight).maxInstallments;
  }

  /**
   * Helper para Etapa E
   */
  public static getPixDiscountPercent(subtotalWithFreight: number): number {
    return this.getPricingTier(subtotalWithFreight).pixDiscountPercent;
  }

  /**
   * Executa o cálculo financeiro completo e rateio por item com desconto de taxa exata por parcela ou PIX
   */
  public static calculate(
    items: SaleItemInput[],
    paymentMethod: PaymentMethod = 'PIX',
    installmentsCount: number = 1
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

    // Etapas C, D e E: Determinadas sobre o VALOR FINAL CONVERTIDO
    const tier = this.getPricingTier(subtotalWithFreight);
    const cardFeePercent = tier.cardFeePercent;
    const maxInstallments = tier.maxInstallments;
    const pixDiscountPercent = tier.pixDiscountPercent;

    // Preço Final de Tabela no Cartão
    const cardSaleTotal = subtotalWithFreight * (1 + cardFeePercent / 100);

    // Parcelamento no Cartão
    const actualInstallments = Math.max(1, Math.min(maxInstallments, installmentsCount || 1));
    const installmentValue = actualInstallments > 0 ? cardSaleTotal / actualInstallments : cardSaleTotal;

    // Taxa REAL cobrada pela maquininha conforme a parcela escolhida
    const appliedCardFeePercent =
      paymentMethod === 'CARTAO'
        ? this.getCardFeePercentByInstallments(actualInstallments)
        : 0; // No PIX a taxa de maquininha é ZERO

    const appliedCardFeeAmount = cardSaleTotal * (appliedCardFeePercent / 100);

    // Desconto e Valor no PIX (aplicado sobre o Total no Cartão)
    const pixSaleTotal = cardSaleTotal * (1 - pixDiscountPercent / 100);
    const pixDiscountAmount = cardSaleTotal - pixSaleTotal;

    // Determina valor final e lucro real com base na forma de pagamento e parcelamento
    let finalSaleTotal = 0;
    let netProfit = 0;

    if (paymentMethod === 'CARTAO') {
      finalSaleTotal = cardSaleTotal;
      // Lucro Líquido = Total do Cartão - Custo Original - Frete R$ 15,00 - Taxa REAL da Maquininha na Parcela
      netProfit = cardSaleTotal - totalOriginalCost - freightCost - appliedCardFeeAmount;
    } else {
      // PIX ou DINHEIRO (Sem taxa de maquininha)
      finalSaleTotal = pixSaleTotal;
      // Lucro Líquido = Total no PIX - Custo Original - Frete R$ 15,00
      netProfit = pixSaleTotal - totalOriginalCost - freightCost;
    }

    const netMarginPercent = finalSaleTotal > 0 ? (netProfit / finalSaleTotal) * 100 : 0;

    // Rateio proporcional dos itens para a forma de pagamento selecionada
    const multiplier = totalOriginalCost > 0 ? finalSaleTotal / totalOriginalCost : 1;

    const calculatedItems: CalculatedSaleItem[] = items.map((item, idx) => {
      const unitCost = Number(item.original_unit_cost) || 0;
      const qty = Number(item.quantity) || 1;
      
      let finalUnitPrice = unitCost * multiplier;
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
      installments_count: actualInstallments,
      total_items_count: totalQuantity,

      profit_margin_percent: profitMarginPercent,
      margin_amount: Number(marginAmount.toFixed(2)),
      subtotal_with_margin: Number(subtotalWithMargin.toFixed(2)),

      freight_cost: freightCost,
      subtotal_with_freight: Number(subtotalWithFreight.toFixed(2)),
      freight_per_item: Number(freightPerUnit.toFixed(2)),

      card_fee_percent: cardFeePercent,
      card_fee_amount: Number(appliedCardFeeAmount.toFixed(2)),
      card_sale_total: Number(cardSaleTotal.toFixed(2)),

      applied_card_fee_percent: appliedCardFeePercent,
      applied_card_fee_amount: Number(appliedCardFeeAmount.toFixed(2)),

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

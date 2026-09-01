// Teste de validação das regras de negócio do PricingEngine
const FIXED_FREIGHT = 15.00;

function getMarginPercent(cost) {
  if (cost <= 100.00) return 17.0;
  if (cost <= 200.00) return 13.0;
  if (cost <= 300.00) return 10.0;
  if (cost <= 400.00) return 8.5;
  if (cost <= 500.00) return 7.0;
  if (cost <= 600.00) return 6.5;
  return 6.0;
}

function getCardFeePercent(subtotal) {
  if (subtotal <= 149.99) return 5.39;
  if (subtotal <= 399.99) return 6.12;
  if (subtotal <= 499.99) return 6.85;
  if (subtotal <= 599.99) return 7.57;
  if (subtotal <= 999.99) return 8.28;
  return 11.06;
}

function getMaxInstallments(subtotal) {
  if (subtotal <= 149.99) return 2;
  if (subtotal <= 399.99) return 3;
  if (subtotal <= 499.99) return 4;
  if (subtotal <= 599.99) return 5;
  if (subtotal <= 999.99) return 6;
  return 10;
}

function getPixDiscountPercent(subtotal) {
  if (subtotal <= 149.99) return 6.09;
  if (subtotal <= 399.99) return 7.01;
  if (subtotal <= 499.99) return 7.91;
  if (subtotal <= 599.99) return 8.80;
  if (subtotal <= 999.99) return 9.67;
  return 10.00;
}

function testCalculation(cost, paymentMethod = 'PIX') {
  const marginPct = getMarginPercent(cost);
  const marginAmt = cost * (marginPct / 100);
  const subtotalMargin = cost + marginAmt;
  const subtotalFreight = subtotalMargin + FIXED_FREIGHT;
  const cardFeePct = getCardFeePercent(subtotalMargin);
  const cardTotal = subtotalFreight * (1 + cardFeePct / 100);
  const maxInst = getMaxInstallments(subtotalMargin);
  const instVal = cardTotal / maxInst;
  const pixDiscountPct = getPixDiscountPercent(subtotalMargin);
  const pixTotal = cardTotal * (1 - pixDiscountPct / 100);

  let finalTotal = paymentMethod === 'CARTAO' ? cardTotal : pixTotal;
  let netProfit = 0;
  if (paymentMethod === 'CARTAO') {
    const feeAmt = cardTotal * (cardFeePct / 100);
    netProfit = cardTotal - cost - FIXED_FREIGHT - feeAmt;
  } else {
    netProfit = pixTotal - cost - FIXED_FREIGHT;
  }

  console.log(`=== TESTE PARA CUSTO R$ ${cost.toFixed(2)} (${paymentMethod}) ===`);
  console.log(`Margem Etapa A: +${marginPct}% (R$ ${marginAmt.toFixed(2)})`);
  console.log(`Subtotal c/ Margem: R$ ${subtotalMargin.toFixed(2)}`);
  console.log(`Subtotal c/ Frete: R$ ${subtotalFreight.toFixed(2)}`);
  console.log(`Total Cartão: R$ ${cardTotal.toFixed(2)} (+${cardFeePct}%)`);
  console.log(`Parcelas: Até ${maxInst}x de R$ ${instVal.toFixed(2)}`);
  console.log(`Total PIX: R$ ${pixTotal.toFixed(2)} (-${pixDiscountPct}%)`);
  console.log(`Valor Final Cobrado: R$ ${finalTotal.toFixed(2)}`);
  console.log(`Lucro Líquido Real: R$ ${netProfit.toFixed(2)}`);
  console.log('--------------------------------------------------\n');
}

testCalculation(85.00, 'PIX');
testCalculation(180.00, 'PIX');
testCalculation(350.00, 'CARTAO');
testCalculation(520.00, 'CARTAO');
testCalculation(1200.00, 'PIX');

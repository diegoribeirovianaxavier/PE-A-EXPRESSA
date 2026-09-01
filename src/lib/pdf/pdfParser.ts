import { OcrExtractedData } from '../types';
import { cleanProductCode } from '../formatters';

/**
 * Utilitário de parsing nativo para extração de texto de PDFs (DAVs, Orçamentos, DANFEs)
 * Funciona 100% de forma local e offline sem depender de IA externa.
 */
export class NativePdfParser {
  /**
   * Extrai dados comerciais e fiscais do texto bruto do PDF/DAV
   */
  public static parseDavText(rawText: string): OcrExtractedData {
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    
    let originalInvoiceNumber = '';
    let clientName = '';
    let clientPhone = '';
    let carModel = '';
    let notes = '';

    // 1. Extração do Número do DAV / Pedido / Orçamento / NF
    const davMatch = rawText.match(/(?:DAV|D\.A\.V|ORÇAMENTO|ORCAMENTO|PEDIDO|NOTA|NF(?:-e)?|DOCUMENTO AUXILIAR)[^\d\n]*([0-9]{3,10})/i);
    if (davMatch) {
      originalInvoiceNumber = `DAV-${davMatch[1]}`;
    }

    // 2. Extração do Cliente / Destinatário
    const clientMatch = rawText.match(/(?:CLIENTE|NOME|DESTINAT[AÁ]RIO|RAZ[AÃ]O SOCIAL)[\s.:\-]+([^\n\r,;]{3,50})/i);
    if (clientMatch) {
      const candidate = clientMatch[1].trim();
      if (!candidate.match(/PEÇA EXPRESSA|NOVA PEÇAS|CNPJ|CPF|ENDEREÇO/i)) {
        clientName = candidate;
      }
    }

    // 3. Extração de Telefone / WhatsApp
    const phoneMatch = rawText.match(/(?:\(?\b[1-9]{2}\)?\s*(?:9\s*)?[2-9]\d{3}[-\s]?\d{4}\b)/);
    if (phoneMatch) {
      clientPhone = phoneMatch[0].trim();
    }

    // 4. Extração de Veículo / Carro / Placa
    const carMatch = rawText.match(/(?:VE[IÍ]CULO|CARRO|MODELO|PLACA)[\s.:\-]+([^\n\r,;]{3,50})/i);
    if (carMatch) {
      carModel = carMatch[1].trim();
    }

    // 5. Extração de Itens / Autopeças
    const items: Array<{
      item_code?: string;
      item_name: string;
      brand?: string;
      quantity: number;
      original_unit_cost: number;
    }> = [];

    // Expressões regulares para linhas de itens típicas de sistemas automotivos:
    // Ex: "NP-BD4120 JOGO PASTILHA FREIO DIANT FRAS-LE 1 UN 180,00 180,00"
    // Ex: "001 10420 AMORTECEDOR COFAP 2.00 150.00 300.00"
    for (const line of lines) {
      // Ignora cabeçalhos
      if (line.match(/CÓDIGO|DESCRIC|PRODUTO|QUANT|VALOR|TOTAL|SUBTOTAL|EMISSÃO/i) && line.length < 60) {
        continue;
      }

      // Procura linha com valores monetários no final (ex: "150,00" ou "150.00")
      const moneyMatches = line.match(/(?:R\$\s*)?(\d{1,5}[.,]\d{2})/g);
      if (moneyMatches && moneyMatches.length >= 1) {
        // Encontrou uma linha candidata a item
        const lastMoney = moneyMatches[moneyMatches.length - 1].replace('R$', '').replace(',', '.').trim();
        const unitMoney = moneyMatches.length >= 2 
          ? moneyMatches[moneyMatches.length - 2].replace('R$', '').replace(',', '.').trim()
          : lastMoney;

        const unitCost = parseFloat(unitMoney) || 0;
        if (unitCost <= 0) continue;

        // Procura quantidade
        let qty = 1;
        const qtyMatch = line.match(/(?:^|\s)(\d{1,3})(?:\s*(?:UN|PC|PÇ|CX|JG|PAR|KIT))?\s+(?:R\$\s*)?\d+[.,]\d{2}/i);
        if (qtyMatch) {
          qty = parseInt(qtyMatch[1], 10) || 1;
        }

        // Procura código do produto (palavra inicial com números/letras)
        const codeMatch = line.match(/^([A-Za-z0-9\-_]{3,20})/);
        const code = codeMatch ? cleanProductCode(codeMatch[1]) : '';

        // Descrição do produto: remove valores monetários e código do início
        let name = line
          .replace(/^([A-Za-z0-9\-_]{3,20})/, '')
          .replace(/(?:R\$\s*)?\d{1,5}[.,]\d{2}/g, '')
          .replace(/\b(?:UN|PC|PÇ|CX|JG|PAR|KIT)\b/gi, '')
          .replace(/\s{2,}/g, ' ')
          .trim();

        if (!name || name.length < 3) {
          name = 'Peça Automotiva';
        }

        // Tenta detectar marcas conhecidas no nome
        let brand = 'Original';
        const brandList = ['COFAP', 'NAKATA', 'FRAS-LE', 'FRASLE', 'BOSCH', 'VALEO', 'SAMPEL', 'FREMAX', 'COBREQ', 'TECFIL', 'MANN', 'MAHLE', 'DAYCO', 'GATES', 'MONROE', 'TRW', 'MAGNETI MARELLI'];
        for (const b of brandList) {
          if (new RegExp(`\\b${b}\\b`, 'i').test(line)) {
            brand = b;
            break;
          }
        }

        items.push({
          item_code: code,
          item_name: name,
          brand: brand,
          quantity: qty,
          original_unit_cost: unitCost,
        });
      }
    }

    const totalCost = items.reduce((sum, it) => sum + (it.original_unit_cost * it.quantity), 0);

    return {
      original_invoice_number: originalInvoiceNumber,
      client_name: clientName,
      client_phone: clientPhone,
      car_model: carModel,
      items: items,
      total_original_cost: Number(totalCost.toFixed(2)),
      notes: `Extraído nativamente do documento PDF (${items.length} itens encontrados).`,
    };
  }
}

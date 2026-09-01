import { OcrExtractedData } from '../types';
import { cleanProductCode, formatPhone } from '../formatters';

export class NativePdfParser {
  public static parseDavText(rawText: string, fileName?: string): OcrExtractedData {
    let docNumber = '';
    const numMatch =
      rawText.match(/N[ºo°]\s*do\s*Documento:\s*([0-9]+)/i) ||
      rawText.match(/(?:DAV|D\.A\.V|Documento|Pedido|Orçamento)[\s.:\-#]*([0-9]{4,10})/i);
    if (numMatch) {
      docNumber = numMatch[1];
    } else if (fileName) {
      const fileNumMatch = fileName.match(/(\d{4,10})/);
      if (fileNumMatch) docNumber = fileNumMatch[1];
    }

    let clientName = '';
    const clientMatch = rawText.match(/NOME\s*DO\s*CLIENTE:\s*([^\n\r]+)/i);
    if (clientMatch) {
      clientName = clientMatch[1].trim();
    }

    let carModel = '';
    const carMatch = rawText.match(/VE[IÍ]CULO(?:\s*DO\s*CLIENTE)?:\s*([^\n\r]+)/i);
    if (carMatch) {
      carModel = carMatch[1].trim();
    }

    let clientPhone = '';
    const phoneMatch =
      rawText.match(/CONTATO(?:\s*DO\s*CLIENTE)?:\s*([^\n\r]+)/i) ||
      rawText.match(/(?:(?:\+?55\s*)?(?:\(?\b[1-9]{2}\)?\s*)?(?:9\s*)?[2-9]\d{3}[-\s]?\d{4})/);
    if (phoneMatch) {
      const rawP = phoneMatch[1] ? phoneMatch[1].trim() : phoneMatch[0].trim();
      clientPhone = formatPhone(rawP);
    }

    // Seção de Mercadorias
    const items: Array<{
      item_code?: string;
      item_name: string;
      brand?: string;
      quantity: number;
      original_unit_cost: number;
    }> = [];

    const mercSectionMatch = rawText.match(/Identificação das Mercadorias([\s\S]*?)Identificação do Cliente/i);
    const mercText = mercSectionMatch ? mercSectionMatch[1] : rawText;

    const lines = mercText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let currentItem: { pendingDescription?: string } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Ignora headers
      if (line.match(/PRODUTO|DESCRIÇÃO|SUB-TOTAL|DESCONTO|VALOR|QTD|EMITENTE|ESTABELECIMENTO/i) && line.length < 50) {
        continue;
      }

      const numberEndMatch = line.match(/(\d+[.,]\d{2})\s+(\d+[.,]\d{2})\s+(\d+[.,]\d{2})(?:\s+(\d+[.,]\d{2}))?(?:\s+(\d+[.,]\d{2}))?$/);

      if (numberEndMatch) {
        const valuesStr = numberEndMatch[0];
        const textBeforeValues = line.substring(0, line.length - valuesStr.length).trim();

        let fullDescription = textBeforeValues;
        if (currentItem && currentItem.pendingDescription) {
          fullDescription = currentItem.pendingDescription + ' ' + textBeforeValues;
          currentItem = null;
        }

        let code = '';
        const codeMatch = fullDescription.match(/^([A-Za-z0-9\-_]+)/);
        if (codeMatch) {
          code = cleanProductCode(codeMatch[1]);
        }

        let cleanDesc = fullDescription
          .replace(/^([A-Za-z0-9\-_]+)/, '')
          .replace(/\([A-Za-z0-9\-_]+\)/g, '')
          .replace(/\(\s*UN\s*/gi, '')
          .replace(/\s{2,}/g, ' ')
          .trim();

        let brand = 'Original';
        const brandHyphenMatch = cleanDesc.match(/-\s*([A-Za-z0-9\s\-]+)$/);
        if (brandHyphenMatch) {
          brand = brandHyphenMatch[1].trim();
          cleanDesc = cleanDesc.replace(/-\s*([A-Za-z0-9\s\-]+)$/, '').trim();
        }

        cleanDesc = cleanDesc.replace(/[()]/g, '').trim();

        const qtd = parseFloat(numberEndMatch[1].replace(',', '.')) || 1;
        const unitCost = parseFloat(numberEndMatch[2].replace(',', '.')) || 0;

        if (unitCost > 0) {
          items.push({
            item_code: code,
            item_name: cleanDesc || 'Peça Automotiva',
            brand: brand,
            quantity: qtd,
            original_unit_cost: unitCost,
          });
        }
      } else {
        if (!line.match(/Identificação|PRODUTO|DESCRIÇÃO|ESTABELECIMENTO/i)) {
          if (!currentItem) {
            currentItem = { pendingDescription: line };
          } else {
            currentItem.pendingDescription += ' ' + line;
          }
        }
      }
    }

    const totalCost = items.reduce((sum, it) => sum + (it.original_unit_cost * it.quantity), 0);

    return {
      original_invoice_number: docNumber || `DAV-${Date.now().toString().slice(-5)}`,
      client_name: clientName || '',
      client_phone: clientPhone || '',
      car_model: carModel || '',
      items: items,
      total_original_cost: Number(totalCost.toFixed(2)),
      notes: `Documento DAV processado (${items.length} itens extraídos).`,
    };
  }
}

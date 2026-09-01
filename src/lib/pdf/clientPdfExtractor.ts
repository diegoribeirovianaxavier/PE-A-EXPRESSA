import { OcrExtractedData } from '../types';
import { cleanProductCode, formatPhone } from '../formatters';

/**
 * Extrator nativo e universal de texto de PDFs (DAVs, Orçamentos, DANFEs)
 * Executa diretamente no navegador ou no servidor sem precisar de IA externa.
 */
export class ClientPdfExtractor {
  /**
   * Garante o carregamento do pdf.js no navegador
   */
  private static async loadPdfJsScript(): Promise<any> {
    if (typeof window === 'undefined') return null;

    if ((window as any).pdfjsLib) {
      return (window as any).pdfjsLib;
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        const lib = (window as any).pdfjsLib;
        if (lib) {
          lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        resolve(lib);
      };
      script.onerror = () => {
        resolve(null);
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Extrai o texto completo de um arquivo PDF
   */
  public static async extractTextFromPdf(fileOrBuffer: File | Blob | ArrayBuffer): Promise<string> {
    // 1. Tenta carregar o pdfjs via CDN no navegador
    try {
      const pdfjsLib = await this.loadPdfJsScript();
      if (pdfjsLib) {
        let arrayBuffer: ArrayBuffer;
        if (fileOrBuffer instanceof ArrayBuffer) {
          arrayBuffer = fileOrBuffer;
        } else {
          arrayBuffer = await (fileOrBuffer as Blob).arrayBuffer();
        }

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        let fullText = '';

        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const textContent = await page.getTextContent();
          
          let lastY: number | null = null;
          let pageText = '';

          for (const item of textContent.items as any[]) {
            if (lastY !== null && Math.abs(item.transform[5] - lastY) > 4) {
              pageText += '\n';
            } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
              pageText += ' ';
            }
            pageText += item.str;
            lastY = item.transform[5];
          }

          fullText += pageText + '\n';
        }

        if (fullText.trim().length > 10) {
          return fullText;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar PDF via pdf.js:', e);
    }

    // 2. Fallback por decodificação de stream de strings
    try {
      let buffer: ArrayBuffer;
      if (fileOrBuffer instanceof ArrayBuffer) {
        buffer = fileOrBuffer;
      } else {
        buffer = await (fileOrBuffer as Blob).arrayBuffer();
      }

      const decoder = new TextDecoder('latin1');
      const rawString = decoder.decode(buffer);
      
      const textMatches: string[] = [];
      const tjRegex = /\(([^)]+)\)\s*Tj/g;
      let match;
      while ((match = tjRegex.exec(rawString)) !== null) {
        textMatches.push(match[1]);
      }

      if (textMatches.length > 5) {
        return textMatches.join('\n');
      }
    } catch (e) {
      console.warn('Erro no fallback de string do PDF:', e);
    }

    return '';
  }

  /**
   * Analisa e estrutura o texto extraído do DAV / Orçamento
   */
  public static parsePdfText(rawText: string, fileName?: string): OcrExtractedData {
    let docNumber = '';
    const numMatch =
      rawText.match(/N[ºo°]\s*do\s*Documento:\s*([0-9]+)/i) ||
      rawText.match(/(?:DAV|D\.A\.V|Documento|Pedido|Orçamento|Orçamento)[\s.:\-#]*([0-9]{4,10})/i);
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

    let paymentMethod = 'CARTAO';
    const payMatch = rawText.match(/FORMA\s*DE\s*PAGAMENTO:\s*([^\n\r]+)/i);
    if (payMatch) {
      const payText = payMatch[1].toUpperCase();
      if (payText.includes('PIX') || payText.includes('DINHEIRO')) {
        paymentMethod = 'PIX';
      } else {
        paymentMethod = 'CARTAO';
      }
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

      // Procura linhas que terminem com sequência de valores monetários (QTD, VALOR, SUB-TOTAL, etc.)
      const numberEndMatch = line.match(/(\d+[.,]\d{2})\s+(\d+[.,]\d{2})\s+(\d+[.,]\d{2})(?:\s+(\d+[.,]\d{2}))?(?:\s+(\d+[.,]\d{2}))?$/);

      if (numberEndMatch) {
        const valuesStr = numberEndMatch[0];
        const textBeforeValues = line.substring(0, line.length - valuesStr.length).trim();

        let fullDescription = textBeforeValues;
        if (currentItem && currentItem.pendingDescription) {
          fullDescription = currentItem.pendingDescription + ' ' + textBeforeValues;
          currentItem = null;
        }

        // Código do produto
        let code = '';
        const codeMatch = fullDescription.match(/^([A-Za-z0-9\-_]+)/);
        if (codeMatch) {
          code = cleanProductCode(codeMatch[1]);
        }

        // Descrição e Marca
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
        // Linha de quebra de texto (wrap)
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
      notes: `Documento DAV processado com sucesso (${items.length} itens extraídos).`,
    };
  }
}

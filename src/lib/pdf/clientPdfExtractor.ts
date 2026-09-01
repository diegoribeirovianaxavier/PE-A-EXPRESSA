import { OcrExtractedData } from '../types';
import { cleanProductCode, formatPhone } from '../formatters';

/**
 * Extrator nativo e universal de texto de PDFs (DAVs, Orçamentos, DANFEs)
 * Executa diretamente no navegador ou no servidor sem precisar de IA externa.
 */
export class ClientPdfExtractor {
  private static pdfjsLoaded: boolean = false;

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
            if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
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
        return textMatches.join(' ');
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
    const lines = rawText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    let originalInvoiceNumber = '';
    let clientName = '';
    let clientPhone = '';
    let carModel = '';

    // 1. Extração do Número do DAV / Pedido / Orçamento / NF
    const davMatch = rawText.match(/(?:DAV|D\.A\.V|ORÇAMENTO|ORCAMENTO|PEDIDO|NOTA|NF(?:-e)?|DOCUMENTO AUXILIAR)[\s.:\-#]*([0-9]{3,12})/i);
    if (davMatch) {
      originalInvoiceNumber = `DAV-${davMatch[1]}`;
    } else if (fileName) {
      const fileNumMatch = fileName.match(/(\d{3,10})/);
      if (fileNumMatch) {
        originalInvoiceNumber = `DAV-${fileNumMatch[1]}`;
      }
    }

    // 2. Extração do Cliente / Destinatário
    const clientMatch = rawText.match(/(?:CLIENTE|NOME|DESTINAT[AÁ]RIO|RAZ[AÃ]O SOCIAL)[\s.:\-]+([A-Za-zÀ-ÖØ-öø-ÿ\s]{3,40})/i);
    if (clientMatch) {
      const candidate = clientMatch[1].trim();
      if (!candidate.match(/PEÇA EXPRESSA|NOVA PEÇAS|CNPJ|CPF|ENDEREÇO|DATA|EMISSÃO/i)) {
        clientName = candidate;
      }
    }

    // 3. Extração de Telefone / WhatsApp
    const phoneMatch = rawText.match(/(?:\(?\b[1-9]{2}\)?\s*(?:9\s*)?[2-9]\d{3}[-\s]?\d{4}\b)/);
    if (phoneMatch) {
      clientPhone = formatPhone(phoneMatch[0].trim());
    }

    // 4. Extração de Veículo / Carro / Placa
    const carMatch = rawText.match(/(?:VE[IÍ]CULO|CARRO|MODELO|PLACA)[\s.:\-]+([A-Za-z0-9À-ÖØ-öø-ÿ\s\-\.\/]{3,35})/i);
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

    const brandList = [
      'COFAP', 'NAKATA', 'FRAS-LE', 'FRASLE', 'BOSCH', 'VALEO', 'SAMPEL',
      'FREMAX', 'COBREQ', 'TECFIL', 'MANN', 'MAHLE', 'DAYCO', 'GATES',
      'MONROE', 'TRW', 'MAGNETI MARELLI', 'VICTOR REINZ', 'SABO', 'SKF', 'INA'
    ];

    for (const line of lines) {
      // Ignora linhas de cabeçalho
      if (line.match(/CÓDIGO|DESCRIC|PRODUTO|QUANT|VALOR|TOTAL|SUBTOTAL|EMISSÃO|CNPJ|TELEFONE/i) && line.length < 50) {
        continue;
      }

      // Procura linha com valores monetários
      const moneyMatches = line.match(/(?:R\$\s*)?(\d{1,6}[.,]\d{2})/g);
      if (moneyMatches && moneyMatches.length >= 1) {
        const lastMoney = moneyMatches[moneyMatches.length - 1].replace('R$', '').replace(',', '.').trim();
        const unitMoney = moneyMatches.length >= 2 
          ? moneyMatches[moneyMatches.length - 2].replace('R$', '').replace(',', '.').trim()
          : lastMoney;

        const unitCost = parseFloat(unitMoney) || 0;
        if (unitCost <= 0) continue;

        // Quantidade
        let qty = 1;
        const qtyMatch = line.match(/(?:^|\s)(\d{1,3})(?:\s*(?:UN|PC|PÇ|CX|JG|PAR|KIT))?\s+(?:R\$\s*)?\d+[.,]\d{2}/i);
        if (qtyMatch) {
          qty = parseInt(qtyMatch[1], 10) || 1;
        }

        // Código do produto
        const codeMatch = line.match(/^([A-Za-z0-9\-_]{3,20})/);
        const code = codeMatch ? cleanProductCode(codeMatch[1]) : '';

        // Descrição do produto
        let name = line
          .replace(/^([A-Za-z0-9\-_]{3,20})/, '')
          .replace(/(?:R\$\s*)?\d{1,6}[.,]\d{2}/g, '')
          .replace(/\b(?:UN|PC|PÇ|CX|JG|PAR|KIT)\b/gi, '')
          .replace(/\s{2,}/g, ' ')
          .trim();

        if (!name || name.length < 3) {
          name = 'Peça Automotiva';
        }

        // Detecta marca
        let brand = 'Original';
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
      original_invoice_number: originalInvoiceNumber || `DAV-${Date.now().toString().slice(-5)}`,
      client_name: clientName || '',
      client_phone: clientPhone || '',
      car_model: carModel || '',
      items: items,
      total_original_cost: Number(totalCost.toFixed(2)),
      notes: `Extraído nativamente do documento PDF (${items.length} itens encontrados).`,
    };
  }
}

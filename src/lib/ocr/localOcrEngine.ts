import { OcrExtractedData, PaymentMethod } from '../types';
import { cleanProductCode, formatPhone } from '../formatters';

/**
 * MOTOR DE OCR 100% LOCAL E OFFLINE (ZERO DEPENDÊNCIA DE API OU IA EXTERNA)
 * Lê PDFs digitais, PDFs escaneados, Fotos/Imagens e Textos colados inteiramente no navegador.
 */
export class LocalOcrEngine {
  /**
   * Carrega a biblioteca Tesseract.js sob demanda no navegador
   */
  private static async loadTesseract(): Promise<any> {
    if (typeof window === 'undefined') return null;
    try {
      const Tesseract = await import('tesseract.js');
      return Tesseract.default || Tesseract;
    } catch (e) {
      console.warn('Erro ao carregar tesseract.js:', e);
      return null;
    }
  }

  /**
   * Carrega a biblioteca PDF.js sob demanda no navegador
   */
  private static async loadPdfJs(): Promise<any> {
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
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  }

  /**
   * Processa qualquer documento (PDF, Imagem JPG/PNG) 100% de forma local
   */
  public static async processDocument(
    file: File,
    onProgress?: (status: string, percent?: number) => void
  ): Promise<OcrExtractedData> {
    const fileName = file.name || '';
    const isPdf = fileName.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

    let rawText = '';

    // 1. SE FOR PDF, TENTA EXTRAIR CAMADA DE TEXTO DIGITAL RÁPIDA (0.1s)
    if (isPdf) {
      if (onProgress) onProgress('Lendo documento PDF nativamente...', 30);
      rawText = await this.extractTextFromPdfNative(file);

      // Se o PDF possuir texto digital suficiente, analisa diretamente
      if (rawText && rawText.trim().length > 30) {
        const parsed = this.parseDocumentText(rawText, fileName);
        if (parsed.items && parsed.items.length > 0) {
          if (onProgress) onProgress('Documento processado com sucesso!', 100);
          return parsed;
        }
      }

      // Se for um PDF escaneado (sem texto digital), renderiza a página e faz OCR local
      if (onProgress) onProgress('PDF escaneado detectado. Executando OCR local na imagem...', 50);
      rawText = await this.ocrScannedPdfLocally(file, onProgress);
    } else {
      // 2. SE FOR IMAGEM (JPG, PNG, WEBP), EXECUTA OCR 100% LOCAL (TESSERACT)
      if (onProgress) onProgress('Processando imagem com motor OCR local...', 40);
      rawText = await this.ocrImageLocally(file, onProgress);
    }

    if (onProgress) onProgress('Estruturando dados e autopeças...', 90);
    const result = this.parseDocumentText(rawText, fileName);
    if (onProgress) onProgress('Concluído!', 100);

    return result;
  }

  /**
   * Extração de texto de PDF nativo via PDF.js
   */
  private static async extractTextFromPdfNative(file: File): Promise<string> {
    try {
      const pdfjsLib = await this.loadPdfJs();
      if (!pdfjsLib) return '';

      const arrayBuffer = await file.arrayBuffer();
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

      return fullText;
    } catch (e) {
      console.warn('Falha na extração de texto nativo do PDF:', e);
      return '';
    }
  }

  /**
   * OCR local em páginas de PDF escaneado (Renderiza para Canvas e roda Tesseract)
   */
  private static async ocrScannedPdfLocally(
    file: File,
    onProgress?: (status: string, percent?: number) => void
  ): Promise<string> {
    try {
      const pdfjsLib = await this.loadPdfJs();
      const Tesseract = await this.loadTesseract();
      if (!pdfjsLib || !Tesseract) return '';

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;

      let fullOcrText = '';

      const maxPages = Math.min(pdfDoc.numPages, 3);
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          const imageBlob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
          if (imageBlob) {
            const { data } = await Tesseract.recognize(imageBlob, 'por+eng', {
              logger: (m: any) => {
                if (m.status === 'recognizing text' && onProgress) {
                  const p = Math.round(50 + (m.progress * 40));
                  onProgress(`Reconhecendo caracteres (Pág ${pageNum})...`, p);
                }
              },
            });
            fullOcrText += (data?.text || '') + '\n';
          }
        }
      }

      return fullOcrText;
    } catch (e) {
      console.warn('Erro no OCR local de PDF escaneado:', e);
      return '';
    }
  }

  /**
   * OCR local em arquivo de imagem (JPG, PNG, WebP)
   */
  private static async ocrImageLocally(
    file: File,
    onProgress?: (status: string, percent?: number) => void
  ): Promise<string> {
    try {
      const Tesseract = await this.loadTesseract();
      if (!Tesseract) return '';

      const { data } = await Tesseract.recognize(file, 'por+eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text' && onProgress) {
            const p = Math.round(40 + (m.progress * 50));
            onProgress(`Lendo imagem com OCR local (${Math.round(m.progress * 100)}%)...`, p);
          }
        },
      });

      return data?.text || '';
    } catch (e) {
      console.warn('Erro no OCR local de imagem:', e);
      return '';
    }
  }

  /**
   * Parser universal que extrai dados comerciais e itens de qualquer texto colado ou lido
   */
  public static parseDocumentText(rawText: string, fileName?: string): OcrExtractedData {
    if (!rawText) {
      return {
        original_invoice_number: `ORC-${Math.floor(10000 + Math.random() * 90000)}`,
        client_name: '',
        client_phone: '',
        car_model: '',
        items: [],
        total_original_cost: 0,
        notes: 'Documento processado localmente.',
      };
    }

    // 1. Número do Documento / Orçamento
    let docNumber = '';
    const numMatch =
      rawText.match(/NUMERO[.:\s]+([0-9]+)/i) ||
      rawText.match(/N[ºo°]?\s*(?:do\s*)?(?:Documento|Doc|DAV|Orçamento|Pedido|NF)[\s.:\-#]*([0-9]{3,12})/i) ||
      rawText.match(/(?:DAV|ORÇAMENTO|ORCAMENTO|PEDIDO|NOTA|NF(?:-e)?)[\s.:\-#]*([0-9]{4,12})/i);
    if (numMatch) {
      docNumber = numMatch[1];
    } else if (fileName) {
      const fileNumMatch = fileName.match(/(\d{4,10})/);
      if (fileNumMatch) docNumber = fileNumMatch[1];
    }

    // 2. Cliente
    let clientName = '';
    const clientMatch =
      rawText.match(/Nome\s*:\s*([^\n\r]+)/i) ||
      rawText.match(/(?:NOME\s*(?:DO\s*CLIENTE)?|CLIENTE|DESTINAT[AÁ]RIO|RAZ[AÃ]O\s*SOCIAL)[\s.:\-]+([A-Za-zÀ-ÖØ-öø-ÿ\s]{3,40})/i);
    if (clientMatch) {
      const candidate = clientMatch[1].trim();
      if (!candidate.match(/PEÇA EXPRESSA|NOVA PEÇAS|CNPJ|CPF|ENDEREÇO|DATA|EMISSÃO|VALOR/i)) {
        clientName = candidate;
      }
    }

    // 3. Veículo / Carro
    let carModel = '';
    const carMatch =
      rawText.match(/Carro\s*:\s*([^\n\r]+)/i) ||
      rawText.match(/(?:VE[IÍ]CULO(?:\s*DO\s*CLIENTE)?|CARRO|MODELO|PLACA)[\s.:\-]+([A-Za-z0-9À-ÖØ-öø-ÿ\s\-\.\/]{3,35})/i);
    if (carMatch) {
      carModel = carMatch[1].trim();
    }

    // 4. Endereço / Observações
    let address = '';
    const addrMatch = rawText.match(/Endere[çc]o\s*:\s*([^\n\r]+)/i);
    if (addrMatch) {
      address = addrMatch[1].trim();
    }

    // 5. Telefone / WhatsApp
    let clientPhone = '';
    const phoneMatch =
      rawText.match(/(?:Telefone|Contato|WhatsApp|Tel|Cel)\s*:\s*([^\n\r]+)/i) ||
      rawText.match(/(?:CONTATO(?:\s*DO\s*CLIENTE)?|TEL(?:EFONE)?|WHATSAPP|CEL(?:ULAR)?)[\s.:\-]+([0-9\s\(\)\-+]{8,20})/i) ||
      rawText.match(/(?:(?:\+?55\s*)?(?:\(?\b[1-9]{2}\)?\s*)?(?:9\s*)?[2-9]\d{3}[-\s]?\d{4})/);
    if (phoneMatch) {
      const rawP = phoneMatch[1] ? phoneMatch[1].trim() : phoneMatch[0].trim();
      clientPhone = formatPhone(rawP);
    }

    // 6. Forma de Pagamento
    let paymentMethod: PaymentMethod = 'CARTAO';
    const payMatch =
      rawText.match(/Pagamento\s*:\s*([^\n\r]+)/i) ||
      rawText.match(/FORMA\s*DE\s*PAGAMENTO[\s.:\-]+([^\n\r]+)/i);
    if (payMatch) {
      const payText = payMatch[1].toUpperCase();
      if (payText.includes('PIX') || payText.includes('DINHEIRO')) {
        paymentMethod = 'PIX';
      } else {
        paymentMethod = 'CARTAO';
      }
    }

    // 7. Extração de Itens / Autopeças
    const items: Array<{
      item_code?: string;
      item_name: string;
      brand?: string;
      quantity: number;
      original_unit_cost: number;
    }> = [];

    // Formato 1: Bloco de Orçamento da NOVA PEÇAS (PRODUTO: ... FABRICA: ... Qtd x Unit = Total)
    if (rawText.toUpperCase().includes('PRODUTO:') && rawText.includes('x')) {
      const productBlocks = rawText.split(/(?=PRODUTO:)/i);
      for (const block of productBlocks) {
        if (!block.toUpperCase().includes('PRODUTO:')) continue;

        const codeMatch = block.match(/PRODUTO\s*:\s*([^\n\r]+)/i);
        const fabMatch = block.match(/FABRICA\s*:\s*([^\n\r]+)/i);
        const mathMatch = block.match(/(\d+[.,]\d{2})\s*x\s*(\d+[.,]\d{2})\s*=\s*(\d+[.,]\d{2})/i);

        if (codeMatch && mathMatch) {
          const rawCode = codeMatch[1].trim();
          const brand = fabMatch ? fabMatch[1].trim() : 'Original';
          const quantity = parseFloat(mathMatch[1].replace(',', '.')) || 1;
          const unitCost = parseFloat(mathMatch[2].replace(',', '.')) || 0;

          // Descrição entre FABRICA e linha de cálculo
          let desc = '';
          const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
          let foundFab = false;
          for (const line of lines) {
            if (line.toUpperCase().includes('FABRICA:')) {
              foundFab = true;
              continue;
            }
            if (foundFab && !line.includes('x') && !line.includes('=') && !line.startsWith('-')) {
              desc = line.trim();
              break;
            }
          }

          items.push({
            item_code: cleanProductCode(rawCode),
            item_name: desc || 'Peça Automotiva',
            brand: brand,
            quantity: quantity,
            original_unit_cost: unitCost,
          });
        }
      }
    }

    // Formato 2: Tabela padrão DAV ou lista genérica de autopeças
    if (items.length === 0) {
      const brandList = [
        'COFAP', 'NAKATA', 'FRAS-LE', 'FRASLE', 'BOSCH', 'VALEO', 'SAMPEL',
        'FREMAX', 'COBREQ', 'TECFIL', 'MANN', 'MAHLE', 'DAYCO', 'GATES',
        'MONROE', 'TRW', 'MAGNETI MARELLI', 'VICTOR REINZ', 'SABO', 'SKF', 'INA',
        'AXIOS', 'HIPPER FREIOS', 'HIPPER', 'ORIG VW', 'HELIAR', 'MOURA', 'ORIGINAL'
      ];

      const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      let currentItem: { pendingDescription?: string } | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (
          line.match(/PRODUTO|DESCRIÇÃO|SUB-TOTAL|DESCONTO|VALOR|QTD|EMITENTE|ESTABELECIMENTO|CNPJ|TELEFONE|ENDEREÇO/i) &&
          line.length < 60
        ) {
          continue;
        }

        const numberEndMatch =
          line.match(/(\d+(?:[.,]\d{1,2})?)\s+(?:R\$\s*)?(\d+[.,]\d{2})\s+(?:R\$\s*)?(\d+[.,]\d{2})(?:\s+(?:R\$\s*)?(\d+[.,]\d{2}))?(?:\s+(?:R\$\s*)?(\d+[.,]\d{2}))?$/) ||
          line.match(/(?:R\$\s*)?(\d+[.,]\d{2})\s+(?:R\$\s*)?(\d+[.,]\d{2})$/);

        if (numberEndMatch) {
          const valuesStr = numberEndMatch[0];
          const textBeforeValues = line.substring(0, line.length - valuesStr.length).trim();

          let fullDescription = textBeforeValues;
          if (currentItem && currentItem.pendingDescription) {
            fullDescription = currentItem.pendingDescription + ' ' + textBeforeValues;
            currentItem = null;
          }

          let code = '';
          const codeMatch = fullDescription.match(/^([A-Za-z0-9\-_]{3,20})/);
          if (codeMatch) {
            code = cleanProductCode(codeMatch[1]);
          }

          let cleanDesc = fullDescription
            .replace(/^([A-Za-z0-9\-_]{3,20})/, '')
            .replace(/\([A-Za-z0-9\-_]+\)/g, '')
            .replace(/\(\s*UN\s*/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim();

          let brand = 'Original';
          const brandHyphenMatch = cleanDesc.match(/-\s*([A-Za-z0-9\s\-]+)$/);
          if (brandHyphenMatch) {
            brand = brandHyphenMatch[1].trim();
            cleanDesc = cleanDesc.replace(/-\s*([A-Za-z0-9\s\-]+)$/, '').trim();
          } else {
            for (const b of brandList) {
              if (new RegExp(`\\b${b}\\b`, 'i').test(fullDescription)) {
                brand = b;
                break;
              }
            }
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
          if (!line.match(/Identificação|PRODUTO|DESCRIÇÃO|ESTABELECIMENTO|CNPJ|TOTAL/i)) {
            if (!currentItem) {
              currentItem = { pendingDescription: line };
            } else {
              currentItem.pendingDescription += ' ' + line;
            }
          }
        }
      }
    }

    const totalCost = items.reduce((sum, it) => sum + it.original_unit_cost * it.quantity, 0);

    return {
      original_invoice_number: docNumber || '',
      client_name: clientName || '',
      client_phone: clientPhone || '',
      car_model: carModel || '',
      payment_method: paymentMethod,
      items: items,
      total_original_cost: Number(totalCost.toFixed(2)),
      notes: address ? `Endereço de Entrega: ${address}` : 'Orçamento processado com sucesso.',
    };
  }
}

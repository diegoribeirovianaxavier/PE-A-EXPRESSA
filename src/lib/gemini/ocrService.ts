import { GoogleGenerativeAI } from '@google/generative-ai';
import { OcrExtractedData } from '../types';

export class GeminiOcrService {
  /**
   * Processa imagem ou PDF em base64 com a API Gemini Vision
   */
  public static async extractInvoiceData(
    base64Data: string,
    mimeType: string = 'image/jpeg',
    apiKey?: string
  ): Promise<OcrExtractedData> {
    const key =
      apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!key) {
      throw new Error(
        'Chave GEMINI_API_KEY não configurada. Por favor, adicione sua chave nas variáveis de ambiente da Vercel.'
      );
    }

    const genAI = new GoogleGenerativeAI(key);

    const prompt = `Você é um especialista em OCR e análise de documentos fiscais e comerciais de autopeças (DANFE, Nota Fiscal, DAV - Documento Auxiliar de Venda, Orçamento, Pedido de Venda e Cupons de Balcão).
Analise com extrema precisão o documento (PDF ou imagem) fornecido e extraia todos os dados estritamente em formato JSON:

{
  "original_invoice_number": "string (ex: número do DAV, NF, Orçamento ou Pedido encontrado no documento)",
  "client_name": "string (nome do cliente/destinatário se constar, ou vazio)",
  "client_phone": "string (telefone, celular ou whatsapp do cliente se constar, ou vazio)",
  "car_model": "string (veículo, modelo, placa ou ano se constar, ou vazio)",
  "items": [
    {
      "item_code": "string (código da peça/produto limpo: REMOVA OBRIGATORIAMENTE qualquer prefixo interno como 'NP', 'NP-', 'NP ' deixando apenas o código do fabricante)",
      "item_name": "string (descrição completa da peça/autopeça)",
      "brand": "string (marca/fabricante da peça como Cofap, Fras-le, Bosch, Nakata, etc., ou 'Original' caso não especificado)",
      "quantity": 1,
      "original_unit_cost": 0.00
    }
  ],
  "total_original_cost": 0.00,
  "notes": "string (observações adicionais encontradas no documento)"
}

Instruções cruciais:
1. Extraia TODOS os itens/peças listados no documento sem omitir nenhum.
2. No campo "item_code", remova prefixos de loja física como "NP", "NP-", "NP ".
3. No campo "original_unit_cost", extraia o valor unitário da peça como número decimal (ex: 45.50).
4. No campo "quantity", extraia a quantidade como número inteiro ou decimal.
5. Retorne EXCLUSIVAMENTE a estrutura JSON válida, sem blocos de texto adicionais.`;

    // Remove prefixo data:...;base64, se presente
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');

    const candidateModels = [
      'gemini-3.6-flash',
      'gemini-3.7-flash',
      'gemini-flash-latest',
      'gemini-2.5-flash',
      'gemini-1.5-flash',
    ];

    let lastError: any = null;
    let responseText = '';

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType,
            },
          },
        ]);

        responseText = result.response.text();
        if (responseText) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Tentativa com modelo ${modelName} falhou, tentando próximo...`, err?.message);
      }
    }

    if (!responseText && lastError) {
      throw new Error(`Falha no processamento com a API Gemini: ${lastError.message}`);
    }

    try {
      const parsed = JSON.parse(responseText);

      // Sanitização e tratamento pós-OCR
      const items = (parsed.items || []).map((it: any) => ({
        item_code: String(it.item_code || '').replace(/^NP[-_\s]*/i, '').trim(),
        item_name: String(it.item_name || 'Peça Automotiva').trim(),
        brand: String(it.brand || 'Original').trim(),
        quantity: Number(it.quantity) || 1,
        original_unit_cost: Number(it.original_unit_cost) || 0,
      }));

      const totalCost = Number(parsed.total_original_cost) || 
        items.reduce((s: number, i: any) => s + (i.original_unit_cost * i.quantity), 0);

      return {
        original_invoice_number: parsed.original_invoice_number || '',
        client_name: parsed.client_name || '',
        client_phone: parsed.client_phone || '',
        car_model: parsed.car_model || '',
        items: items,
        total_original_cost: Number(totalCost.toFixed(2)),
        notes: parsed.notes || '',
      };
    } catch (parseError) {
      console.error('Erro ao analisar resposta JSON do Gemini:', responseText);
      throw new Error('Falha ao interpretar resposta da IA do Gemini. Verifique se o arquivo é legível.');
    }
  }

  /**
   * Fallback mock apenas caso haja falha crítica de rede
   */
  public static getMockOcrData(fileName: string): OcrExtractedData {
    return {
      original_invoice_number: `DAV-${Math.floor(10000 + Math.random() * 90000)}`,
      client_name: 'Cliente Balcão',
      client_phone: '',
      car_model: '',
      items: [
        {
          item_code: 'DF4201',
          item_name: 'Disco de Freio Dianteiro (Par)',
          brand: 'Fremax',
          quantity: 1,
          original_unit_cost: 160.00,
        },
      ],
      total_original_cost: 160.00,
      notes: `Documento: ${fileName}`,
    };
  }
}

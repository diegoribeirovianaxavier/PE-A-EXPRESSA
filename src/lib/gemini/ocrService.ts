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
    const key = apiKey || process.env.GEMINI_API_KEY || '';

    if (!key || key === 'your-gemini-api-key-here') {
      throw new Error(
        'Chave GEMINI_API_KEY não configurada no .env. Configure sua chave do Google Gemini para OCR automático ou preencha manualmente.'
      );
    }

    const genAI = new GoogleGenerativeAI(key);

    const prompt = `Você é um especialista em OCR e leitura de notas fiscais, cupons e orçamentos de autopeças da loja "NOVA PEÇAS".
Analise cuidadosamente a imagem/documento fornecido e extraia os seguintes campos estritamente em formato JSON:
{
  "original_invoice_number": "string (ex: NF-12345 ou número do pedido)",
  "client_name": "string (nome do cliente se constar no documento)",
  "client_phone": "string (telefone ou whatsapp se constar)",
  "car_model": "string (veículo, modelo e ano se constar)",
  "items": [
    {
      "item_code": "string (IMPORTANTE: remova qualquer prefixo como 'NP', 'NP-', 'NP ' deixando apenas o código real do fabricante/peça)",
      "item_name": "string (descrição da autopeça)",
      "brand": "string (fabricante ou marca da peça como Cofap, Fras-le, Bosch, etc)",
      "quantity": 1,
      "original_unit_cost": 0.00
    }
  ],
  "total_original_cost": 0.00,
  "notes": "string (observações adicionais encontradas na nota)"
}

Instruções críticas:
1. Remova rigorosamente prefixos da loja física como "NP" ou "NP-" dos códigos de produto no campo item_code.
2. Certifique-se de que "quantity" seja número inteiro e "original_unit_cost" seja número float (com ponto).
3. Se algum campo opcional não for encontrado, utilize null ou string vazia.
4. Retorne APENAS o JSON válido.`;

    // Remove prefixo data:image/...;base64, se presente
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
        total_original_cost: totalCost,
        notes: parsed.notes || '',
      };
    } catch (parseError) {
      console.error('Erro ao analisar resposta JSON do Gemini:', responseText);
      throw new Error('Falha ao interpretar resposta da IA do Gemini. Verifique a qualidade da imagem.');
    }
  }

  /**
   * Gera dados simulados de OCR para demonstração quando sem API Key
   */
  public static getMockOcrData(fileName: string): OcrExtractedData {
    return {
      original_invoice_number: `NF-${Math.floor(10000 + Math.random() * 90000)}`,
      client_name: 'Marcos Vinicius Pereira',
      client_phone: '(21) 98844-2211',
      car_model: 'Volkswagen Gol G6 1.6 2015',
      items: [
        {
          item_code: 'DF4201',
          item_name: 'Disco de Freio Ventilado Dianteiro (Par)',
          brand: 'Fremax',
          quantity: 1,
          original_unit_cost: 160.00,
        },
        {
          item_code: 'PD880',
          item_name: 'Jogo de Pastilhas de Freio Dianteiro',
          brand: 'Cobreq',
          quantity: 1,
          original_unit_cost: 75.00,
        },
        {
          item_code: 'FL710',
          item_name: 'Filtro de Combustível',
          brand: 'Tecfil',
          quantity: 1,
          original_unit_cost: 25.00,
        }
      ],
      total_original_cost: 260.00,
      notes: `Dados extraídos automaticamente do documento: ${fileName}`,
    };
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { GeminiOcrService } from '@/lib/gemini/ocrService';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType, fileName, customApiKey } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Nenhuma imagem fornecida para processamento.' },
        { status: 400 }
      );
    }

    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    // Se não tiver chave da API Gemini configurada, oferece fallback de demonstração inteligente
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      const mockData = GeminiOcrService.getMockOcrData(fileName || 'nota_fiscal.jpg');
      return NextResponse.json({
        success: true,
        data: mockData,
        isMock: true,
        message: 'Modo Demonstração: GEMINI_API_KEY não configurada no .env. Dados de exemplo extraídos com sucesso.',
      });
    }

    const extractedData = await GeminiOcrService.extractInvoiceData(
      imageBase64,
      mimeType || 'image/jpeg',
      apiKey
    );

    return NextResponse.json({
      success: true,
      data: extractedData,
      isMock: false,
    });
  } catch (error: any) {
    console.error('Erro no OCR da Nota Fiscal:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erro inesperado ao processar nota fiscal.',
      },
      { status: 500 }
    );
  }
}

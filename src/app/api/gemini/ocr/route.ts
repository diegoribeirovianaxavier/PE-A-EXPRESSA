import { NextRequest, NextResponse } from 'next/server';
import { GeminiOcrService } from '@/lib/gemini/ocrService';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType, fileName, customApiKey } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Nenhum documento ou imagem fornecido para processamento.' },
        { status: 400 }
      );
    }

    const apiKey =
      customApiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Chave GEMINI_API_KEY não encontrada nas variáveis de ambiente da Vercel. Por favor, adicione GEMINI_API_KEY nas configurações da Vercel e faça um novo deploy.',
        },
        { status: 400 }
      );
    }

    // Detecta mimeType adequado pelo nome do arquivo caso venha vazio
    let finalMimeType = mimeType || 'image/jpeg';
    if (fileName) {
      const lowerName = fileName.toLowerCase();
      if (lowerName.endsWith('.pdf')) finalMimeType = 'application/pdf';
      else if (lowerName.endsWith('.png')) finalMimeType = 'image/png';
      else if (lowerName.endsWith('.webp')) finalMimeType = 'image/webp';
      else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) finalMimeType = 'image/jpeg';
    }

    const extractedData = await GeminiOcrService.extractInvoiceData(
      imageBase64,
      finalMimeType,
      apiKey
    );

    return NextResponse.json({
      success: true,
      data: extractedData,
      isMock: false,
    });
  } catch (error: any) {
    console.error('Erro no OCR da Nota Fiscal/PDF:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erro inesperado ao processar documento com a IA do Gemini.',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { GeminiOcrService } from '@/lib/gemini/ocrService';
import { NativePdfParser } from '@/lib/pdf/pdfParser';

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

    // Detecta se é arquivo PDF
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
    const isPdf =
      mimeType === 'application/pdf' ||
      (fileName && fileName.toLowerCase().endsWith('.pdf')) ||
      imageBase64.startsWith('data:application/pdf');

    // =========================================================================
    // MOTOR 1: LEITURA NATIVA DE PDF (SEM NECESSIDADE DE IA EXTERNA OU API KEY)
    // Extrai o texto do PDF/DAV diretamente em milissegundos
    // =========================================================================
    if (isPdf) {
      try {
        const pdfModule: any = await import('pdf-parse');
        const pdfParse = typeof pdfModule === 'function' ? pdfModule : (pdfModule.default || pdfModule);
        const buffer = Buffer.from(cleanBase64, 'base64');
        const pdfData = await pdfParse(buffer);

        if (pdfData && pdfData.text && pdfData.text.trim().length > 10) {
          const nativeExtracted = NativePdfParser.parseDavText(pdfData.text);

          // Se encontrou itens no PDF ou dados relevantes, retorna com sucesso imediato!
          if (nativeExtracted.items && nativeExtracted.items.length > 0) {
            return NextResponse.json({
              success: true,
              data: nativeExtracted,
              source: 'native_pdf',
              message: `Documento PDF lido nativamente com sucesso (${nativeExtracted.items.length} itens extraídos).`,
            });
          }
        }
      } catch (pdfErr) {
        console.warn('Tentativa de leitura nativa de PDF falhou, tentando OCR via IA...', pdfErr);
      }
    }

    // =========================================================================
    // MOTOR 2: OCR COM IA (GOOGLE GEMINI VISION)
    // Usado para fotos, imagens escaneadas ou quando solicitado
    // =========================================================================
    const apiKey =
      customApiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    let finalMimeType = mimeType || (isPdf ? 'application/pdf' : 'image/jpeg');

    if (apiKey) {
      const extractedData = await GeminiOcrService.extractInvoiceData(
        imageBase64,
        finalMimeType,
        apiKey
      );

      return NextResponse.json({
        success: true,
        data: extractedData,
        source: 'gemini_vision',
        isMock: false,
      });
    }

    // Caso não haja chave da IA e o documento não tenha camada de texto nativa:
    return NextResponse.json(
      {
        success: false,
        error:
          'Para fotos e imagens escaneadas, configure a GEMINI_API_KEY na Vercel ou insira a chave nas Configurações. (Para PDFs digitais, a leitura nativa já é automática).',
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Erro no processamento do documento:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erro inesperado ao processar documento.',
      },
      { status: 500 }
    );
  }
}

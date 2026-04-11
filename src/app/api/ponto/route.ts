import { NextRequest, NextResponse } from 'next/server';
import pontoService from '@/services/pontoService';
import type { PontoRequestBody } from '@/types/ponto/ponto';
import ServiceError, {
  MissingParameterError,
  ValidationError
} from '@/errors/serviceErrors';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<PontoRequestBody>;
    const cardId = body.cardId;

    if (!cardId) {
      return NextResponse.json(
        {
          success: false,
          error: 'O campo "cardId" é obrigatório.'
        },
        { status: 400 }
      );
    }

    const result = await pontoService.registerCardRead(cardId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (
      error instanceof MissingParameterError ||
      error instanceof ValidationError ||
      error instanceof ServiceError
    ) {
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: 400 }
      );
    }

    console.error('Erro ao processar ponto:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno ao processar o ponto.'
      },
      { status: 500 }
    );
  }
}

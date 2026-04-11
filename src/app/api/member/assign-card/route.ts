import { NextRequest, NextResponse } from 'next/server';
import memberRepository from '@/repositories/memberRepository';
import {
  FirebaseError,
  MissingParameterError,
  ValidationError
} from '@/errors/repositoryErrors';

interface AssignCardRequest {
  memberId: string;
  cardId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<AssignCardRequest>;
    const { memberId, cardId } = body;

    if (!memberId || !cardId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Os campos "memberId" e "cardId" são obrigatórios.'
        },
        { status: 400 }
      );
    }

    const normalizedMemberId = memberId.trim();
    const normalizedCardId = cardId.trim();

    if (!normalizedMemberId || !normalizedCardId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Os campos não podem ser vazios.'
        },
        { status: 400 }
      );
    }

    const member = await memberRepository.getMemberById(normalizedMemberId);
    if (!member) {
      return NextResponse.json(
        {
          success: false,
          error: 'Membro não encontrado.'
        },
        { status: 404 }
      );
    }

    await memberRepository.updateMember(normalizedMemberId, {
      cardId: normalizedCardId
    });

    return NextResponse.json(
      {
        success: true,
        message: `Cartão (${normalizedCardId}) vinculado com sucesso ao membro ${member.name}.`,
        memberId: normalizedMemberId,
        cardId: normalizedCardId
      },
      { status: 200 }
    );
  } catch (error) {
    if (
      error instanceof FirebaseError ||
      error instanceof MissingParameterError ||
      error instanceof ValidationError
    ) {
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: 400 }
      );
    }

    console.error('Erro ao vincular cartão ao membro:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno ao vincular cartão.'
      },
      { status: 500 }
    );
  }
}

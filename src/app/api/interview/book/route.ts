import { NextRequest, NextResponse } from 'next/server';
import interviewService from '@/services/interviewService';

/**
 * POST /api/interview/book
 *
 * Reserva um par de slots de entrevista (2 entrevistadores) para um candidato.
 * Chamado a partir da página pública de seleção de entrevista.
 *
 * Body:
 *  - formId: string        — ID do formulário PSEL
 *  - slotIds: string[]     — IDs dos 2 slots a reservar (um por entrevistador)
 *  - candidateId: string   — ID do candidato
 *  - candidateName: string — Nome completo do candidato
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formId, slotIds, candidateId, candidateName } = body as {
      formId?: string;
      slotIds?: string[];
      candidateId?: string;
      candidateName?: string;
    };

    if (!formId?.trim()) {
      return NextResponse.json(
        { error: 'O campo "formId" é obrigatório.' },
        { status: 400 }
      );
    }

    if (!slotIds || slotIds.length < 2) {
      return NextResponse.json(
        {
          error:
            'O campo "slotIds" deve conter exatamente 2 IDs (um por entrevistador).'
        },
        { status: 400 }
      );
    }

    if (!candidateId?.trim()) {
      return NextResponse.json(
        { error: 'O campo "candidateId" é obrigatório.' },
        { status: 400 }
      );
    }

    if (!candidateName?.trim()) {
      return NextResponse.json(
        { error: 'O campo "candidateName" é obrigatório.' },
        { status: 400 }
      );
    }

    // Verificar se ambos os slots existem e estão disponíveis
    const slotA = await interviewService.getSlotById(formId, slotIds[0]);
    const slotB = await interviewService.getSlotById(formId, slotIds[1]);

    if (!slotA || !slotB) {
      return NextResponse.json(
        {
          error:
            'Um ou ambos os horários não foram encontrados. Por favor, escolha outro.'
        },
        { status: 404 }
      );
    }

    if (slotA.status !== 'available' || slotB.status !== 'available') {
      return NextResponse.json(
        {
          error:
            'Um ou ambos os horários já foram reservados. Por favor, escolha outro.'
        },
        { status: 409 }
      );
    }

    // Reservar o par de slots
    await interviewService.bookSlotPair(
      formId,
      slotIds[0],
      slotIds[1],
      candidateId,
      candidateName
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Horário reservado com sucesso!',
        slot: {
          slotIds: [slotA.id, slotB.id],
          dateLabel: slotA.dateLabel,
          startTime: slotA.startTime,
          endTime: slotA.endTime,
          interviewerNames: [
            slotA.responsibleMemberName,
            slotB.responsibleMemberName
          ]
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao reservar horário de entrevista:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro interno ao reservar horário de entrevista.'
      },
      { status: 500 }
    );
  }
}

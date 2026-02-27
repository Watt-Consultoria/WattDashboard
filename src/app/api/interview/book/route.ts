import { NextRequest, NextResponse } from 'next/server';
import interviewService from '@/services/interviewService';

/**
 * POST /api/interview/book
 *
 * Reserva um slot de entrevista para um candidato.
 * Chamado a partir da página pública de seleção de entrevista.
 *
 * Aceita `slotIds` (array de IDs reais) para suportar seleção aleatória
 * quando múltiplos membros disponibilizaram o mesmo horário.
 *
 * Body:
 *  - formId: string        — ID do formulário PSEL
 *  - slotIds: string[]     — IDs dos slots candidatos (mesmo horário, membros diferentes)
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

    if (!slotIds || slotIds.length === 0) {
      return NextResponse.json(
        { error: 'O campo "slotIds" é obrigatório.' },
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

    // Verificar quais slots existem e estão disponíveis
    const availableSlots = [];
    for (const slotId of slotIds) {
      const slot = await interviewService.getSlotById(formId, slotId);
      if (slot && slot.status === 'available') {
        availableSlots.push(slot);
      }
    }

    if (availableSlots.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum horário disponível. Por favor, escolha outro.' },
        { status: 409 }
      );
    }

    // Escolher aleatoriamente entre os slots disponíveis
    const chosenSlot =
      availableSlots[Math.floor(Math.random() * availableSlots.length)];

    // Reservar o slot escolhido
    await interviewService.bookSlot(
      formId,
      chosenSlot.id,
      candidateId,
      candidateName
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Horário reservado com sucesso!',
        slot: {
          id: chosenSlot.id,
          dateLabel: chosenSlot.dateLabel,
          startTime: chosenSlot.startTime,
          endTime: chosenSlot.endTime
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

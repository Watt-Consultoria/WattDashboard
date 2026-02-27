import { NextRequest, NextResponse } from 'next/server';
import interviewService from '@/services/interviewService';
import savedCandidateRepository from '@/repositories/savedCandidateRepository';

/**
 * GET /api/interview/available-slots?formId=...&candidateId=...
 *
 * Retorna os horários de entrevista disponíveis para o candidato escolher.
 * Se o candidato já tiver uma reserva, retorna um status indicando isso.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');
    const candidateId = searchParams.get('candidateId');

    if (!formId?.trim()) {
      return NextResponse.json(
        { error: 'O parâmetro "formId" é obrigatório.' },
        { status: 400 }
      );
    }

    if (!candidateId?.trim()) {
      return NextResponse.json(
        { error: 'O parâmetro "candidateId" é obrigatório.' },
        { status: 400 }
      );
    }

    // Verificar se o candidato já tem algum slot reservado neste formulário
    const allSlots = await interviewService.listSlots(formId);
    const bookedSlots = allSlots.filter(
      (slot) =>
        slot.status === 'booked' && slot.bookedByCandidateId === candidateId
    );

    if (bookedSlots.length > 0) {
      // Encontrar o par de entrevistadores (pode haver 2 slots booked para o mesmo candidato)
      const interviewerNames = bookedSlots.map((s) => s.responsibleMemberName);
      return NextResponse.json(
        {
          alreadyBooked: true,
          bookedSlot: {
            dateLabel: bookedSlots[0].dateLabel,
            startTime: bookedSlots[0].startTime,
            endTime: bookedSlots[0].endTime,
            interviewerNames
          }
        },
        { status: 409 }
      );
    }

    // Buscar nome do candidato
    let candidateName = '';
    try {
      const candidate =
        await savedCandidateRepository.getCandidateById(candidateId);
      if (candidate) {
        candidateName = `${candidate.nome} ${candidate.sobrenome}`.trim();
      }
    } catch {
      // Não é necessário bloquear se não encontrar o candidato
    }

    // Retornar horários disponíveis
    const availableSlots = await interviewService.getAvailableSlots(formId);

    return NextResponse.json(
      { slots: availableSlots, candidateName },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao buscar horários disponíveis:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro interno ao buscar horários disponíveis.'
      },
      { status: 500 }
    );
  }
}

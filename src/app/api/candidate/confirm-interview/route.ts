import { NextRequest, NextResponse } from 'next/server';
import interviewService from '@/services/interviewService';
import savedCandidateRepository from '@/repositories/savedCandidateRepository';
import emailService from '@/services/emailService';

const PSEL_SENDER = {
  email: 'psel@wattconsultoria.com.br',
  name: 'Processo Seletivo - Watt Consultoria'
};

/**
 * POST /api/candidate/confirm-interview
 *
 * Salva o link do Google Meet no slot de entrevista e envia um email de
 * confirmação ao candidato contendo os detalhes da entrevista e o link.
 *
 * Body:
 *  - formId: string         — ID do formulário PSEL
 *  - slotId: string         — ID do slot de entrevista (já reservado)
 *  - googleMeetLink: string — Link do Google Meet
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formId, slotId, googleMeetLink } = body as {
      formId?: string;
      slotId?: string;
      googleMeetLink?: string;
    };

    if (!formId?.trim()) {
      return NextResponse.json(
        { error: 'O campo "formId" é obrigatório.' },
        { status: 400 }
      );
    }

    if (!slotId?.trim()) {
      return NextResponse.json(
        { error: 'O campo "slotId" é obrigatório.' },
        { status: 400 }
      );
    }

    if (!googleMeetLink?.trim()) {
      return NextResponse.json(
        { error: 'O campo "googleMeetLink" é obrigatório.' },
        { status: 400 }
      );
    }

    // Buscar o slot
    const slot = await interviewService.getSlotById(formId, slotId);

    if (!slot) {
      return NextResponse.json(
        { error: 'Horário de entrevista não encontrado.' },
        { status: 404 }
      );
    }

    if (slot.status !== 'booked' || !slot.bookedByCandidateId) {
      return NextResponse.json(
        { error: 'Este horário não está reservado por nenhum candidato.' },
        { status: 422 }
      );
    }

    // Salvar o link do Google Meet
    await interviewService.setGoogleMeetLink(
      formId,
      slotId,
      googleMeetLink.trim()
    );

    // Buscar dados do candidato para enviar email
    const candidate = await savedCandidateRepository.getCandidateById(
      slot.bookedByCandidateId
    );

    if (!candidate || !candidate.email?.trim()) {
      return NextResponse.json(
        {
          error:
            'Candidato não encontrado ou sem email. O link foi salvo, mas o email não foi enviado.'
        },
        { status: 422 }
      );
    }

    const candidateName = `${candidate.nome} ${candidate.sobrenome}`.trim();

    const { subject, html, text } =
      interviewService.buildInterviewConfirmationEmailHtml(
        candidateName,
        slot.dateLabel,
        slot.startTime,
        slot.endTime,
        slot.responsibleMemberName,
        googleMeetLink.trim()
      );

    await emailService.sendEmail(
      { email: candidate.email.trim(), name: candidateName },
      subject,
      html,
      text,
      { from: PSEL_SENDER }
    );

    return NextResponse.json(
      {
        success: true,
        message: `Email de confirmação enviado para ${candidate.email}.`
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao confirmar entrevista:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro interno ao confirmar entrevista.'
      },
      { status: 500 }
    );
  }
}

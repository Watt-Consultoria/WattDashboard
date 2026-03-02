import { NextRequest, NextResponse } from 'next/server';
import interviewService from '@/services/interviewService';
import savedCandidateRepository from '@/repositories/savedCandidateRepository';
import emailService from '@/services/emailService';

const PSEL_SENDER = {
  email: 'psel@wattconsultoria.com.br',
  name: 'Processo Seletivo - Watt Consultoria'
};

function getBaseUrl(req: NextRequest): string {
  const headersList = req.headers;
  const host = headersList.get('host') ?? 'localhost:3000';
  const proto = headersList.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

/**
 * POST /api/candidate/send-interview-slots
 *
 * Envia por email os horários de entrevista disponíveis (não ocupados e
 * não vencidos) para um ou mais candidatos salvos.
 *
 * Body:
 *  - formId: string          — ID do formulário PSEL (para buscar os slots)
 *  - candidateIds: string[]  — IDs dos candidatos salvos que receberão o email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formId, candidateIds } = body as {
      formId?: string;
      candidateIds?: string[];
    };

    if (!formId?.trim()) {
      return NextResponse.json(
        { error: 'O campo "formId" é obrigatório.' },
        { status: 400 }
      );
    }

    if (!candidateIds || candidateIds.length === 0) {
      return NextResponse.json(
        { error: 'O campo "candidateIds" é obrigatório e não pode ser vazio.' },
        { status: 400 }
      );
    }

    // Buscar horários disponíveis e futuros
    // const availableSlots = await interviewService.getAvailableSlots(formId);

    // if (availableSlots.length === 0) {
    //   return NextResponse.json(
    //     {
    //       error:
    //         'Não há horários de entrevista disponíveis (não ocupados e futuros) para este formulário.'
    //     },
    //     { status: 422 }
    //   );
    // }

    // Buscar dados dos candidatos
    const candidates =
      await savedCandidateRepository.getCandidatesByIds(candidateIds);

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum candidato encontrado com os IDs fornecidos.' },
        { status: 404 }
      );
    }

    let sent = 0;
    const errors: string[] = [];

    for (const candidate of candidates) {
      if (!candidate.email?.trim()) {
        errors.push(
          `Candidato ${candidate.nome} ${candidate.sobrenome} não possui email.`
        );
        continue;
      }

      try {
        const candidateName = `${candidate.nome} ${candidate.sobrenome}`.trim();
        const selectionLink = `${getBaseUrl(request)}/entrevista/${formId}/${candidate.id}`;
        const { subject, html, text } =
          interviewService.buildInterviewSlotsEmailHtml(
            candidateName,
            // availableSlots,
            selectionLink
          );

        await emailService.sendEmail(
          { email: candidate.email.trim(), name: candidateName },
          subject,
          html,
          text,
          { from: PSEL_SENDER }
        );

        sent++;
      } catch (err: any) {
        errors.push(
          `Erro ao enviar para ${candidate.email}: ${err?.message ?? 'Erro desconhecido'}`
        );
      }
    }

    const total = candidates.length;
    const success = errors.length === 0;

    return NextResponse.json(
      { success, sent, total, errors: errors.length > 0 ? errors : undefined },
      { status: success ? 200 : 207 }
    );
  } catch (error) {
    console.error('Erro ao enviar horários de entrevista:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro interno ao enviar horários de entrevista.'
      },
      { status: 500 }
    );
  }
}

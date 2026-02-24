import { NextRequest, NextResponse } from 'next/server';
import candidateNotificationService from '@/services/candidateNotificationService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tag, candidateIds, subject, html, text } = body;

    if (!subject || !html || !text) {
      return NextResponse.json(
        {
          error:
            'Campos obrigatórios faltando. Envie: subject, html, text e (tag ou candidateIds).'
        },
        { status: 400 }
      );
    }

    if (!tag && (!candidateIds || candidateIds.length === 0)) {
      return NextResponse.json(
        {
          error:
            'Informe "tag" para notificar por tag ou "candidateIds" para notificar candidatos específicos.'
        },
        { status: 400 }
      );
    }

    const result = candidateIds?.length
      ? await candidateNotificationService.notifyCandidatesByIds(
          candidateIds,
          subject,
          html,
          text
        )
      : await candidateNotificationService.notifyCandidatesByTag(
          tag,
          subject,
          html,
          text
        );

    return NextResponse.json(result, {
      status: result.success ? 200 : 207
    });
  } catch (error) {
    console.error('Erro ao notificar candidatos:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro interno ao enviar notificações'
      },
      { status: 500 }
    );
  }
}

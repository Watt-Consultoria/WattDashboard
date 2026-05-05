import { Timestamp } from 'firebase/firestore';
import pontoRepository from '@/repositories/pontoRepository';
import { MissingParameterError, ValidationError } from '@/errors/serviceErrors';
import type { PontoOperationResult } from '@/types/ponto/ponto';
import { PONTO_MAX_SESSION_MINUTES } from '@/lib/ponto-sessions';

class PontoService {
  async registerCardRead(cardId: string): Promise<PontoOperationResult> {
    if (!cardId || !cardId.trim()) {
      throw new MissingParameterError(['cardId']);
    }

    const normalizedCardId = cardId.trim();
    const now = Timestamp.now();
    const member = await pontoRepository.getMemberByCardId(normalizedCardId);

    if (!member) {
      throw new ValidationError('Nenhum membro encontrado para este cardId.');
    }

    const openSession = await pontoRepository.getOpenSessionByMemberId(
      member.id
    );

    if (!openSession) {
      await pontoRepository.createOpenSession(
        member.id,
        member.name,
        normalizedCardId,
        now
      );

      return {
        success: true,
        action: 'started',
        message: 'Entrada registrada com sucesso.',
        label: 'Bem vindo ' + member.name.split(' ')[0] + '!',
        cardId: normalizedCardId,
        memberId: member.id
      };
    }

    const closedSession = await pontoRepository.closeSession(openSession, now);
    const totalTime = now.toMillis() - openSession.startedAt.toMillis();
    const isInvalid = closedSession.status === 'invalid';

    return {
      success: !isInvalid,
      action: 'finished',
      totalTime: isInvalid ? undefined : this.formatTime(totalTime),
      message: isInvalid
        ? 'Sessao invalidada por ultrapassar 12 horas.'
        : 'Ponto finalizado e sessao fechada.',
      cardId: normalizedCardId,
      memberId: member.id,
      label: isInvalid
        ? `Sessao invalidada por ultrapassar ${PONTO_MAX_SESSION_MINUTES / 60} horas.`
        : 'Ate logo ' + member.name.split(' ')[0] + '!'
    };
  }

  formatTime(ms: number): string {
    const totalSegundos = Math.floor(ms / 1000);

    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;

    return (
      `${String(horas).padStart(2, '0')}:` +
      `${String(minutos).padStart(2, '0')}:` +
      `${String(segundos).padStart(2, '0')}`
    );
  }
}

export default new PontoService();

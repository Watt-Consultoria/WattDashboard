import { Timestamp } from 'firebase/firestore';
import pontoRepository from '@/repositories/pontoRepository';
import { MissingParameterError, ValidationError } from '@/errors/serviceErrors';
import type { TimeRecord } from '@/types/member/member';
import type { PontoOperationResult } from '@/types/ponto/ponto';

class PontoService {
  async registerCardRead(cardId: string): Promise<PontoOperationResult> {
    if (!cardId || !cardId.trim()) {
      throw new MissingParameterError(['cardId']);
    }

    const normalizedCardId = cardId.trim();
    const now = Timestamp.now();
    const cacheEntry =
      await pontoRepository.getCacheEntryByCardId(normalizedCardId);

    if (!cacheEntry) {
      await pontoRepository.createCacheEntry(normalizedCardId, now);

      const member = await pontoRepository.getMemberByCardId(normalizedCardId);

      return {
        success: true,
        action: 'started',
        message: 'Entrada registrada com sucesso.',
        label:
          'Bem vindo ' +
          (member ? member.name.split(' ')[0] : 'colaborador') +
          '!',
        cardId: normalizedCardId,
        memberId: member?.id
      };
    }

    const totalTime = now.toMillis() - cacheEntry.startTime.toMillis();
    const member = await pontoRepository.getMemberByCardId(normalizedCardId);
    if (!member) {
      throw new ValidationError('Nenhum membro encontrado para este cardId.');
    }

    if (totalTime > 12 * 60 * 60 * 1000) {
      await pontoRepository.deleteCacheEntry(normalizedCardId);

      return {
        success: false,
        action: 'finished',
        label: 'Registro inválido você excedeu o tempo máximo',
        message: 'Tempo máximo de trabalho excedido.',
        cardId: normalizedCardId,
        memberId: member?.id
      };
    }

    const saidaRecord: TimeRecord = {
      id: Date.now().toString(),
      timestamp: now,
      type: 'Saída'
    };

    const entradaRecord: TimeRecord = {
      id: (Date.now() + 1).toString(),
      timestamp: cacheEntry.startTime,
      type: 'Entrada'
    };

    await pontoRepository.appendMemberTimeRecords(member.id, [
      entradaRecord,
      saidaRecord
    ]);

    await pontoRepository.deleteCacheEntry(normalizedCardId);

    return {
      success: true,
      action: 'finished',
      totalTime: this.formatTime(totalTime),
      message: 'Ponto finalizado e registros adicionados ao membro.',
      cardId: normalizedCardId,
      memberId: member.id,
      label:
        'Até logo ' + (member ? member.name.split(' ')[0] : 'colaborador') + '!'
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

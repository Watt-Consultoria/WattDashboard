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

      return {
        success: true,
        action: 'started',
        message: 'Ponto iniciado no cache com sucesso.',
        cardId: normalizedCardId
      };
    }

    const totalTime = now.toMillis() - cacheEntry.startTime.toMillis();

    if (totalTime > 12 * 60 * 60 * 1000) {
      await pontoRepository.deleteCacheEntry(normalizedCardId);

      return {
        success: false,
        action: 'finished',
        message: 'Tempo máximo de trabalho excedido.',
        cardId: normalizedCardId
      };
    }

    const member = await pontoRepository.getMemberByCardId(normalizedCardId);
    if (!member) {
      throw new ValidationError('Nenhum membro encontrado para este cardId.');
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
      saidaRecord,
      entradaRecord
    ]);

    await pontoRepository.deleteCacheEntry(normalizedCardId);

    return {
      success: true,
      action: 'finished',
      totalTime: this.formatTime(totalTime),
      message: 'Ponto finalizado e registros adicionados ao membro.',
      cardId: normalizedCardId,
      memberId: member.id
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

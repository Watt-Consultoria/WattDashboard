import type { Timestamp } from 'firebase/firestore';

export type PontoRecordType = 'Entrada' | 'Saída';

export type PontoCacheEntry = {
  cardId: string;
  startTime: Timestamp;
  endTime?: Timestamp;
};

export type PontoOperationResult = {
  success: boolean;
  action: 'started' | 'finished';
  totalTime?: string;
  message: string;
  cardId: string;
  memberId?: string;
};

export type PontoRequestBody = {
  cardId: string;
};

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
  label: string;
  message: string;
  cardId: string;
  totalTime?: string;
  memberId?: string;
};

export type PontoRequestBody = {
  cardId: string;
};

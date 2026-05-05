import type { Timestamp } from 'firebase/firestore';

export type PontoRecordType = 'Entrada' | 'Saida';

export type PontoSessionStatus = 'open' | 'closed' | 'invalid';

export type PontoSessionInvalidReason =
  | 'missing_exit'
  | 'exceeded_12h'
  | 'manual_cancelled';

export type PontoSession = {
  id: string;
  memberId: string;
  memberName: string;
  cardId?: string;
  startedAt: Timestamp;
  endedAt: Timestamp | null;
  durationMinutes: number;
  status: PontoSessionStatus;
  invalidReason?: PontoSessionInvalidReason;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

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

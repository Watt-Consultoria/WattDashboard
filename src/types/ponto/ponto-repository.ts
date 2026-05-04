import type { Timestamp } from 'firebase/firestore';
import type { Member, TimeRecord } from '@/types/member/member';
import type { PontoCacheEntry, PontoSession } from './ponto';

export default interface IPontoRepository {
  getCacheEntryByCardId(cardId: string): Promise<PontoCacheEntry | null>;
  createCacheEntry(cardId: string, startTime: Timestamp): Promise<void>;
  deleteCacheEntry(cardId: string): Promise<void>;
  getMemberByCardId(cardId: string): Promise<Member | null>;
  getOpenSessionByCardId(cardId: string): Promise<PontoSession | null>;
  getOpenSessionByMemberId(memberId: string): Promise<PontoSession | null>;
  createOpenSession(
    memberId: string,
    memberName: string,
    cardId: string,
    startedAt: Timestamp
  ): Promise<PontoSession>;
  closeSession(session: PontoSession, endedAt: Timestamp): Promise<PontoSession>;
  appendMemberTimeRecords(
    memberId: string,
    records: TimeRecord[]
  ): Promise<void>;
}

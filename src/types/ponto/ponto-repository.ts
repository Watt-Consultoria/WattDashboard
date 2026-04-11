import type { Timestamp } from 'firebase/firestore';
import type { Member, TimeRecord } from '@/types/member/member';
import type { PontoCacheEntry } from './ponto';

export default interface IPontoRepository {
  getCacheEntryByCardId(cardId: string): Promise<PontoCacheEntry | null>;
  createCacheEntry(cardId: string, startTime: Timestamp): Promise<void>;
  deleteCacheEntry(cardId: string): Promise<void>;
  getMemberByCardId(cardId: string): Promise<Member | null>;
  appendMemberTimeRecords(
    memberId: string,
    records: TimeRecord[]
  ): Promise<void>;
}

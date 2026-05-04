import {
	Timestamp,
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	limit,
	query,
	setDoc,
	updateDoc,
	where
} from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebase/client';
import {
	FirebaseError,
	MissingParameterError,
	ValidationError
} from '@/errors/repositoryErrors';
import type { Member, TimeRecord } from '@/types/member/member';
import type IPontoRepository from '@/types/ponto/ponto-repository';
import type { PontoCacheEntry, PontoSession } from '@/types/ponto/ponto';
import { PONTO_MAX_SESSION_MINUTES } from '@/lib/ponto-sessions';

class PontoRepository implements IPontoRepository {
	async getCacheEntryByCardId(cardId: string): Promise<PontoCacheEntry | null> {
		if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
		if (!cardId) throw new MissingParameterError(['cardId']);

		const cacheRef = doc(firebaseDb, 'pontoCache', cardId);
		const cacheSnap = await getDoc(cacheRef);

		if (!cacheSnap.exists()) {
			return null;
		}

		const data = cacheSnap.data();
		return {
			cardId: data.cardId ?? cardId,
			startTime: data.startTime ?? Timestamp.now(),
			endTime: data.endTime ?? undefined
		};
	}

	async createCacheEntry(cardId: string, startTime: Timestamp): Promise<void> {
		if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
		if (!cardId || !startTime)
			throw new MissingParameterError(['cardId', 'startTime']);

		const cacheRef = doc(firebaseDb, 'pontoCache', cardId);
		await setDoc(cacheRef, {
			cardId,
			startTime
		});
	}

	async updateCacheEndTime(cardId: string, endTime: Timestamp): Promise<void> {
		if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
		if (!cardId || !endTime)
			throw new MissingParameterError(['cardId', 'endTime']);

		const cacheRef = doc(firebaseDb, 'pontoCache', cardId);
		await updateDoc(cacheRef, { endTime });
	}

	async deleteCacheEntry(cardId: string): Promise<void> {
		if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
		if (!cardId) throw new MissingParameterError(['cardId']);

		const cacheRef = doc(firebaseDb, 'pontoCache', cardId);
		await deleteDoc(cacheRef);
	}

	async getMemberByCardId(cardId: string): Promise<Member | null> {
		if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
		if (!cardId) throw new MissingParameterError(['cardId']);

		const membersRef = collection(firebaseDb, 'members');
		const q = query(membersRef, where('cardId', '==', cardId), limit(1));
		const membersSnap = await getDocs(q);

		if (membersSnap.empty) {
			return null;
		}

		const memberDoc = membersSnap.docs[0];
		const memberData = memberDoc.data();

		return {
			id: memberDoc.id,
			cardId: memberData.cardId ?? undefined,
			cpf: memberData.cpf ?? '',
			createdAt: memberData.createdAt ?? Timestamp.now(),
			email: memberData.email ?? '',
			name: memberData.name ?? '',
			role: memberData.role ?? 'Consultor',
			sector: memberData.sector ?? 'Automação',
			status: memberData.status ?? 'Ativo',
			timeRecords: memberData.timeRecords ?? [],
			updatedAt: memberData.updatedAt ?? Timestamp.now(),
			alerts: memberData.alerts ?? [],
			agendaTasks: memberData.agendaTasks ?? [],
			weekSchedule: memberData.weekSchedule ?? undefined,
			tags: Array.isArray(memberData.tags) ? memberData.tags : []
		};
	}

	async getOpenSessionByCardId(cardId: string): Promise<PontoSession | null> {
		if (!firebaseDb) throw new FirebaseError('Firebase nÃƒÂ£o estÃƒÂ¡ configurado');
		if (!cardId) throw new MissingParameterError(['cardId']);

		const sessionsRef = collection(firebaseDb, 'pontoSessions');
		const q = query(
			sessionsRef,
			where('cardId', '==', cardId),
			where('endedAt', '==', null),
			limit(1)
		);
		const sessionsSnap = await getDocs(q);

		if (sessionsSnap.empty) {
			return null;
		}

		const sessionDoc = sessionsSnap.docs[0];
		return {
			id: sessionDoc.id,
			...sessionDoc.data()
		} as PontoSession;
	}

	async getOpenSessionByMemberId(
		memberId: string
	): Promise<PontoSession | null> {
		if (!firebaseDb) throw new FirebaseError('Firebase nÃƒÆ’Ã‚Â£o estÃƒÆ’Ã‚Â¡ configurado');
		if (!memberId) throw new MissingParameterError(['memberId']);

		const sessionsRef = collection(firebaseDb, 'pontoSessions');
		const q = query(
			sessionsRef,
			where('memberId', '==', memberId),
			where('endedAt', '==', null),
			limit(1)
		);
		const sessionsSnap = await getDocs(q);

		if (sessionsSnap.empty) {
			return null;
		}

		const sessionDoc = sessionsSnap.docs[0];
		return {
			id: sessionDoc.id,
			...sessionDoc.data()
		} as PontoSession;
	}

	async createOpenSession(
		memberId: string,
		memberName: string,
		cardId: string,
		startedAt: Timestamp
	): Promise<PontoSession> {
		if (!firebaseDb) throw new FirebaseError('Firebase nÃƒÂ£o estÃƒÂ¡ configurado');
		if (!memberId || !memberName || !cardId || !startedAt)
			throw new MissingParameterError([
				'memberId',
				'memberName',
				'cardId',
				'startedAt'
			]);

		const sessionRef = doc(collection(firebaseDb, 'pontoSessions'));
		const now = Timestamp.now();
		const session: PontoSession = {
			id: sessionRef.id,
			memberId,
			memberName,
			cardId,
			startedAt,
			endedAt: null,
			durationMinutes: 0,
			status: 'invalid',
			invalidReason: 'missing_exit',
			createdAt: now,
			updatedAt: now
		};

		await setDoc(sessionRef, session);
		return session;
	}

	async closeSession(
		session: PontoSession,
		endedAt: Timestamp
	): Promise<PontoSession> {
		if (!firebaseDb) throw new FirebaseError('Firebase nÃƒÂ£o estÃƒÂ¡ configurado');
		if (!session?.id || !endedAt)
			throw new MissingParameterError(['session', 'endedAt']);

		const durationMinutes = Math.max(
			0,
			Math.floor((endedAt.toMillis() - session.startedAt.toMillis()) / 60000)
		);
		const isInvalid = durationMinutes > PONTO_MAX_SESSION_MINUTES;
		const nextSession: PontoSession = {
			...session,
			endedAt,
			durationMinutes: isInvalid ? 0 : durationMinutes,
			status: isInvalid ? 'invalid' : 'closed',
			invalidReason: isInvalid ? 'exceeded_12h' : undefined,
			updatedAt: Timestamp.now()
		};

		await updateDoc(doc(firebaseDb, 'pontoSessions', session.id), {
			endedAt: nextSession.endedAt,
			durationMinutes: nextSession.durationMinutes,
			status: nextSession.status,
			invalidReason: nextSession.invalidReason ?? null,
			updatedAt: nextSession.updatedAt
		});

		return nextSession;
	}

	async appendMemberTimeRecords(
		memberId: string,
		records: TimeRecord[]
	): Promise<void> {
		if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
		if (!memberId || !records)
			throw new MissingParameterError(['memberId', 'records']);
		if (records.length === 0)
			throw new ValidationError('records precisa conter ao menos um item');

		const memberRef = doc(firebaseDb, 'members', memberId);
		const memberSnap = await getDoc(memberRef);

		if (!memberSnap.exists()) {
			throw new ValidationError('Membro não encontrado');
		}

		const memberData = memberSnap.data();
		const currentRecords = Array.isArray(memberData.timeRecords)
			? memberData.timeRecords
			: [];

		await updateDoc(memberRef, {
			timeRecords: [...currentRecords, ...records],
			updatedAt: Timestamp.now()
		});
	}
}

export default new PontoRepository();

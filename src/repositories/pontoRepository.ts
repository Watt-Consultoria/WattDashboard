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
import type { PontoCacheEntry } from '@/types/ponto/ponto';

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

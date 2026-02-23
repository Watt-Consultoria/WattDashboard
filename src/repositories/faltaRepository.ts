import type { Falta, CreateFaltaRequest } from '@/types/member/falta';
import {
  doc,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  Timestamp,
  deleteDoc,
  collectionGroup
} from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebase/client';
import {
  FirebaseError,
  MissingParameterError,
  ValidationError
} from '@/errors/repositoryErrors';

class FaltaRepository {
  private collectionPath = 'members';

  async getFaltasByMemberId(memberId: string): Promise<Falta[]> {
    if (!firebaseDb) {
      throw new FirebaseError('Firebase não está configurado');
    }

    if (!memberId) {
      throw new MissingParameterError(['memberId']);
    }

    const faltasRef = collection(
      firebaseDb,
      `${this.collectionPath}/${memberId}/faltas`
    );
    const faltasSnap = await getDocs(faltasRef);

    return faltasSnap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        memberId,
        ruleCode: data.ruleCode,
        description: data.description ?? '',
        dateAdded: data.dateAdded ?? Timestamp.now(),
        expiresAt: data.expiresAt ?? Timestamp.now(),
        addedBy: data.addedBy ?? '',
        status: data.status ?? 'ativa',
        createdAt: data.createdAt ?? Timestamp.now(),
        updatedAt: data.updatedAt ?? Timestamp.now()
      } as Falta;
    });
  }

  async getFaltaById(memberId: string, faltaId: string): Promise<Falta | null> {
    if (!firebaseDb) {
      throw new FirebaseError('Firebase não está configurado');
    }

    if (!memberId || !faltaId) {
      throw new MissingParameterError(['memberId', 'faltaId']);
    }

    const faltaRef = doc(
      firebaseDb,
      `${this.collectionPath}/${memberId}/faltas/${faltaId}`
    );
    const faltaSnap = await getDocs(
      collection(firebaseDb, `${this.collectionPath}/${memberId}/faltas`)
    );

    const faltaDoc = faltaSnap.docs.find((doc) => doc.id === faltaId);
    if (!faltaDoc) {
      return null;
    }

    const data = faltaDoc.data();
    return {
      id: faltaDoc.id,
      memberId,
      ruleCode: data.ruleCode,
      description: data.description ?? '',
      dateAdded: data.dateAdded ?? Timestamp.now(),
      expiresAt: data.expiresAt ?? Timestamp.now(),
      addedBy: data.addedBy ?? '',
      status: data.status ?? 'ativa',
      createdAt: data.createdAt ?? Timestamp.now(),
      updatedAt: data.updatedAt ?? Timestamp.now()
    } as Falta;
  }

  async createFalta(
    memberId: string,
    falta: CreateFaltaRequest,
    addedBy: string
  ): Promise<Falta> {
    if (!firebaseDb) {
      throw new FirebaseError('Firebase não está configurado');
    }

    if (!memberId || !falta || !addedBy) {
      throw new MissingParameterError(['memberId', 'falta', 'addedBy']);
    }

    const now = Timestamp.now();
    const oneYearLater = new Date(now.toDate());
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    const faltaId = doc(
      collection(firebaseDb, `${this.collectionPath}/${memberId}/faltas`)
    ).id;

    const newFalta: Falta = {
      id: faltaId,
      memberId,
      ruleCode: falta.ruleCode,
      description: falta.description,
      dateAdded: now,
      expiresAt: Timestamp.fromDate(oneYearLater),
      addedBy,
      status: 'ativa',
      createdAt: now,
      updatedAt: now
    };

    const faltaRef = doc(
      firebaseDb,
      `${this.collectionPath}/${memberId}/faltas/${faltaId}`
    );

    await setDoc(faltaRef, newFalta);
    return newFalta;
  }

  async updateFalta(
    memberId: string,
    faltaId: string,
    updates: Partial<Omit<Falta, 'id' | 'memberId' | 'createdAt'>>
  ): Promise<void> {
    if (!firebaseDb) {
      throw new FirebaseError('Firebase não está configurado');
    }

    if (!memberId || !faltaId) {
      throw new MissingParameterError(['memberId', 'faltaId']);
    }

    const faltaRef = doc(
      firebaseDb,
      `${this.collectionPath}/${memberId}/faltas/${faltaId}`
    );

    await updateDoc(faltaRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  }

  async deleteFalta(memberId: string, faltaId: string): Promise<void> {
    if (!firebaseDb) {
      throw new FirebaseError('Firebase não está configurado');
    }

    if (!memberId || !faltaId) {
      throw new MissingParameterError(['memberId', 'faltaId']);
    }

    const faltaRef = doc(
      firebaseDb,
      `${this.collectionPath}/${memberId}/faltas/${faltaId}`
    );

    await deleteDoc(faltaRef);
  }

  async getActiveFaltasByMemberId(memberId: string): Promise<Falta[]> {
    const faltas = await this.getFaltasByMemberId(memberId);
    const now = Timestamp.now();

    return faltas.filter((falta) => {
      if (falta.status !== 'ativa') {
        return false;
      }

      // Verifica se expirou
      if (falta.expiresAt.toMillis() < now.toMillis()) {
        return false;
      }

      return true;
    });
  }

  async getAllFaltas(): Promise<Falta[]> {
    if (!firebaseDb) {
      throw new FirebaseError('Firebase não está configurado');
    }

    const q = query(collectionGroup(firebaseDb, 'faltas'));

    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        memberId: data.memberId,
        ruleCode: data.ruleCode,
        description: data.description ?? '',
        dateAdded: data.dateAdded ?? Timestamp.now(),
        expiresAt: data.expiresAt ?? Timestamp.now(),
        addedBy: data.addedBy ?? '',
        status: data.status ?? 'ativa',
        createdAt: data.createdAt ?? Timestamp.now(),
        updatedAt: data.updatedAt ?? Timestamp.now()
      } satisfies Falta;
    });
  }
}

export default new FaltaRepository();

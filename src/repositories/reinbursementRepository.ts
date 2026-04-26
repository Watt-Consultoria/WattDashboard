import {
  addDoc,
  collection,
  type DocumentData,
  doc,
  getDocs,
  query,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { firebaseDb, firebaseStorage } from '@/lib/firebase/client';
import {
  FirebaseError,
  MissingParameterError
} from '@/errors/repositoryErrors';
import type {
  CreateReinbursementInput,
  Reinbursement,
  ReinbursementQuery,
  ReinbursementStatus,
  ReinbursementReceipt
} from '@/types/reinbursement/reinbursement';
import type IReinbursementRepository from '@/types/reinbursement/reinbursement-repository';

const getReceiptsFromDocument = (
  data: DocumentData
): ReinbursementReceipt[] => {
  if (Array.isArray(data.receipts)) {
    return data.receipts as ReinbursementReceipt[];
  }

  if (data.receipt) {
    return [data.receipt as ReinbursementReceipt];
  }

  return [];
};

const mapReinbursement = (
  docSnap: QueryDocumentSnapshot<DocumentData>
): Reinbursement => {
  const data = docSnap.data();
  const receipts = getReceiptsFromDocument(data);
  return {
    id: docSnap.id,
    memberId: data.memberId ?? '',
    memberName: data.memberName ?? '',
    memberEmail: data.memberEmail ?? '',
    title: data.title ?? '',
    description: data.description ?? '',
    category: data.category ?? 'Outros',
    amountCents: data.amountCents ?? 0,
    pixKey: data.pixKey ?? '',
    receipts,
    status: data.status ?? 'Pendente',
    createdAt: data.createdAt ?? Timestamp.now(),
    updatedAt: data.updatedAt ?? Timestamp.now()
  } satisfies Reinbursement;
};

class ReinbursementRepository implements IReinbursementRepository {
  async createReinbursement(
    reinbursement: CreateReinbursementInput
  ): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!reinbursement) throw new MissingParameterError(['reinbursement']);

    const reinbursementsRef = collection(firebaseDb, 'reinbursements');
    await addDoc(reinbursementsRef, {
      ...reinbursement,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }

  async uploadReceipts(
    memberId: string,
    files: File[]
  ): Promise<ReinbursementReceipt[]> {
    const storage = firebaseStorage;
    if (!storage)
      throw new FirebaseError('Firebase Storage não está configurado');
    if (!memberId || !files?.length)
      throw new MissingParameterError(['memberId', 'files']);

    const uploadTasks = files.map(async (file, index) => {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `reinbursements/${memberId}/${Date.now()}-${index}-${sanitizedName}`;
      const fileRef = ref(storage, path);

      await uploadBytes(fileRef, file, {
        contentType: file.type || 'application/octet-stream'
      });

      const url = await getDownloadURL(fileRef);

      return {
        url,
        path,
        name: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size
      } satisfies ReinbursementReceipt;
    });

    return await Promise.all(uploadTasks);
  }

  async getMemberReinbursements(memberId: string): Promise<Reinbursement[]> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!memberId) throw new MissingParameterError(['memberId']);

    const q = query(
      collection(firebaseDb, 'reinbursements'),
      where('memberId', '==', memberId)
    );

    const snap = await getDocs(q);
    return snap.docs.map(mapReinbursement);
  }

  async getReinbursements(
    filters?: ReinbursementQuery
  ): Promise<Reinbursement[]> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');

    const constraints: QueryConstraint[] = [];

    if (filters?.memberId) {
      constraints.push(where('memberId', '==', filters.memberId));
    }

    if (filters?.category) {
      constraints.push(where('category', '==', filters.category));
    }

    if (filters?.status) {
      constraints.push(where('status', '==', filters.status));
    }

    if (filters?.startDate) {
      constraints.push(where('createdAt', '>=', filters.startDate));
    }

    if (filters?.endDate) {
      constraints.push(where('createdAt', '<=', filters.endDate));
    }

    const reinbursementsRef = collection(firebaseDb, 'reinbursements');
    const q = constraints.length
      ? query(reinbursementsRef, ...constraints)
      : query(reinbursementsRef);

    const snap = await getDocs(q);
    return snap.docs.map(mapReinbursement);
  }

  async updateReinbursementStatus(
    id: string,
    status: ReinbursementStatus
  ): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!id || !status) throw new MissingParameterError(['id', 'status']);

    const reinbursementRef = doc(firebaseDb, 'reinbursements', id);
    await updateDoc(reinbursementRef, {
      status,
      updatedAt: serverTimestamp()
    });
  }
}

const reinbursementRepository = new ReinbursementRepository();
export default reinbursementRepository;

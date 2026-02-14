import {
  addDoc,
  collection,
  getDocs,
  query,
  Timestamp,
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
  ReinbursementReceipt
} from '@/types/reinbursement/reinbursement';
import type IReinbursementRepository from '@/types/reinbursement/reinbursement-repository';

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

  async uploadReceipt(
    memberId: string,
    file: File
  ): Promise<ReinbursementReceipt> {
    if (!firebaseStorage)
      throw new FirebaseError('Firebase Storage não está configurado');
    if (!memberId || !file)
      throw new MissingParameterError(['memberId', 'file']);

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `reinbursements/${memberId}/${Date.now()}-${sanitizedName}`;
    const fileRef = ref(firebaseStorage, path);

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
    };
  }

  async getMemberReinbursements(memberId: string): Promise<Reinbursement[]> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!memberId) throw new MissingParameterError(['memberId']);

    const q = query(
      collection(firebaseDb, 'reinbursements'),
      where('memberId', '==', memberId)
    );

    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        memberId: data.memberId ?? '',
        memberName: data.memberName ?? '',
        memberEmail: data.memberEmail ?? '',
        description: data.description ?? '',
        category: data.category ?? 'Outros',
        amountCents: data.amountCents ?? 0,
        pixKey: data.pixKey ?? '',
        receipt: data.receipt,
        status: data.status ?? 'Pendente',
        createdAt: data.createdAt ?? Timestamp.now(),
        updatedAt: data.updatedAt ?? Timestamp.now()
      } satisfies Reinbursement;
    });
  }
}

const reinbursementRepository = new ReinbursementRepository();
export default reinbursementRepository;

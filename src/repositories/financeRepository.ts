import {
  addDoc,
  collection,
  type DocumentSnapshot,
  type DocumentData,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebase/client';
import {
  FirebaseError,
  MissingParameterError
} from '@/errors/repositoryErrors';
import type {
  CreateFinanceTransactionDTO,
  FinanceTransaction,
  FinanceTransactionFilters,
  UpdateFinanceTransactionDTO
} from '@/types/finance';

const FINANCE_COLLECTION = 'financeTransactions';

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (value && typeof value === 'object' && 'toDate' in value) {
    const timestampLike = value as { toDate: () => Date };
    return timestampLike.toDate();
  }
  return undefined;
};

const cleanOptionalFields = <T extends object>(data: T) => {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
};

const mapFinanceTransaction = (
  docSnap:
    | QueryDocumentSnapshot<DocumentData>
    | DocumentSnapshot<DocumentData>
): FinanceTransaction => {
  const data = docSnap.data() ?? {};

  return {
    id: docSnap.id,
    type: data.type ?? 'expense',
    status: data.status ?? 'pending',
    title: data.title ?? '',
    description: data.description,
    amountCents: data.amountCents ?? 0,
    category: data.category ?? 'other',
    paymentMethod: data.paymentMethod,
    date: data.date ?? '',
    competenceMonth: data.competenceMonth ?? '',
    projectId: data.projectId,
    clientId: data.clientId,
    receiptUrl: data.receiptUrl,
    createdBy: data.createdBy ?? '',
    createdAt: toDate(data.createdAt) ?? new Date(0),
    updatedBy: data.updatedBy,
    updatedAt: toDate(data.updatedAt),
    canceledBy: data.canceledBy,
    canceledAt: toDate(data.canceledAt),
    cancelReason: data.cancelReason
  };
};

const buildFinanceQueryConstraints = (
  filters?: FinanceTransactionFilters
): QueryConstraint[] => {
  const constraints: QueryConstraint[] = [];

  if (filters?.competenceMonth) {
    constraints.push(where('competenceMonth', '==', filters.competenceMonth));
  }

  if (filters?.type) {
    constraints.push(where('type', '==', filters.type));
  }

  if (filters?.category) {
    constraints.push(where('category', '==', filters.category));
  }

  if (filters?.status) {
    constraints.push(where('status', '==', filters.status));
  }

  constraints.push(orderBy('date', 'desc'), orderBy('createdAt', 'desc'));

  return constraints;
};

export async function createFinanceTransaction(
  data: CreateFinanceTransactionDTO & { createdBy: string }
): Promise<string> {
  if (!firebaseDb) throw new FirebaseError('Firebase nao esta configurado');
  if (!data) throw new MissingParameterError(['data']);

  const docRef = await addDoc(collection(firebaseDb, FINANCE_COLLECTION), {
    ...cleanOptionalFields(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id;
}

export async function updateFinanceTransaction(
  id: string,
  data: UpdateFinanceTransactionDTO & { updatedBy: string }
): Promise<void> {
  if (!firebaseDb) throw new FirebaseError('Firebase nao esta configurado');
  if (!id || !data) throw new MissingParameterError(['id', 'data']);

  await updateDoc(doc(firebaseDb, FINANCE_COLLECTION, id), {
    ...cleanOptionalFields(data),
    updatedAt: serverTimestamp()
  });
}

export async function cancelFinanceTransaction(
  id: string,
  reason: string,
  userId: string
): Promise<void> {
  if (!firebaseDb) throw new FirebaseError('Firebase nao esta configurado');
  if (!id || !userId) throw new MissingParameterError(['id', 'userId']);

  await updateDoc(doc(firebaseDb, FINANCE_COLLECTION, id), {
    status: 'canceled',
    canceledBy: userId,
    canceledAt: serverTimestamp(),
    cancelReason: reason,
    updatedBy: userId,
    updatedAt: serverTimestamp()
  });
}

export async function getFinanceTransactionById(
  id: string
): Promise<FinanceTransaction | null> {
  if (!firebaseDb) throw new FirebaseError('Firebase nao esta configurado');
  if (!id) throw new MissingParameterError(['id']);

  const docSnap = await getDoc(doc(firebaseDb, FINANCE_COLLECTION, id));
  if (!docSnap.exists()) return null;

  return mapFinanceTransaction(docSnap);
}

export async function listFinanceTransactions(
  filters?: FinanceTransactionFilters
): Promise<FinanceTransaction[]> {
  if (!firebaseDb) throw new FirebaseError('Firebase nao esta configurado');

  const financeQuery = query(
    collection(firebaseDb, FINANCE_COLLECTION),
    ...buildFinanceQueryConstraints(filters)
  );

  const snapshot = await getDocs(financeQuery);
  return snapshot.docs.map(mapFinanceTransaction);
}

export async function listFinanceTransactionsByMonth(
  competenceMonth: string
): Promise<FinanceTransaction[]> {
  if (!competenceMonth) throw new MissingParameterError(['competenceMonth']);
  return listFinanceTransactions({ competenceMonth });
}

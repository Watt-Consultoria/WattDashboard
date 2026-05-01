import {
  addDoc,
  collection,
  type DocumentData,
  doc,
  getDocs,
  orderBy,
  query,
  type QueryDocumentSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebase/client';
import {
  FirebaseError,
  MissingParameterError
} from '@/errors/repositoryErrors';
import type {
  CreateFeedbackInput,
  Feedback,
  FeedbackStatus
} from '@/types/feedback/feedback';
import { FEEDBACK_STATUSES } from '@/types/feedback/feedback';
import type IFeedbackRepository from '@/types/feedback/feedback-repository';

const normalizeFeedbackStatus = (status?: string): FeedbackStatus => {
  return FEEDBACK_STATUSES.includes(status as FeedbackStatus)
    ? (status as FeedbackStatus)
    : 'Aberta';
};

const mapFeedback = (
  docSnap: QueryDocumentSnapshot<DocumentData>
): Feedback => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    type: data.type ?? 'Sugestão de melhoria',
    title: data.title ?? '',
    detail: data.detail ?? '',
    status: normalizeFeedbackStatus(data.status),
    member: {
      id: data.member?.id ?? data.memberId ?? '',
      name: data.member?.name ?? data.memberName ?? ''
    },
    createdAt: data.createdAt ?? Timestamp.now(),
    updatedAt: data.updatedAt ?? Timestamp.now()
  };
};

class FeedbackRepository implements IFeedbackRepository {
  async createFeedback(feedback: CreateFeedbackInput): Promise<string> {
    if (!firebaseDb) throw new FirebaseError('Firebase nao esta configurado');
    if (!feedback) throw new MissingParameterError(['feedback']);

    const feedbackRef = await addDoc(collection(firebaseDb, 'feedbacks'), {
      type: feedback.type,
      title: feedback.title,
      detail: feedback.detail,
      member: feedback.member,
      status: 'Aberta',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return feedbackRef.id;
  }

  async getFeedbacks(): Promise<Feedback[]> {
    if (!firebaseDb) throw new FirebaseError('Firebase nao esta configurado');

    const feedbacksQuery = query(
      collection(firebaseDb, 'feedbacks'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(feedbacksQuery);
    return snapshot.docs.map(mapFeedback);
  }

  async updateFeedbackStatus(
    id: string,
    status: FeedbackStatus
  ): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase nao esta configurado');
    if (!id || !status) throw new MissingParameterError(['id', 'status']);

    await updateDoc(doc(firebaseDb, 'feedbacks', id), {
      status,
      updatedAt: serverTimestamp()
    });
  }
}

export default new FeedbackRepository();

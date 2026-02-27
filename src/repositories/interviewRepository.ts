import type IInterviewRepository from '@/types/interview/interview-repository';
import type {
  InterviewSlot,
  CreateInterviewSlotInput
} from '@/types/interview/interview';
import { firebaseDb } from '@/lib/firebase/client';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import {
  FirebaseError,
  MissingParameterError,
  ValidationError
} from '@/errors/repositoryErrors';

const FORM_COLLECTION = 'externForms';
const INTERVIEW_SLOT_COLLECTION = 'interviewSlots';

class InterviewRepository implements IInterviewRepository {
  private ensureFirebase() {
    if (!firebaseDb) {
      throw new FirebaseError('Firebase não está configurado');
    }
    return firebaseDb;
  }

  private slotCollectionRef(formId: string) {
    const db = this.ensureFirebase();
    return collection(db, FORM_COLLECTION, formId, INTERVIEW_SLOT_COLLECTION);
  }

  private slotDocRef(formId: string, slotId: string) {
    const db = this.ensureFirebase();
    return doc(db, FORM_COLLECTION, formId, INTERVIEW_SLOT_COLLECTION, slotId);
  }

  private normalizeSlotDoc(
    data: Record<string, unknown>,
    docId: string
  ): InterviewSlot | null {
    const id = ((data.id as string) ?? docId).trim();
    const isoDate = ((data.isoDate as string) ?? '').trim();
    const startTime = ((data.startTime as string) ?? '').trim();
    const endTime = ((data.endTime as string) ?? '').trim();
    const responsibleMemberId = (
      (data.responsibleMemberId as string) ?? ''
    ).trim();
    const responsibleMemberName = (
      (data.responsibleMemberName as string) ?? ''
    ).trim();

    if (
      !id ||
      !isoDate ||
      !startTime ||
      !endTime ||
      !responsibleMemberId ||
      !responsibleMemberName
    ) {
      return null;
    }

    const dateLabel =
      ((data.dateLabel as string) ?? '').trim() ||
      this.formatDateLabel(isoDate);

    const parsedStart = this.parseTimeToMinutes(startTime);
    const parsedEnd = this.parseTimeToMinutes(endTime);
    const startMinutes =
      typeof data.startMinutes === 'number' ? data.startMinutes : parsedStart;
    const endMinutes =
      typeof data.endMinutes === 'number' ? data.endMinutes : parsedEnd;

    if (startMinutes === null || endMinutes === null) return null;

    // Campos de ocupação
    const status =
      (data.status as string) === 'booked' ? 'booked' : 'available';

    return {
      id,
      isoDate,
      dateLabel,
      startTime,
      endTime,
      startMinutes,
      endMinutes,
      responsibleMemberId,
      responsibleMemberName,
      status,
      bookedByCandidateId:
        status === 'booked'
          ? ((data.bookedByCandidateId as string) ?? '')
          : undefined,
      bookedByCandidateName:
        status === 'booked'
          ? ((data.bookedByCandidateName as string) ?? '')
          : undefined,
      bookedAt:
        status === 'booked' ? ((data.bookedAt as string) ?? '') : undefined,
      googleMeetLink: ((data.googleMeetLink as string) ?? '') || undefined
    };
  }

  private formatDateLabel(isoDate: string): string {
    const [year, month, day] = isoDate.split('-').map(Number);
    if (!year || !month || !day) return '';
    return new Intl.DateTimeFormat('pt-BR').format(
      new Date(year, month - 1, day)
    );
  }

  private parseTimeToMinutes(value: string): number | null {
    const matched = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value);
    if (!matched) return null;
    return Number(matched[1]) * 60 + Number(matched[2]);
  }

  async listSlots(formId: string): Promise<InterviewSlot[]> {
    const trimmedFormId = formId.trim();
    if (!trimmedFormId) return [];

    const colRef = this.slotCollectionRef(trimmedFormId);
    const snapshot = await getDocs(colRef);

    return snapshot.docs
      .map((slotDoc) =>
        this.normalizeSlotDoc(
          slotDoc.data() as Record<string, unknown>,
          slotDoc.id
        )
      )
      .filter((slot): slot is InterviewSlot => slot !== null);
  }

  async saveSlot(
    formId: string,
    slot: CreateInterviewSlotInput
  ): Promise<void> {
    const trimmedFormId = formId.trim();
    if (!trimmedFormId) {
      throw new MissingParameterError(['formId']);
    }
    if (!slot.id?.trim()) {
      throw new MissingParameterError(['slot.id']);
    }

    const docRef = this.slotDocRef(trimmedFormId, slot.id);

    await setDoc(
      docRef,
      {
        id: slot.id,
        isoDate: slot.isoDate,
        dateLabel: slot.dateLabel,
        startTime: slot.startTime,
        endTime: slot.endTime,
        startMinutes: slot.startMinutes,
        endMinutes: slot.endMinutes,
        responsibleMemberId: slot.responsibleMemberId,
        responsibleMemberName: slot.responsibleMemberName,
        status: 'available',
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }

  async removeSlot(formId: string, slotId: string): Promise<void> {
    const trimmedFormId = formId.trim();
    const trimmedSlotId = slotId.trim();

    if (!trimmedFormId || !trimmedSlotId) {
      throw new MissingParameterError(['formId', 'slotId']);
    }

    const docRef = this.slotDocRef(trimmedFormId, trimmedSlotId);
    await deleteDoc(docRef);
  }

  async bookSlot(
    formId: string,
    slotId: string,
    candidateId: string,
    candidateName: string
  ): Promise<void> {
    const trimmedFormId = formId.trim();
    const trimmedSlotId = slotId.trim();

    if (!trimmedFormId || !trimmedSlotId || !candidateId) {
      throw new MissingParameterError(['formId', 'slotId', 'candidateId']);
    }

    const docRef = this.slotDocRef(trimmedFormId, trimmedSlotId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new ValidationError('Horário de entrevista não encontrado');
    }

    const data = docSnap.data();
    if (data.status === 'booked') {
      throw new ValidationError('Este horário já está reservado');
    }

    await updateDoc(docRef, {
      status: 'booked',
      bookedByCandidateId: candidateId,
      bookedByCandidateName: candidateName,
      bookedAt: new Date().toISOString(),
      updatedAt: serverTimestamp()
    });
  }

  async getSlotById(
    formId: string,
    slotId: string
  ): Promise<InterviewSlot | null> {
    const trimmedFormId = formId.trim();
    const trimmedSlotId = slotId.trim();

    if (!trimmedFormId || !trimmedSlotId) return null;

    const docRef = this.slotDocRef(trimmedFormId, trimmedSlotId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return this.normalizeSlotDoc(
      docSnap.data() as Record<string, unknown>,
      docSnap.id
    );
  }

  async setGoogleMeetLink(
    formId: string,
    slotId: string,
    googleMeetLink: string
  ): Promise<void> {
    const trimmedFormId = formId.trim();
    const trimmedSlotId = slotId.trim();

    if (!trimmedFormId || !trimmedSlotId) {
      throw new MissingParameterError(['formId', 'slotId']);
    }

    const docRef = this.slotDocRef(trimmedFormId, trimmedSlotId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new ValidationError('Horário de entrevista não encontrado');
    }

    await updateDoc(docRef, {
      googleMeetLink: googleMeetLink.trim(),
      updatedAt: serverTimestamp()
    });
  }

  async releaseSlot(formId: string, slotId: string): Promise<void> {
    const trimmedFormId = formId.trim();
    const trimmedSlotId = slotId.trim();

    if (!trimmedFormId || !trimmedSlotId) {
      throw new MissingParameterError(['formId', 'slotId']);
    }

    const docRef = this.slotDocRef(trimmedFormId, trimmedSlotId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new ValidationError('Horário de entrevista não encontrado');
    }

    await updateDoc(docRef, {
      status: 'available',
      bookedByCandidateId: '',
      bookedByCandidateName: '',
      bookedAt: '',
      updatedAt: serverTimestamp()
    });
  }
}

const interviewRepository = new InterviewRepository();
export default interviewRepository;

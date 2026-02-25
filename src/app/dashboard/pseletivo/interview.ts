'use client';

import { firebaseDb } from '@/lib/firebase/client';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';

const FORM_COLLECTION = 'externForms';
const INTERVIEW_SLOT_COLLECTION = 'interviewSlots';

export type InterviewSlot = {
  id: string;
  isoDate: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  responsibleMemberId: string;
  responsibleMemberName: string;
};

const TIME_FORMAT = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function formatDateLabelFromIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) {
    return '';
  }
  return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day));
}

function ensureFirebase() {
  if (!firebaseDb) {
    throw new Error('Firebase nao configurado.');
  }
  return firebaseDb;
}

function toMinutes(value: string): number | null {
  const matched = TIME_FORMAT.exec(value);
  if (!matched) {
    return null;
  }
  const hours = Number(matched[1]);
  const minutes = Number(matched[2]);
  return hours * 60 + minutes;
}

function normalizeInterviewSlot(
  data: Partial<InterviewSlot>,
  fallbackId: string
): InterviewSlot | null {
  const id = (data.id ?? fallbackId).trim();
  const isoDate = (data.isoDate ?? '').trim();
  const dateLabel =
    (data.dateLabel ?? '').trim() || formatDateLabelFromIsoDate(isoDate);
  const startTime = (data.startTime ?? '').trim();
  const endTime = (data.endTime ?? '').trim();
  const responsibleMemberId = (data.responsibleMemberId ?? '').trim();
  const responsibleMemberName = (data.responsibleMemberName ?? '').trim();

  const parsedStartMinutes = toMinutes(startTime);
  const parsedEndMinutes = toMinutes(endTime);
  const startMinutes =
    typeof data.startMinutes === 'number' ? data.startMinutes : parsedStartMinutes;
  const endMinutes =
    typeof data.endMinutes === 'number' ? data.endMinutes : parsedEndMinutes;

  if (
    !id ||
    !isoDate ||
    !dateLabel ||
    !startTime ||
    !endTime ||
    startMinutes === null ||
    endMinutes === null ||
    !responsibleMemberId ||
    !responsibleMemberName
  ) {
    return null;
  }

  return {
    id,
    isoDate,
    dateLabel,
    startTime,
    endTime,
    startMinutes,
    endMinutes,
    responsibleMemberId,
    responsibleMemberName
  };
}

export function sortInterviewSlots(slots: InterviewSlot[]): InterviewSlot[] {
  return [...slots].sort((left, right) =>
    `${left.isoDate}-${String(left.startMinutes).padStart(4, '0')}-${left.responsibleMemberName}`.localeCompare(
      `${right.isoDate}-${String(right.startMinutes).padStart(4, '0')}-${right.responsibleMemberName}`
    )
  );
}

export async function listInterviewSlots(formId: string): Promise<InterviewSlot[]> {
  const trimmedFormId = formId.trim();
  if (!trimmedFormId) {
    return [];
  }

  const db = ensureFirebase();
  const slotsSnapshot = await getDocs(
    collection(db, FORM_COLLECTION, trimmedFormId, INTERVIEW_SLOT_COLLECTION)
  );

  const slots = slotsSnapshot.docs
    .map((slotDoc) => {
      const data = slotDoc.data() as Partial<InterviewSlot>;
      return normalizeInterviewSlot(data, slotDoc.id);
    })
    .filter((slot): slot is InterviewSlot => slot !== null);

  return sortInterviewSlots(slots);
}

export async function saveInterviewSlot(
  formId: string,
  slot: InterviewSlot
): Promise<void> {
  const trimmedFormId = formId.trim();
  if (!trimmedFormId) {
    throw new Error('ID do formulario e obrigatorio.');
  }

  const normalizedSlot = normalizeInterviewSlot(slot, slot.id);
  if (!normalizedSlot) {
    throw new Error('Horario de entrevista invalido.');
  }

  const db = ensureFirebase();
  await setDoc(
    doc(
      db,
      FORM_COLLECTION,
      trimmedFormId,
      INTERVIEW_SLOT_COLLECTION,
      normalizedSlot.id
    ),
    {
      ...normalizedSlot,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function removeInterviewSlot(
  formId: string,
  slotId: string
): Promise<void> {
  const trimmedFormId = formId.trim();
  const trimmedSlotId = slotId.trim();

  if (!trimmedFormId || !trimmedSlotId) {
    throw new Error('Formulario e horario sao obrigatorios.');
  }

  const db = ensureFirebase();
  await deleteDoc(
    doc(db, FORM_COLLECTION, trimmedFormId, INTERVIEW_SLOT_COLLECTION, trimmedSlotId)
  );
}

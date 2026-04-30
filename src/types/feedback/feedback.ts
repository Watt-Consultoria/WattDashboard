import type { Timestamp } from 'firebase/firestore';

export type FeedbackType =
  | 'Report de erro'
  | 'Sugestão de melhoria'
  | 'Sugestão de feature';

export const FEEDBACK_TYPES: FeedbackType[] = [
  'Report de erro',
  'Sugestão de melhoria',
  'Sugestão de feature'
];

export type FeedbackStatus = 'Aberta' | 'Em andamento' | 'Resolvida';

export const FEEDBACK_STATUSES: FeedbackStatus[] = [
  'Aberta',
  'Em andamento',
  'Resolvida'
];

export type FeedbackMemberDetails = {
  id: string;
  name: string;
};

export type FeedbackMemberSource = {
  id?: string | null;
  name?: string | null;
  role?: string | null;
  sector?: string | null;
} | null;

export type FeedbackFormState = {
  type: FeedbackType;
  title: string;
  detail: string;
};

export type CreateFeedbackInput = FeedbackFormState & {
  member: FeedbackMemberDetails;
};

export type Feedback = CreateFeedbackInput & {
  id: string;
  status: FeedbackStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
